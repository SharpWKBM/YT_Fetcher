/**
 * Channel enrichment — fills missing metadata in the `channels` table.
 *
 * 2026-05 rewrite: replaced YouTube Data API v3 (10k units/day, even with 5-key
 * rotation) with the no-API fetcher in lib/youtube/no-api which uses Innertube +
 * HTML + RSS — no key, no quota.
 *
 * Public API kept compatible with the cron + admin endpoints:
 *   - getChannelsNeedingEnrichment(limit)
 *   - enrichChannelBatch(channels)
 *   - getRemainingChannelsCount()
 *   - extractSocialLinks(description)
 */
import { getClient, Channel } from './db';
import { fetchChannelFull, NoApiError, type NoApiChannelFull } from './youtube/no-api';
import { isChannelId } from './youtube/no-api/http';

export interface EnrichmentStats {
  total: number;
  enriched: number;
  failed: number;
  skipped: number;
}

/**
 * Fields we consider "enrichable". A row qualifies for enrichment if ANY of
 * these are NULL/empty. Expanded from the original 4 (language/region/last_upload/thumb)
 * to include social_links, video_count, niche so the backfill covers everything
 * the UI consumes.
 */
const ENRICHABLE_FIELDS = [
  'language',
  'region',
  'last_upload_date',
  'thumbnail_url',
  'social_links',
  'video_count',
  'niche',
] as const;

export interface NeedsEnrichmentOptions {
  /**
   * If set, skip channels that were touched within this many days. The cron
   * job uses 7 to avoid re-fetching the same channel every minute when YouTube
   * doesn't expose certain fields. Ignored when `cooldownHours` is also set.
   */
  cooldownDays?: number;
  /** Finer-grained version of cooldownDays. Wins when both are set. */
  cooldownHours?: number;
  /**
   * Only return rows with id > this. Used by the bulk backfill to walk the
   * table monotonically by primary key, so we never re-process the same row
   * twice in a single run regardless of which fields it still has NULL.
   */
  afterId?: string;
}

/**
 * Fetch up to `limit` channels that are missing at least one enrichable field.
 * Only returns rows with proper UC IDs (skipping malformed handle imports).
 */
export async function getChannelsNeedingEnrichment(
  limit: number = 15,
  opts: NeedsEnrichmentOptions = {},
): Promise<Channel[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error('Invalid limit parameter: must be an integer between 1 and 500');
  }

  const client = getClient();
  const where = ENRICHABLE_FIELDS.map(f => `${f} IS NULL OR ${f} = ''`).join(' OR ');
  // cooldownHours wins over cooldownDays when explicitly set (even to 0).
  // 0 means "ignore cooldown entirely — re-fetch every row".
  let cooldownClause = '';
  if (opts.cooldownHours != null) {
    if (opts.cooldownHours > 0) {
      cooldownClause = ` AND (fetched_at IS NULL OR fetched_at < datetime('now', '-${opts.cooldownHours} hours'))`;
    }
  } else {
    const cooldownDays = opts.cooldownDays ?? 7;
    if (cooldownDays > 0) {
      cooldownClause = ` AND (fetched_at IS NULL OR fetched_at < datetime('now', '-${cooldownDays} days'))`;
    }
  }

  const afterClause = opts.afterId ? ` AND id > ?` : '';
  // Always order by id so paginated walks are deterministic; non-paginated
  // callers (cron) pay a negligible sort cost since LIMIT is small.
  const orderClause = ` ORDER BY id ASC`;
  const args: (string | number)[] = [];
  if (opts.afterId) args.push(opts.afterId);
  args.push(limit);

  const result = await client.execute({
    sql: `
      SELECT * FROM channels
      WHERE id LIKE 'UC%' AND LENGTH(id) = 24
        AND (${where})${cooldownClause}${afterClause}${orderClause}
      LIMIT ?
    `,
    args,
  });

  return result.rows as unknown as Channel[];
}

/**
 * Extract social media links from a channel description using a fixed set of
 * provider patterns. Stored as a JSON-encoded array of strings (or null).
 *
 * Kept exported for backward compatibility with other modules.
 */
