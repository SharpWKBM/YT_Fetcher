import { SEARCH_CONFIG, SearchQuery } from './search-config';
import { getYouTubeClient, rotateApiKey } from '../youtube';

interface SearchFilters {
  minSubscribers: number;
  maxSubscribers: number;
  inactiveMonths: number;
}

interface YouTubeChannel {
  id: string;
  title: string;
  subscribers: number;
  language: string;
  region: string;
  lastUploadDate: string | null;
  channelUrl: string;
  thumbnailUrl: string;
  socialLinks?: string;
  videoCount?: number;
  avgViews?: number;
  engagementRate?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function discoverChannelsMultiQuery(
  filters: SearchFilters,
  maxChannels: number = 1000
): Promise<YouTubeChannel[]> {
  const discoveredChannels = new Set<string>();
  const allChannels: YouTubeChannel[] = [];

  const inactiveDate = new Date();
  inactiveDate.setMonth(inactiveDate.getMonth() - filters.inactiveMonths);
  const publishedBefore = inactiveDate.toISOString();

  const queries = generateSearchQueries(publishedBefore);

  console.log(`[Multi-Query Search] Generated ${queries.length} search queries`);
  console.log(`[Multi-Query Search] Target: ${maxChannels} channels`);
  console.log(`[Multi-Query Search] Filters: ${filters.minSubscribers}-${filters.maxSubscribers} subs, ${filters.inactiveMonths}+ months inactive`);

  for (const query of queries) {
    if (discoveredChannels.size >= maxChannels) {
      console.log(`[Multi-Query Search] Reached target of ${maxChannels} channels`);
      break;
    }

    try {
      const channelIds = await executeSearch(query);

      if (channelIds.length === 0) {
        continue;
      }

      const filteredIds = await filterBySubscribers(
        channelIds,
        filters.minSubscribers,
        filters.maxSubscribers
      );

      if (filteredIds.length === 0) {
        continue;
      }

      const channels = await getChannelDetails(filteredIds);

      const inactiveChannels = channels.filter(ch => {
        if (!ch.lastUploadDate) return false;
        const lastUpload = new Date(ch.lastUploadDate);
        return lastUpload < inactiveDate;
      });

      for (const channel of inactiveChannels) {
        if (!discoveredChannels.has(channel.id)) {
          discoveredChannels.add(channel.id);
          allChannels.push(channel);

          if (discoveredChannels.size >= maxChannels) {
            break;
          }
        }
      }

      console.log(`[Multi-Query Search] Progress: ${discoveredChannels.size}/${maxChannels} channels`);

      await sleep(100);

    } catch (error: any) {
      if (error?.code === 403 && error?.message?.includes('quota')) {
        console.log('[Multi-Query Search] Quota exceeded, rotating key...');
        rotateApiKey();
      } else {
        console.error('[Multi-Query Search] Error:', error);
      }
    }
  }

  console.log(`[Multi-Query Search] Discovered ${allChannels.length} unique channels`);
  return allChannels;
}

function generateSearchQueries(publishedBefore: string): SearchQuery[] {
  const queries: SearchQuery[] = [];

  const priorityCategories = ['Gaming', 'Tech & Science', 'Education', 'Vlog'];
  const priorityLanguages = ['en', 'ru', 'es', 'pt', 'de', 'fr', 'ja'];
  const priorityRegions = ['US', 'RU', 'BR', 'IN', 'GB', 'DE', 'JP'];

  for (const category of priorityCategories) {
    const keywords = SEARCH_CONFIG.keywords[category] || [];

    for (const language of priorityLanguages) {
      for (const region of priorityRegions) {
        for (const keyword of keywords.slice(0, 5)) {
          queries.push({
            q: keyword,
            type: 'channel',
            regionCode: region,
            relevanceLanguage: language,
            publishedBefore,
            order: 'viewCount',
            maxResults: 50
          });
        }
      }
    }
  }

  return queries;
}

async function executeSearch(query: SearchQuery): Promise<string[]> {
  const youtube = getYouTubeClient();
  const channelIds: string[] = [];

  try {
    // Search for channels directly instead of videos
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      type: ['channel'],
      q: query.q,
      regionCode: query.regionCode,
      relevanceLanguage: query.relevanceLanguage,
      order: 'videoCount', // Channels with more videos
      maxResults: query.maxResults,
    });

