import { google } from 'googleapis';

// API Key rotation system - supports multiple keys for 5x quota
const API_KEYS = [
  process.env.YOUTUBE_API_KEY,
  process.env.YOUTUBE_API_KEY_2,
  process.env.YOUTUBE_API_KEY_3,
  process.env.YOUTUBE_API_KEY_4,
  process.env.YOUTUBE_API_KEY_5,
].filter(Boolean);

let currentKeyIndex = 0;

function getYouTubeClient() {
  const apiKey = API_KEYS[currentKeyIndex % API_KEYS.length];
  return google.youtube({
    version: 'v3',
    auth: apiKey,
  });
}

function rotateApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`[YouTube API] Rotated to key ${currentKeyIndex + 1}/${API_KEYS.length}`);
}

const youtube = getYouTubeClient();

export interface YouTubeChannel {
  id: string;
  title: string;
  subscribers: number;
  language: string | null;
  region: string | null;
  lastUploadDate: string | null;
  channelUrl: string;
  thumbnailUrl: string | null;
}

export async function searchRussianChannels(maxResults: number = 50): Promise<YouTubeChannel[]> {
  try {
    // Simplified search: just find Russian channels, filter later
    const searchQueries = [
      'влог',
      'обзор',
      'игры',
      'летсплей',
      'туториал',
    ];
    const allChannelIds = new Set<string>();

    for (const query of searchQueries) {
      try {
        // Simple search without date restrictions
        const searchResponse = await youtube.search.list({
          part: ['snippet'],
          type: ['video'],
          q: query,
          regionCode: 'RU',
          relevanceLanguage: 'ru',
          maxResults: Math.ceil(maxResults / searchQueries.length),
          order: 'relevance',
        });

        if (searchResponse.data.items) {
          searchResponse.data.items.forEach(item => {
            if (item.snippet?.channelId) {
              allChannelIds.add(item.snippet.channelId);
            }
          });
        }

        // Stop if we have enough channels
        if (allChannelIds.size >= maxResults) break;
      } catch (error: any) {
        // If quota exceeded, rotate to next API key and retry
        if (error?.code === 403 && error?.message?.includes('quota')) {
          console.log(`[YouTube API] Quota exceeded, rotating key...`);
          rotateApiKey();
          // Retry this query with new key
          const retryResponse = await getYouTubeClient().search.list({
            part: ['snippet'],
            type: ['video'],
            q: query,
            regionCode: 'RU',
            relevanceLanguage: 'ru',
            maxResults: Math.ceil(maxResults / searchQueries.length),
            order: 'relevance',
          });

          if (retryResponse.data.items) {
            retryResponse.data.items.forEach(item => {
              if (item.snippet?.channelId) {
                allChannelIds.add(item.snippet.channelId);
              }
            });
          }
        } else {
          throw error;
        }
      }
    }

    const channelIds = Array.from(allChannelIds).slice(0, maxResults);

    // Stage 2: Pre-filter channels by subscriber count (10k-1M)
    console.log(`[YouTube Search] Found ${channelIds.length} unique channels, filtering by subscriber count...`);
    const filteredChannelIds = await filterChannelsBySubscribers(channelIds, 10000, 1000000);
    console.log(`[YouTube Search] ${filteredChannelIds.length} channels in target range (10k-1M subs)`);

    // Stage 3: Get full details (no inactivity filter - let database handle it)
    const channels = await getChannelDetails(filteredChannelIds);
    console.log(`[YouTube Search] Retrieved ${channels.length} channels with full details`);

    return channels;
  } catch (error) {
    console.error('Error searching Russian channels:', error);
    return [];
  }
}