export function extractSocialLinks(description: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[\w.]+/gi,
    /(?:https?:\/\/)?(?:www\.)?twitter\.com\/[\w]+/gi,
    /(?:https?:\/\/)?(?:www\.)?x\.com\/[\w]+/gi,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[\w.]+/gi,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.]+/gi,
    /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/[\w]+/gi,
    /(?:https?:\/\/)?(?:www\.)?discord\.gg\/[\w]+/gi,
    /(?:https?:\/\/)?(?:www\.)?patreon\.com\/[\w]+/gi,
    /(?:https?:\/\/)?t\.me\/[\w]+/gi,
    // Match canonical youtube.com handles ("@foo") or /channel/ paths only.
    // Do NOT match /redirect URLs — those are YouTube's external-link wrappers
    // that just bloat the saved JSON with tracking params.
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@[\w.-]+|channel\/UC[\w-]{22})/gi,
  ];
  const links: string[] = [];
  for (const re of patterns) {
    const matches = description.match(re);
    if (matches) links.push(...matches);
  }
  return links.length > 0 ? JSON.stringify(Array.from(new Set(links))) : null;
}

/**
 * Strip YouTube's `/redirect` wrapper to get the underlying URL.
 * Ex: "https://www.youtube.com/redirect?...&q=https%3A%2F%2Fexample.com" -> "https://example.com"
 */
function unwrapYoutubeRedirect(url: string): string {
  if (!url.includes('youtube.com/redirect')) return url;
  try {
    const u = new URL(url);
    const q = u.searchParams.get('q');
    if (q) return decodeURIComponent(q);
  } catch {
    // fall through
  }
  return url;
}

/**
 * Best-effort language detection from text — used when YouTube's metadata
 * doesn't expose `defaultLanguage`. Cheap, no dependencies. Returns ISO-639-1.
 */
export function detectLanguageFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  // Strip URLs and common punctuation noise
  const cleaned = text.replace(/https?:\/\/\S+/g, '').trim();
  if (cleaned.length < 10) return null;

  const counts = {
    cyrillic: (cleaned.match(/[\u0400-\u04FF]/g) ?? []).length,
    arabic: (cleaned.match(/[\u0600-\u06FF]/g) ?? []).length,
    hebrew: (cleaned.match(/[\u0590-\u05FF]/g) ?? []).length,
    chinese: (cleaned.match(/[\u4E00-\u9FFF]/g) ?? []).length,
    japanese: (cleaned.match(/[\u3040-\u30FF]/g) ?? []).length,
    korean: (cleaned.match(/[\uAC00-\uD7AF]/g) ?? []).length,
    devanagari: (cleaned.match(/[\u0900-\u097F]/g) ?? []).length,
    thai: (cleaned.match(/[\u0E00-\u0E7F]/g) ?? []).length,
    latin: (cleaned.match(/[A-Za-z]/g) ?? []).length,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const ratio = (n: number) => n / total;
  if (ratio(counts.cyrillic) > 0.2) return 'ru';
  if (ratio(counts.arabic) > 0.2) return 'ar';
  if (ratio(counts.hebrew) > 0.2) return 'he';
  if (ratio(counts.japanese) > 0.05) return 'ja'; // hiragana/katakana imply JP even with kanji
  if (ratio(counts.korean) > 0.2) return 'ko';
  if (ratio(counts.chinese) > 0.2) return 'zh';
  if (ratio(counts.devanagari) > 0.2) return 'hi';
  if (ratio(counts.thai) > 0.2) return 'th';
  if (ratio(counts.latin) > 0.5) return 'en'; // best-effort — could be es/de/fr too
  return null;
}

/**
 * Enrich a batch of channels using the quota-free pipeline. The legacy
 * `skipResolution` and `retryCount` params are retained for backward compat
 * but ignored (no quota = no rotation needed).
 */
