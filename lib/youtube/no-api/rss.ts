/**
 * RSS-based fetcher for a YouTube channel's recent uploads.
 *
 * Endpoint: https://www.youtube.com/feeds/videos.xml?channel_id=<UC...>
 *
 * Pros: tiny payload, no auth, almost never rate-limited or blocked, works for handles too
 * (with user= or playlist_id= variants — we use channel_id only here, callers must resolve handles first).
 *
 * Cons: only the latest 15 videos, no subscriber/country/keyword data.
 */
import { parseStringPromise } from 'xml2js';
import type { RecentVideo } from './types';
import { NoApiError } from './types';
import { fetchWithRetry, isChannelId } from './http';

export interface RssResult {
  channelId: string;
  channelTitle: string;
  /** ISO date YYYY-MM-DD of newest entry, or null if feed is empty */
  lastUploadDate: string | null;
  recentVideos: RecentVideo[];
}

export async function fetchChannelRss(channelId: string): Promise<RssResult> {
  if (!isChannelId(channelId)) {
    throw new NoApiError('invalid-id', `Not a UC channel id: ${channelId}`);
  }

  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetchWithRetry(url);

  if (res.status === 404) {
    throw new NoApiError('not-found', `RSS 404 for ${channelId}`, 404);
  }
  if (!res.ok) {
    throw new NoApiError('http', `RSS HTTP ${res.status} for ${channelId}`, res.status);
  }

  const xml = await res.text();
  let parsed: any;
  try {
    parsed = await parseStringPromise(xml, { explicitArray: false, trim: true });
  } catch (e) {
    throw new NoApiError('parse', `RSS parse failed for ${channelId}: ${(e as Error).message}`);
  }

  const feed = parsed?.feed;
  if (!feed) {
    throw new NoApiError('parse', `RSS feed missing for ${channelId}`);
  }

  const channelTitle = feed.title ?? 'Unknown';
  const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];

  const recentVideos: RecentVideo[] = entries
    .map((entry: any): RecentVideo | null => {
      const videoId = entry?.['yt:videoId'];
      const title = entry?.title;
      const publishedAt = entry?.published;
      if (!videoId || !publishedAt) return null;
      const stats = entry?.['media:group']?.['media:community']?.['media:statistics'];
      const rating = entry?.['media:group']?.['media:community']?.['media:starRating'];
      return {
        videoId,
        title: title ?? '',
        publishedAt,
        views: stats?.$?.views ? parseInt(stats.$.views, 10) : undefined,
        rating: rating?.$?.average ? parseFloat(rating.$.average) : undefined,
      };
    })
    .filter((v: RecentVideo | null): v is RecentVideo => v !== null);

  // Sort newest first (RSS is usually already sorted, but be defensive)
  recentVideos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const lastUploadDate = recentVideos[0]?.publishedAt.slice(0, 10) ?? null;

  return { channelId, channelTitle, lastUploadDate, recentVideos };
}
