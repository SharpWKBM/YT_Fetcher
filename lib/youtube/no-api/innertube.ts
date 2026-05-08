/**
 * Innertube-based fetcher: hits the same private JSON API the youtube.com web app uses.
 *
 * Endpoint: POST https://www.youtube.com/youtubei/v1/browse
 * Body: { context: { client: {...} }, browseId: <UC...> }
 *
 * No auth, no API key, no quota. The clientVersion below is a public, stable WEB
 * client value; if YouTube rotates it we'll see 400s and need to bump it.
 */
import type { NoApiChannelMetadata } from './types';
import { NoApiError } from './types';
import { fetchWithRetry, isChannelId, parseCount } from './http';

const CLIENT_VERSION = '2.20250115.00.00';
const ENDPOINT = 'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false';

/** Params for the channel /about tab. URL-decoded, this is a tiny protobuf selecting the tab. */
const ABOUT_TAB_PARAMS = 'EgVhYm91dPIGBAgEEAI%3D';

/** Country, joined date, business email, channel links — only available on the about tab. */
export interface ChannelAboutDetails {
  country: string | null;
  joinedDate: string | null;
  viewCount: number | null;
  /** Channel-level URLs the creator has linked (twitter, instagram, website, etc.) */
  links: Array<{ title: string; url: string }>;
  description: string | null;
}

/**
 * Fetch the channel's /about tab.
 *
 * As of late-2025 the data lives in `aboutChannelViewModel`, which is loaded
 * lazily via an engagementPanel continuation when you call /youtubei/v1/browse
 * with no params. The simple `params=EgVhYm91dPIGBAgEEAI%3D` call returns
 * nothing for most channels.
 *
 * BUT — if you fetch the channel `/about` HTML page directly, the embedded
 * `ytInitialData` already contains the populated viewModel under
 * `onResponseReceivedEndpoints[*].showEngagementPanelEndpoint.engagementPanel...
 * .aboutChannelRenderer.metadata.aboutChannelViewModel`. So we scrape that.
 */
export async function fetchChannelAbout(channelId: string): Promise<ChannelAboutDetails> {
  if (!isChannelId(channelId)) {
    throw new NoApiError('invalid-id', `Not a UC channel id: ${channelId}`);
  }

  const url = `https://www.youtube.com/channel/${channelId}/about?hl=en&persist_hl=1`;
  const res = await fetchWithRetry(url);

  if (res.status === 404) throw new NoApiError('not-found', `About 404 for ${channelId}`, 404);
  if (!res.ok) throw new NoApiError('http', `About HTTP ${res.status} for ${channelId}`, res.status);

  const html = await res.text();
  if (html.includes('consent.youtube.com') || html.includes('captcha-form')) {
    throw new NoApiError('blocked', `Consent/captcha wall for ${channelId}`);
  }

  // Extract ytInitialData. Patterns ordered by frequency.
  const patterns = [
    /var ytInitialData = (\{.*?\});\s*<\/script>/s,
    /window\["ytInitialData"\]\s*=\s*(\{.*?\});\s*<\/script>/s,
    /ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s,
  ];
  let data: unknown = null;
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      try {
        data = JSON.parse(m[1]);
        break;
      } catch {
        // try next
      }
    }
  }
  if (!data) throw new NoApiError('parse', `ytInitialData not found for ${channelId}`);

  return parseAboutPayload(data);
}

/**
 * The about tab has multiple shapes across YouTube layouts:
 *   - legacy:  channelAboutFullMetadataRenderer (rare in 2025)
 *   - current: aboutChannelViewModel (raw text fields like `country: "India"`)
 *   - either embedded in `ytInitialData.onResponseReceivedEndpoints` (HTML page)
 *     or in the engagementPanels array (Innertube continuation)
 *
 * We probe both and merge. Country comes back as a localized name (e.g. "India",
 * "United Kingdom") so we map it to ISO-2 for consistency with the rest of the
 * `region` filter.
 *
 * Exported for testing.
 */