export async function enrichChannelBatch(
  channels: Channel[],
  _skipResolution: boolean = false,
  _retryCount: number = 0,
): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = { total: channels.length, enriched: 0, failed: 0, skipped: 0 };
  if (channels.length === 0) return stats;

  // Filter to only proper UC IDs — handles can't be enriched without a separate
  // resolution step, and they pollute the failure rate. Treat them as skipped.
  const valid = channels.filter(c => isChannelId(c.id));
  stats.skipped = channels.length - valid.length;

  const client = getClient();
  console.log(`[Enrichment] Processing ${valid.length} channels (${stats.skipped} skipped — non-UC IDs)…`);

  // Modest concurrency — Innertube starts rate-limiting hard around ~10 req/s/IP.
  const CONCURRENCY = 4;
  const cursor = { i: 0 };

  async function worker() {
    while (cursor.i < valid.length) {
      const channel = valid[cursor.i++];
      try {
        const data = await fetchChannelFull(channel.id);
        await persistEnriched(client, channel, data);
        stats.enriched++;
        console.log(`[Enrichment] ✓ ${channel.id} (${data.title}) sources=${data.sources.join(',')}`);
      } catch (err) {
        if (err instanceof NoApiError && err.code === 'not-found') {
          console.log(`[Enrichment] ⊘ ${channel.id} not found`);
          stats.failed++;
        } else {
          console.error(`[Enrichment] ✗ ${channel.id}: ${(err as Error).message}`);
          stats.failed++;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return stats;
}

/**
 * Apply the no-api result to the existing `channels` row. Uses COALESCE
 * everywhere so we never overwrite existing non-null values — re-running the
 * job is safe and idempotent.
 */
async function persistEnriched(
  client: ReturnType<typeof getClient>,
  original: Channel,
  data: NoApiChannelFull,
): Promise<void> {
  // Build social_links: prefer the about-tab's clean URLs; augment with anything
  // we find in the description that the about tab didn't surface. Unwrap any
  // youtube.com/redirect wrappers to the actual destination URL.
  const fromAbout = data.links.map(l => unwrapYoutubeRedirect(l.url));
  const fromDescRaw = extractSocialLinks(data.description ?? '');
  const fromDesc: string[] = fromDescRaw ? JSON.parse(fromDescRaw) : [];
  const merged = new Set<string>([
    ...fromAbout.map(u => unwrapYoutubeRedirect(u)),
    ...fromDesc.map(u => unwrapYoutubeRedirect(u)),
  ]);
  // Drop any leftover redirects (unwrap may fail on malformed inputs)
  for (const u of Array.from(merged)) {
    if (u.includes('youtube.com/redirect')) merged.delete(u);
  }
  const socialLinks = merged.size > 0 ? JSON.stringify(Array.from(merged)) : null;

  // Language: prefer existing → derive from description+title+keywords
  const langProbe = [data.title, data.description, data.keywords].filter(Boolean).join(' ');
  const detectedLang = detectLanguageFromText(langProbe);

  await client.execute({
    sql: `
      UPDATE channels SET
        title = COALESCE(NULLIF(?, ''), title),
        subscribers = CASE WHEN ? IS NOT NULL THEN ? ELSE subscribers END,
        language = COALESCE(language, ?),
        region = CASE WHEN ? IS NOT NULL THEN ? ELSE region END,
        last_upload_date = COALESCE(last_upload_date, ?),
        thumbnail_url = COALESCE(NULLIF(thumbnail_url, ''), ?),
        social_links = COALESCE(NULLIF(social_links, ''), ?),
        video_count = COALESCE(video_count, ?),
        fetched_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [
      data.title ?? '',
      data.subscribers,
      data.subscribers,
      detectedLang,
      // Region: overwrite when about-tab returns an ISO-2 country. The pre-fix
      // code wrote literal 'CIS'/'RU' fallbacks for non-Russian channels; we
      // want those stale values replaced with the real country.
      data.country,
      data.country,
      data.lastUploadDate,
      data.avatarUrl,
      socialLinks,
      data.videoCount,
      original.id,
    ],
  });
}

/** How many channels still need at least one enrichable field. */
export async function getRemainingChannelsCount(): Promise<number> {
  const client = getClient();
  const where = ENRICHABLE_FIELDS.map(f => `${f} IS NULL OR ${f} = ''`).join(' OR ');
  const result = await client.execute({
    sql: `SELECT COUNT(*) as count FROM channels WHERE id LIKE 'UC%' AND LENGTH(id) = 24 AND (${where})`,
    args: [],
  });
  return Number(result.rows[0].count);
}

// --- Legacy exports kept for backward compat (no longer used internally) ---

/**
 * @deprecated Was used to resolve handles to UC IDs via YouTube search API.
 * The no-api pipeline only operates on UC IDs and skips handles entirely.
 * Kept exported so old imports don't break the build; will be removed in the next major.
 */
export async function resolveChannelId(_channel: Channel): Promise<string | null> {
  console.warn('[Enrichment] resolveChannelId is deprecated and now a no-op.');
  return null;
}
