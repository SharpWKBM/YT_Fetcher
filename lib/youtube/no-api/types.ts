/**
 * Quota-free YouTube fetcher — shared types.
 *
 * Three sources, in fallback order:
 *   1. Innertube /youtubei/v1/browse — richest payload (subs, country, keywords, avatar, banner).
 *   2. Channel /about HTML page with embedded ytInitialData — works when Innertube is rate-limited.
 *   3. RSS feed /feeds/videos.xml — tiny, almost never blocked; gives last upload + recent videos.
 */

export interface NoApiChannelMetadata {
  /** UC... channel id */
  id: string;
  title: string | null;
  description: string | null;
  /** Raw subscriber count text from YouTube ("1.2M subscribers") */
  subscriberCountText: string | null;
  /** Parsed subscriber count, or null when unparseable / hidden */
  subscribers: number | null;
  /** Raw video count text */
  videoCountText: string | null;
  videoCount: number | null;
  /** Total view count (from header), if present */
  viewCount: number | null;
  /** ISO-2 country code from channel metadata, if present */
  country: string | null;
  /** Comma- or space-separated keyword list as exposed by YouTube */
  keywords: string | null;
  /** Best avatar URL (largest available) */
  avatarUrl: string | null;
  /** Banner URL if present */
  bannerUrl: string | null;
  /** Custom URL handle, e.g. "@pewdiepie" */
  handle: string | null;
  /** ISO date string YYYY-MM-DD when channel joined YouTube */
  joinedDate: string | null;
}

export interface RecentVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  /** RSS-only: views / star rating if present */
  views?: number;
  rating?: number;
}

export interface NoApiChannelFull extends NoApiChannelMetadata {
  /** Up to N most recent videos, newest first. From RSS (free, fast). */
  recentVideos: RecentVideo[];
  /** ISO date of latest upload (YYYY-MM-DD), or null */
  lastUploadDate: string | null;
  /** External links the creator added (twitter, instagram, website, etc.). From about tab. */
  links: Array<{ title: string; url: string }>;
  /** Sources that contributed data, in order */
  sources: Array<'innertube' | 'html' | 'rss'>;
}

export class NoApiError extends Error {
  constructor(public readonly code: 'http' | 'parse' | 'blocked' | 'not-found' | 'invalid-id', message: string, public readonly status?: number) {
    super(message);
    this.name = 'NoApiError';
  }
}
