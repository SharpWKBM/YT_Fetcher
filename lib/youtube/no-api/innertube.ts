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
 * Fetch the channel's /about tab — the only place Innertube reliably exposes
 * country, joined date, business links, and total view count.
 */
export async function fetchChannelAbout(channelId: string): Promise<ChannelAboutDetails> {
  if (!isChannelId(channelId)) {
    throw new NoApiError('invalid-id', `Not a UC channel id: ${channelId}`);
  }

  const body = JSON.stringify({
    context: {
      client: { hl: 'en', gl: 'US', clientName: 'WEB', clientVersion: CLIENT_VERSION },
    },
    browseId: channelId,
    params: ABOUT_TAB_PARAMS,
  });

  const res = await fetchWithRetry(ENDPOINT, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status === 404) throw new NoApiError('not-found', `About 404 for ${channelId}`, 404);
  if (!res.ok) throw new NoApiError('http', `About HTTP ${res.status} for ${channelId}`, res.status);

  const data = await res.json().catch(() => null);
  if (!data) throw new NoApiError('parse', `About JSON parse failed for ${channelId}`);

  return parseAboutPayload(data);
}

/**
 * The about tab has TWO shapes:
 *   - legacy: tabs[*].tabRenderer.content.sectionListRenderer.contents[*].itemSectionRenderer.contents[*].channelAboutFullMetadataRenderer
 *   - new:    onResponseReceivedEndpoints[*].appendContinuationItemsAction.continuationItems[*].aboutChannelRenderer.metadata.aboutChannelViewModel
 *
 * We probe both and merge.
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
      country,
      joinedDate: joined ? toIsoDate(joined) : null,
      viewCount: parseCount(viewText),
      links,
      description: legacy?.description?.simpleText ?? null,
    };
  }

  // --- New aboutChannelViewModel shape ---
  const about = findFirst(data, (n: any) => n?.aboutChannelViewModel)?.aboutChannelViewModel
    ?? findFirst(data, (n: any) => n?.aboutChannelRenderer)?.aboutChannelRenderer?.metadata?.aboutChannelViewModel;

  if (about) {
    const country = about?.country ?? null;
    const joined = about?.joinedDateText?.content
      ?? about?.joinedDateText?.parts?.map((p: any) => p?.text?.content ?? '').join('')
      ?? null;
    const viewText = about?.viewCountText?.content ?? null;
    const links: Array<{ title: string; url: string }> = (about?.links ?? []).map((wrapper: any) => {
      const link = wrapper?.channelExternalLinkViewModel ?? wrapper;
      return {
        title: link?.title?.content ?? '',
        url: link?.link?.content ?? '',
      };
    }).filter((l: any) => l.url);
    return {
      country: typeof country === 'string' && country.length <= 3 ? country : null,
      joinedDate: joined ? toIsoDate(joined.replace(/^Joined\s+/i, '')) : null,
      viewCount: parseCount(viewText),
      links,
      description: about?.description ?? null,
    };
  }

  return { country: null, joinedDate: null, viewCount: null, links: [], description: null };
}

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

  // Avatar — try multiple paths, pick highest resolution
  const avatarThumbs: any[] =
    meta?.avatar?.thumbnails
    ?? c4?.avatar?.thumbnails
    ?? ph?.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources
    ?? [];
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