    if (searchResponse.data.items) {
      searchResponse.data.items.forEach(item => {
        if (item.snippet?.channelId) {
          channelIds.push(item.snippet.channelId);
        }
      });
    }
  } catch (error: any) {
    if (error?.code === 403 && error?.message?.includes('quota')) {
      throw error;
    }
    console.error('[executeSearch] Error:', error);
  }

  return [...new Set(channelIds)];
}

async function filterBySubscribers(
  channelIds: string[],
  minSubscribers: number,
  maxSubscribers: number
): Promise<string[]> {
  if (channelIds.length === 0) return [];

  const youtube = getYouTubeClient();
  const filtered: string[] = [];

  const batchSize = 50;
  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);

    try {
      const channelsResponse = await youtube.channels.list({
        part: ['statistics'],
        id: batch,
      });

      if (channelsResponse.data.items) {
        channelsResponse.data.items.forEach(item => {
          const subscriberCount = parseInt(item.statistics?.subscriberCount || '0');
          if (subscriberCount >= minSubscribers && subscriberCount <= maxSubscribers) {
            filtered.push(item.id!);
          }
        });
      }
    } catch (error: any) {
      if (error?.code === 403 && error?.message?.includes('quota')) {
        throw error;
      }
      console.error('[filterBySubscribers] Error:', error);
    }
  }

  return filtered;
}

async function getChannelDetails(channelIds: string[]): Promise<YouTubeChannel[]> {
  if (channelIds.length === 0) return [];

  const youtube = getYouTubeClient();
  const channels: YouTubeChannel[] = [];

  const batchSize = 50;
  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);

    try {
      const channelsResponse = await youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: batch,
      });

      if (channelsResponse.data.items) {
        for (const item of channelsResponse.data.items) {
          const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
          let lastUploadDate: string | null = null;

          if (uploadsPlaylistId) {
            try {
              const playlistResponse = await youtube.playlistItems.list({
                part: ['contentDetails'],
                playlistId: uploadsPlaylistId,
                maxResults: 1,
              });

              if (playlistResponse.data.items && playlistResponse.data.items.length > 0) {
                lastUploadDate = playlistResponse.data.items[0].contentDetails?.videoPublishedAt || null;
              }
            } catch (error) {
              console.error(`[getChannelDetails] Failed to get last upload for ${item.id}:`, error);
            }
          }

          // Extract social links from description
          const description = item.snippet?.description || '';
          const socialLinks = extractSocialLinks(description);

          channels.push({
            id: item.id!,
            title: item.snippet?.title || 'Unknown',
            subscribers: parseInt(item.statistics?.subscriberCount || '0'),
            language: item.snippet?.defaultLanguage || item.snippet?.country || 'unknown',
            region: item.snippet?.country || 'unknown',
            lastUploadDate,
            channelUrl: `https://www.youtube.com/channel/${item.id}`,
            thumbnailUrl: item.snippet?.thumbnails?.default?.url || '',
            socialLinks: socialLinks.length > 0 ? JSON.stringify(socialLinks) : undefined,
            videoCount: parseInt(item.statistics?.videoCount || '0'),
            avgViews: undefined,
            engagementRate: undefined,
          });
        }
      }
    } catch (error: any) {
      if (error?.code === 403 && error?.message?.includes('quota')) {
        throw error;
      }
      console.error('[getChannelDetails] Error:', error);
    }
  }

  return channels;
}

function extractSocialLinks(description: string): Array<{ platform: string; url: string }> {
  const links: Array<{ platform: string; url: string }> = [];

  const patterns = {
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/gi,
    twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/gi,
    facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9.]+)/gi,
    tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?([a-zA-Z0-9._]+)/gi,
    discord: /(?:https?:\/\/)?(?:www\.)?discord\.gg\/([a-zA-Z0-9]+)/gi,
    twitch: /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)/gi,
    telegram: /(?:https?:\/\/)?(?:www\.)?t\.me\/([a-zA-Z0-9_]+)/gi,
    linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)/gi,
    website: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi,
  };

  for (const [platform, pattern] of Object.entries(patterns)) {
    const matches = description.matchAll(pattern);
    for (const match of matches) {
      const url = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;

      // Skip YouTube links
      if (url.includes('youtube.com') || url.includes('youtu.be')) continue;

      // Avoid duplicates
      if (!links.find(link => link.url === url)) {
        links.push({ platform, url });
      }
    }
  }

  return links;
}
