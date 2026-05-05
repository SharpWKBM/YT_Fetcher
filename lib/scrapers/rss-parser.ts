// lib/scrapers/rss-parser.ts
import { parseString } from 'xml2js';
import { RSSFeedData } from './types';

export async function parseChannelRSS(xmlContent: string): Promise<RSSFeedData> {
  return new Promise((resolve, reject) => {
    parseString(xmlContent, (err, result) => {
      if (err) {
        reject(new Error(`Failed to parse XML: ${err.message}`));
        return;
      }

      try {
        const feed = result.feed;
        
        if (!feed) {
          reject(new Error('Invalid RSS feed structure'));
          return;
        }

        const channelId = feed['yt:channelId']?.[0];
        if (!channelId) {
          reject(new Error('Channel ID not found in RSS feed'));
          return;
        }

        const channelTitle = feed.title?.[0] || 'Unknown';
        const entries = feed.entry || [];

        const parsedEntries = entries.map((entry: any) => ({
          title: entry.title?.[0] || '',
          published: entry.published?.[0] || '',
          videoId: entry['yt:videoId']?.[0] || '',
        }));

        resolve({
          channelId,
          channelTitle,
          entries: parsedEntries,
        });
      } catch (error) {
        reject(new Error(`Failed to extract feed data: ${error}`));
      }
    });
  });
}

export async function getChannelLastUpload(channelId: string): Promise<string | null> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetch(rssUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const xmlContent = await response.text();
    const feedData = await parseChannelRSS(xmlContent);

    if (feedData.entries.length === 0) {
      return null;
    }

    // Get the most recent upload date
    const latestEntry = feedData.entries[0];
    const publishedDate = new Date(latestEntry.published);
    
    // Return in YYYY-MM-DD format
    return publishedDate.toISOString().split('T')[0];
  } catch (error) {
    throw new Error(`Failed to get last upload for channel ${channelId}: ${error}`);
  }
}