async function filterChannelsBySubscribers(
  channelIds: string[],
  minSubs: number,
  maxSubs: number
): Promise<string[]> {
  if (channelIds.length === 0) return [];

  try {
    const filteredIds: string[] = [];

    // Process in batches of 50 (YouTube API limit)
    for (let i = 0; i < channelIds.length; i += 50) {
      const batch = channelIds.slice(i, i + 50);

      try {
        const response = await getYouTubeClient().channels.list({
          part: ['statistics'],
          id: batch,
        });

        if (response.data.items) {
          response.data.items.forEach(channel => {
            const subCount = parseInt(channel.statistics?.subscriberCount || '0');
            if (subCount >= minSubs && subCount <= maxSubs) {
              filteredIds.push(channel.id!);
            }
          });
        }
      } catch (error: any) {
        // Handle quota exceeded with key rotation
        if (error?.code === 403 && error?.message?.includes('quota')) {
          console.log(`[YouTube API] Quota exceeded on subscriber filter, rotating key...`);
          rotateApiKey();

          // Retry this batch
          const retryResponse = await getYouTubeClient().channels.list({
            part: ['statistics'],
            id: batch,
          });

          if (retryResponse.data.items) {
            retryResponse.data.items.forEach(channel => {
              const subCount = parseInt(channel.statistics?.subscriberCount || '0');
              if (subCount >= minSubs && subCount <= maxSubs) {
                filteredIds.push(channel.id!);
              }
            });
          }
        } else {
          console.error(`Error filtering batch:`, error);
        }
      }
    }

    return filteredIds;
  } catch (error) {
    console.error('Error in filterChannelsBySubscribers:', error);
    return channelIds; // Fallback: return all if filtering fails
  }
}

export async function getChannelDetails(channelIds: string[]): Promise<YouTubeChannel[]> {
  if (channelIds.length === 0) return [];

  try {
    const channelsResponse = await getYouTubeClient().channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: channelIds,
    });

    if (!channelsResponse.data.items) {
      return [];
    }

    const channels: YouTubeChannel[] = [];

    for (const channel of channelsResponse.data.items) {
      const channelId = channel.id!;
      const snippet = channel.snippet!;
      const statistics = channel.statistics!;
      const contentDetails = channel.contentDetails!;

      let lastUploadDate: string | null = null;

      // Get last upload date from uploads playlist
      if (contentDetails.relatedPlaylists?.uploads) {
        const uploadsPlaylistId = contentDetails.relatedPlaylists.uploads;
        try {
          const playlistResponse = await getYouTubeClient().playlistItems.list({
            part: ['snippet'],
            playlistId: uploadsPlaylistId,
            maxResults: 1,
          });

          if (playlistResponse.data.items && playlistResponse.data.items.length > 0) {
            const publishedAt = playlistResponse.data.items[0].snippet?.publishedAt;
            if (publishedAt) {
              lastUploadDate = publishedAt.split('T')[0];
            }
          }
        } catch (error: any) {
          // If quota exceeded, rotate to next API key
          if (error?.code === 403 && error?.message?.includes('quota')) {
            console.log(`[YouTube API] Quota exceeded on playlist fetch, rotating key...`);
            rotateApiKey();
          } else {
            console.error(`Error fetching uploads for channel ${channelId}:`, error);
          }
        }
      }

      channels.push({
        id: channelId,
        title: snippet.title || 'Unknown',
        subscribers: parseInt(statistics.subscriberCount || '0'),
        language: snippet.defaultLanguage || 'ru',
        region: snippet.country || 'CIS',
        lastUploadDate,
        channelUrl: `https://www.youtube.com/channel/${channelId}`,
        thumbnailUrl: snippet.thumbnails?.default?.url || null,
      });
    }

    return channels;
  } catch (error: any) {
    // If quota exceeded on main channels.list call, rotate and retry
    if (error?.code === 403 && error?.message?.includes('quota')) {
      console.log(`[YouTube API] Quota exceeded on channels.list, rotating key and retrying...`);
      rotateApiKey();

      try {
        const retryResponse = await getYouTubeClient().channels.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: channelIds,
        });

        if (!retryResponse.data.items) return [];

        const channels: YouTubeChannel[] = retryResponse.data.items.map(channel => ({
          id: channel.id!,
          title: channel.snippet?.title || 'Unknown',
          subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
          language: channel.snippet?.defaultLanguage || 'ru',
          region: channel.snippet?.country || 'CIS',
          lastUploadDate: null,
          channelUrl: `https://www.youtube.com/channel/${channel.id}`,
          thumbnailUrl: channel.snippet?.thumbnails?.default?.url || null,
        }));

        return channels;
      } catch (retryError) {
        console.error('Error fetching channel details after retry:', retryError);
        return [];
      }
    }

    console.error('Error fetching channel details:', error);
    return [];
  }
}

export async function fetchAndStoreChannels(batchSize: number = 50): Promise<number> {
  const channels = await searchRussianChannels(batchSize);
  return channels.length;
}