export function parseAboutPayload(data: any): ChannelAboutDetails {
  // --- Legacy shape ---
  const legacy = findFirst(data, (n: any) => n?.channelAboutFullMetadataRenderer)?.channelAboutFullMetadataRenderer;
  if (legacy) {
    const country = legacy?.country?.simpleText ?? null;
    const joined = legacy?.joinedDateText?.runs?.[1]?.text ?? null;
    const viewText = legacy?.viewCountText?.simpleText ?? null;
    const links: Array<{ title: string; url: string }> = (legacy?.primaryLinks ?? []).map((l: any) => ({
      title: l?.title?.simpleText ?? '',
      url: l?.navigationEndpoint?.urlEndpoint?.url ?? l?.endpoint?.urlEndpoint?.url ?? '',
    })).filter((l: any) => l.url);
    return {
      country: countryToIso2(country),
      joinedDate: joined ? toIsoDate(joined) : null,
      viewCount: parseCount(viewText),
      links,
      description: legacy?.description?.simpleText ?? null,
    };
  }

  // --- Current aboutChannelViewModel shape ---
  const about = findFirst(data, (n: any) => n?.aboutChannelViewModel)?.aboutChannelViewModel
    ?? findFirst(data, (n: any) => n?.aboutChannelRenderer)?.aboutChannelRenderer?.metadata?.aboutChannelViewModel;

  if (about) {
    const country = about?.country ?? null;
    const joined = textOf(about?.joinedDateText);
    const viewText = textOf(about?.viewCountText);
    const links: Array<{ title: string; url: string }> = (about?.links ?? []).map((wrapper: any) => {
      const link = wrapper?.channelExternalLinkViewModel ?? wrapper;
      const url: string =
        link?.link?.commandRuns?.[0]?.onTap?.innertubeCommand?.urlEndpoint?.url
        ?? link?.link?.content
        ?? '';
      return {
        title: link?.title?.content ?? '',
        url,
      };
    }).filter((l: any) => l.url);
    return {
      country: countryToIso2(country),
      joinedDate: joined ? toIsoDate(joined.replace(/^Joined\s+/i, '')) : null,
      viewCount: parseCount(viewText),
      links,
      description: textOf(about?.description),
    };
  }

  return { country: null, joinedDate: null, viewCount: null, links: [], description: null };
}

/**
 * Extract a string from any of YouTube's text shapes: a plain string, an
 * object with `content`, an object with `simpleText`, or a `runs[]` array.
 */
function textOf(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === 'string') return node;
  if (typeof node === 'object') {
    const n = node as any;
    if (typeof n.content === 'string') return n.content;
    if (typeof n.simpleText === 'string') return n.simpleText;
    if (Array.isArray(n.runs)) return n.runs.map((r: any) => r?.text ?? '').join('');
    if (Array.isArray(n.parts)) return n.parts.map((p: any) => p?.text?.content ?? '').join('');
  }
  return null;
}

/**
 * Map YouTube's localized country names ("India", "United Kingdom") to ISO-2
 * codes ("IN", "GB"). Falls back to null for things we don't recognize so the
 * region filter doesn't get polluted with arbitrary strings. The list covers
 * the top ~80 countries we expect to see; everything else stays null.
 */
function countryToIso2(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string') return null;
  // Already an ISO-2 code (some shapes return it that way)
  if (/^[A-Z]{2}$/.test(name)) return name;
  const key = name.trim().toLowerCase();
  return COUNTRY_NAME_TO_ISO2[key] ?? null;
}

