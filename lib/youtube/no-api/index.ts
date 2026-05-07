/**
 * No-API YouTube fetcher — orchestrator.
 *
 * Combines the three free sources (Innertube → HTML → RSS) to produce a
 * single rich `NoApiChannelFull` record per channel without ever calling
 * the YouTube Data API v3. Designed for bulk backfill.
 *
 * Usage:
 *   import { fetchChannelFull } from '@/lib/youtube/no-api';
 *   const data = await fetchChannelFull('UCq-Fj5jknLsUf-MWSy4_brA');
 *
 * For batches, use `enrichChannelsNoApi` from './enrich.ts'.
 */
import type { NoApiChannelFull, NoApiChannelMetadata, RecentVideo } from './types';
import { NoApiError } from './types';
import { fetchChannelInnertube, fetchChannelAbout } from './innertube';
import { fetchChannelHtml } from './html';
import { fetchChannelRss } from './rss';
import { sleep } from './http';

export type { NoApiChannelFull, NoApiChannelMetadata, RecentVideo };
export { NoApiError };

export interface FetchOptions {
  /** Skip RSS step if you only need profile metadata (faster). */
  skipRss?: boolean;
  /** Skip the HTML fallback (faster on success path; less robust). */
  skipHtmlFallback?: boolean;
  /** Skip the about-tab call (saves ~1 request/channel; loses country + joinedDate + links). */
  skipAbout?: boolean;
}

/**
 * Fetch the full record for a single channel.
 *
 * Tries Innertube first; on `parse`/`http` errors falls back to HTML scraping.
 * RSS is fetched in parallel for last-upload-date + recent videos and merged.
 *
 * Throws `NoApiError('not-found')` if channel doesn't exist anywhere.
 */
export async function fetchChannelFull(channelId: string, opts: FetchOptions = {}): Promise<NoApiChannelFull> {
  const sources: NoApiChannelFull['sources'] = [];

  // Run Innertube/HTML in series (fallback) and RSS + about in parallel.
  // NOTE: as of late-2025 the about tab is loaded via an engagementPanel continuation
  // that requires a separate token; the simple `params=EgVhYm91dPIGBAgEEAI%3D` call
  // returns nothing for most channels. We still try (it works on some legacy layouts)
  // but treat failure as silent — country/joinedDate just stay null.
  const rssPromise = opts.skipRss
    ? Promise.resolve(null)
    : fetchChannelRss(channelId).catch(() => null);
  const aboutPromise = opts.skipAbout
    ? Promise.resolve(null)
    : fetchChannelAbout(channelId).catch(() => null);

  let metadata: NoApiChannelMetadata | null = null;

  try {
    metadata = await fetchChannelInnertube(channelId);
    sources.push('innertube');
  } catch (err) {
    if (err instanceof NoApiError && err.code === 'not-found') throw err;
    if (!opts.skipHtmlFallback) {
      try {
        metadata = await fetchChannelHtml(channelId);
        sources.push('html');
      } catch (htmlErr) {
        // Both profile sources failed — only RSS remains.
        if (htmlErr instanceof NoApiError && htmlErr.code === 'not-found') throw htmlErr;
      }
    }
  }

  const [rss, about] = await Promise.all([rssPromise, aboutPromise]);
  if (rss) sources.push('rss');

  if (!metadata && !rss && !about) {
    throw new NoApiError('http', `All sources failed for ${channelId}`);
  }

  // Build merged result. About-tab data wins for country/joinedDate/viewCount/links;
  // metadata wins for subs/videoCount/avatar/banner.
  const merged: NoApiChannelFull = {
    id: channelId,
    title: metadata?.title ?? rss?.channelTitle ?? null,
    description: about?.description ?? metadata?.description ?? null,
    subscriberCountText: metadata?.subscriberCountText ?? null,
    subscribers: metadata?.subscribers ?? null,
    videoCountText: metadata?.videoCountText ?? null,
    videoCount: metadata?.videoCount ?? null,
    viewCount: about?.viewCount ?? metadata?.viewCount ?? null,
    country: about?.country ?? metadata?.country ?? null,
    keywords: metadata?.keywords ?? null,
    avatarUrl: metadata?.avatarUrl ?? null,
    bannerUrl: metadata?.bannerUrl ?? null,
    handle: metadata?.handle ?? null,
    joinedDate: about?.joinedDate ?? metadata?.joinedDate ?? null,
    recentVideos: rss?.recentVideos ?? [],
    lastUploadDate: rss?.lastUploadDate ?? null,
    links: about?.links ?? [],
    sources,
  };

  return merged;
}

export interface BatchProgress {
  total: number;
  done: number;
  ok: number;
  notFound: number;
  failed: number;
  /** Channel id currently being processed */
  current?: string;
}

export interface BatchResult {
  ok: NoApiChannelFull[];
  notFound: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * Fetch many channels with throttling so we don't trip rate-limits.
 *
 * @param channelIds - list of UC ids
 * @param concurrency - number of parallel in-flight requests (recommended: 3-5)
 * @param delayMs - minimum spacing between requests starting (recommended: 200-500)
 * @param onProgress - called after each channel completes
 */
export async function fetchChannelsBatch(
  channelIds: string[],
  options: { concurrency?: number; delayMs?: number; onProgress?: (p: BatchProgress) => void } = {},
): Promise<BatchResult> {
  const { concurrency = 4, delayMs = 250, onProgress } = options;
  const result: BatchResult = { ok: [], notFound: [], failed: [] };
  let cursor = 0;
  const progress: BatchProgress = { total: channelIds.length, done: 0, ok: 0, notFound: 0, failed: 0 };

  async function worker() {
    while (cursor < channelIds.length) {
      const idx = cursor++;
      const id = channelIds[idx];
      progress.current = id;
      try {
        const data = await fetchChannelFull(id);
        result.ok.push(data);
        progress.ok++;
      } catch (err) {
        if (err instanceof NoApiError && err.code === 'not-found') {
          result.notFound.push(id);
          progress.notFound++;
        } else {
          result.failed.push({ id, error: err instanceof Error ? err.message : String(err) });
          progress.failed++;
        }
      }
      progress.done++;
      onProgress?.(progress);
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return result;
}
