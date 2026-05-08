/**
 * HTML-fallback fetcher: scrapes the channel /about page and extracts the embedded
 * `ytInitialData` JSON. Used when Innertube fails (rate-limit, malformed payload).
 *
 * URL: https://www.youtube.com/channel/<UC...>/about?hl=en
 *
 * The embedded JSON has the same general shape as the Innertube response, so we
 * delegate to parseInnertubePayload after extracting it.
 */
import type { NoApiChannelMetadata } from './types';
import { NoApiError } from './types';
import { fetchWithRetry, isChannelId } from './http';
import { parseInnertubePayload } from './innertube';

export async function fetchChannelHtml(channelId: string): Promise<NoApiChannelMetadata> {
  if (!isChannelId(channelId)) {
    throw new NoApiError('invalid-id', `Not a UC channel id: ${channelId}`);
  }

  const url = `https://www.youtube.com/channel/${channelId}/about?hl=en&persist_hl=1`;
  const res = await fetchWithRetry(url);

  if (res.status === 404) {
    throw new NoApiError('not-found', `HTML 404 for ${channelId}`, 404);
  }
  if (!res.ok) {
    throw new NoApiError('http', `HTML HTTP ${res.status} for ${channelId}`, res.status);
  }

  const html = await res.text();

  // Detect anti-bot challenge pages (consent walls, captchas)
  if (html.includes('consent.youtube.com') || html.includes('captcha-form')) {
    throw new NoApiError('blocked', `Consent/captcha wall hit for ${channelId}`);
  }

  const data = extractYtInitialData(html);
  if (!data) {
    throw new NoApiError('parse', `ytInitialData not found in HTML for ${channelId}`);
  }

  return parseInnertubePayload(channelId, data);
}

/**
 * The page contains either:
 *   var ytInitialData = {...};
 * or:
 *   window["ytInitialData"] = {...};
 * Followed by `;</script>`. We grab whichever appears first.
 */
export function extractYtInitialData(html: string): unknown | null {
  const patterns = [
    /var ytInitialData = (\{.*?\});\s*<\/script>/s,
    /window\["ytInitialData"\]\s*=\s*(\{.*?\});\s*<\/script>/s,
    /ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {
        // try next pattern
      }
    }
  }
  return null;
}