/* eslint-disable prettier/prettier */
const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'u.s.': 'US', 'united states of america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
  'india': 'IN', 'canada': 'CA', 'australia': 'AU', 'germany': 'DE', 'france': 'FR',
  'japan': 'JP', 'south korea': 'KR', 'korea': 'KR', 'china': 'CN', 'hong kong': 'HK',
  'taiwan': 'TW', 'singapore': 'SG', 'malaysia': 'MY', 'indonesia': 'ID', 'philippines': 'PH',
  'thailand': 'TH', 'vietnam': 'VN', 'russia': 'RU', 'russian federation': 'RU',
  'ukraine': 'UA', 'belarus': 'BY', 'kazakhstan': 'KZ', 'poland': 'PL', 'czech republic': 'CZ',
  'czechia': 'CZ', 'slovakia': 'SK', 'hungary': 'HU', 'romania': 'RO', 'bulgaria': 'BG',
  'greece': 'GR', 'turkey': 'TR', 'türkiye': 'TR', 'italy': 'IT', 'spain': 'ES', 'portugal': 'PT',
  'netherlands': 'NL', 'belgium': 'BE', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK',
  'finland': 'FI', 'iceland': 'IS', 'ireland': 'IE', 'switzerland': 'CH', 'austria': 'AT',
  'mexico': 'MX', 'brazil': 'BR', 'argentina': 'AR', 'chile': 'CL', 'colombia': 'CO',
  'peru': 'PE', 'venezuela': 'VE', 'ecuador': 'EC', 'uruguay': 'UY', 'paraguay': 'PY',
  'bolivia': 'BO', 'cuba': 'CU', 'dominican republic': 'DO', 'puerto rico': 'PR',
  'south africa': 'ZA', 'nigeria': 'NG', 'kenya': 'KE', 'egypt': 'EG', 'morocco': 'MA',
  'algeria': 'DZ', 'tunisia': 'TN', 'ghana': 'GH', 'ethiopia': 'ET', 'tanzania': 'TZ',
  'uganda': 'UG', 'cameroon': 'CM', 'ivory coast': 'CI', 'cote d\u2019ivoire': 'CI',
  'saudi arabia': 'SA', 'united arab emirates': 'AE', 'uae': 'AE', 'qatar': 'QA',
  'kuwait': 'KW', 'bahrain': 'BH', 'oman': 'OM', 'jordan': 'JO', 'lebanon': 'LB',
  'iran': 'IR', 'iraq': 'IQ', 'pakistan': 'PK', 'bangladesh': 'BD', 'sri lanka': 'LK',
  'nepal': 'NP', 'afghanistan': 'AF', 'myanmar': 'MM', 'cambodia': 'KH', 'laos': 'LA',
  'israel': 'IL', 'new zealand': 'NZ',
};
/* eslint-enable prettier/prettier */

/** Walk an arbitrary JSON tree, return the first node where `pred` returns truthy. */
function findFirst(root: any, pred: (n: any) => any, maxDepth: number = 12): any {
  const stack: Array<{ n: any; d: number }> = [{ n: root, d: 0 }];
  while (stack.length) {
    const { n, d } = stack.pop()!;
    if (n == null || d > maxDepth) continue;
    if (typeof n === 'object') {
      if (pred(n)) return n;
      for (const k in n) stack.push({ n: n[k], d: d + 1 });
    }
  }
  return null;
}

