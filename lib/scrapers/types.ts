// lib/scrapers/types.ts
export interface ChannelData {
  id: string;
  title: string;
  subscribers: number;
  language: string | null;
  region: string | null;
  lastUploadDate: string | null;
  channelUrl: string;
  thumbnailUrl: string | null;
}

export interface RSSFeedEntry {
  title: string;
  published: string;
  videoId: string;
}

export interface RSSFeedData {
  channelId: string;
  channelTitle: string;
  entries: RSSFeedEntry[];
}
