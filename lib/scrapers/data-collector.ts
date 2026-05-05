// lib/scrapers/data-collector.ts
import { getChannelLastUpload, parseChannelRSS } from './rss-parser';
import { ChannelData } from './types';

const REGION_CODES: Record<string, string> = {
  US: 'US',
  UK: 'GB',
  RU: 'RU',
  ES: 'ES',
  BR: 'BR',
  DE: 'DE',
  FR: 'FR',
  IN: 'IN',
  JP: 'JP',
};

export async function collectChannelData(channelId: string): Promise<ChannelData | null> {
  try {
    // Fetch RSS feed to get channel info and last upload
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetch(rssUrl);

    if (!response.ok) {
      console.error(`Failed to fetch RSS for channel ${channelId}: ${response.status}`);
      return null;
    }

    const xmlContent = await response.text();
    const feedData = await parseChannelRSS(xmlContent);

    // Extract last upload date
    let lastUploadDate: string | null = null;
    if (feedData.entries.length > 0) {
      const latestEntry = feedData.entries[0];
      const publishedDate = new Date(latestEntry.published);
      lastUploadDate = publishedDate.toISOString().split('T')[0];
    }

    return {
      id: channelId,
      title: feedData.channelTitle,
      subscribers: 0, // RSS doesn't provide subscriber count
      language: null,
      region: null,
      lastUploadDate,
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      thumbnailUrl: null,
    };
  } catch (error) {
    console.error(`Error collecting data for channel ${channelId}:`, error);
    return null;
  }
}

export async function searchChannelsByRegion(
  region: string,
  query: string,
  maxResults: number = 10
): Promise<ChannelData[]> {
  try {
    const regionCode = REGION_CODES[region] || 'US';
    
    // Use YouTube search page scraping (simplified for now)
    // In production, this would use Puppeteer or similar
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAg%253D%253D`; // Channel filter
    
    // For now, return empty array as we need Puppeteer for actual scraping
    // This will be implemented in the next phase
    console.log(`Searching for channels in ${regionCode} with query: ${query}`);
    
    return [];
  } catch (error) {
    console.error(`Error searching channels in ${region}:`, error);
    return [];
  }
}