/** "Aug 19, 2010" / "19 Aug 2010" / "Joined Aug 19, 2010" → "2010-08-19", best-effort. */
function toIsoDate(s: string): string | null {
  const t = Date.parse(s);
  if (isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

export async function fetchChannelInnertube(channelId: string): Promise<NoApiChannelMetadata> {
  if (!isChannelId(channelId)) {
    throw new NoApiError('invalid-id', `Not a UC channel id: ${channelId}`);
  }

  const body = JSON.stringify({
    context: {
      client: {
        hl: 'en',
        gl: 'US',
        clientName: 'WEB',
        clientVersion: CLIENT_VERSION,
        utcOffsetMinutes: 0,
      },
    },
    browseId: channelId,
  });

  const res = await fetchWithRetry(ENDPOINT, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status === 404) {
    throw new NoApiError('not-found', `Innertube 404 for ${channelId}`, 404);
  }
  if (!res.ok) {
    throw new NoApiError('http', `Innertube HTTP ${res.status} for ${channelId}`, res.status);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (e) {
    throw new NoApiError('parse', `Innertube JSON parse failed for ${channelId}: ${(e as Error).message}`);
  }

  return parseInnertubePayload(channelId, data);
}

/**
 * Parse the heavily nested Innertube `/browse` response. The shape varies between
 * the legacy `c4TabbedHeaderRenderer` and newer `pageHeaderRenderer` so we probe both.
 *
 * Exported for testing with recorded fixtures.
 */
export function parseInnertubePayload(channelId: string, data: any): NoApiChannelMetadata {
  if (!data?.metadata && !data?.header) {
    throw new NoApiError('parse', `Innertube payload missing metadata/header for ${channelId}`);
  }

  const meta = data?.metadata?.channelMetadataRenderer ?? {};
  const microformat = data?.microformat?.microformatDataRenderer ?? {};

  // Two header shapes — old and new
  const c4 = data?.header?.c4TabbedHeaderRenderer;
  const ph = data?.header?.pageHeaderRenderer;

  // Subscriber count text — old shape first, then new view-model traversal
  const subText: string | null =
    c4?.subscriberCountText?.simpleText
    ?? c4?.subscriberCountText?.runs?.map((r: any) => r.text).join('')
    ?? extractStatPart(ph, /subscriber/i)
    ?? null;

  const videoCountText: string | null =
    c4?.videosCountText?.runs?.map((r: any) => r.text).join('')
    ?? c4?.videosCountText?.simpleText
    ?? extractStatPart(ph, /video/i)
    ?? null;

  // Avatar — combine every source we know about and pick the highest resolution
  // overall. Different shapes may carry different sizes (e.g. metadata only has
  // a tiny 88px square while c4 carries an 800px one).
  const avatarThumbs: any[] = [
    ...(meta?.avatar?.thumbnails ?? []),
    ...(c4?.avatar?.thumbnails ?? []),
    ...(ph?.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image
      ?.sources ?? []),
  ];
  const avatarUrl = pickLargestThumbnail(avatarThumbs);

  // Banner
  const bannerThumbs: any[] =
    c4?.banner?.thumbnails
    ?? ph?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources
    ?? [];
  const bannerUrl = pickLargestThumbnail(bannerThumbs);

  // Country / handle / joined date — usually only available via the about tab
  // but channel metadata sometimes carries country.
  const country: string | null = meta?.country ?? null;

  // Joined date (channel creation): microformat.publishDate is reliable
  const joinedDate: string | null = microformat?.publishDate ?? meta?.publishDate ?? null;

  // Custom URL / handle
  const handle: string | null =
    meta?.vanityChannelUrl?.match(/@[\w.-]+/)?.[0]
    ?? c4?.channelHandleText?.runs?.[0]?.text
    ?? null;

  // Total channel views — sometimes exposed
  const viewCountText: string | null =
    c4?.viewCountText?.simpleText
    ?? extractStatPart(ph, /view/i)
    ?? null;

  return {
    id: channelId,
    title: meta?.title ?? c4?.title ?? null,
    description: meta?.description ?? null,
    subscriberCountText: subText,
    subscribers: parseCount(subText),
    videoCountText,
    videoCount: parseCount(videoCountText),
    viewCount: parseCount(viewCountText) ?? null,
    country,
    keywords: typeof meta?.keywords === 'string' ? meta.keywords : null,
    avatarUrl,
    bannerUrl,
    handle,
    joinedDate: joinedDate ? joinedDate.slice(0, 10) : null,
  };
}

function pickLargestThumbnail(thumbs: any[] | undefined): string | null {
  if (!thumbs || thumbs.length === 0) return null;
  // Each thumbnail has { url, width, height } — pick max width
  let best = thumbs[0];
  for (const t of thumbs) {
    if ((t?.width ?? 0) > (best?.width ?? 0)) best = t;
  }
  return best?.url ?? null;
}

/**
 * The new pageHeaderRenderer wraps stats in a deeply-nested viewModel:
 * pageHeaderViewModel.metadata.contentMetadataViewModel.metadataRows[].metadataParts[].text.content
 *
 * Each `metadataPart` carries one stat ("311M subscribers", "26K videos", "5.4B views").
 * We walk every part and return the first whose content matches the predicate.
 */
function extractStatPart(ph: any, label: RegExp): string | null {
  const rows: any[] | undefined =
    ph?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
  if (!rows) return null;
  for (const row of rows) {
    const parts: any[] = row?.metadataParts ?? [];
    for (const part of parts) {
      const text: string | undefined = part?.text?.content;
      if (typeof text === 'string' && label.test(text)) return text.trim();
    }
  }
  return null;
}
