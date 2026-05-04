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
    // Search for Russian-language channels using multiple strategies
    // Strategy: Search for older videos (2015-2020) to find potentially abandoned channels
    const searchQueries = [
      'влог 2015',
      'обзор 2016',
      'игры 2017',
      'музыка 2018',
      'новости 2019',
      'летсплей 2016',
      'распаковка 2017',
      'туториал 2018'
    ];
    const allChannelIds = new Set<string>();

    for (const query of searchQueries) {
      try {
        // Search for videos from 2015-2020 to find channels that were active then
        const searchResponse = await youtube.search.list({
          part: ['snippet'],
          type: ['video'],
          q: query,
          regionCode: 'RU',
          relevanceLanguage: 'ru',
          maxResults: Math.ceil(maxResults / searchQueries.length),
          publishedAfter: '2015-01-01T00:00:00Z',
          publishedBefore: '2020-12-31T23:59:59Z',
          order: 'viewCount',
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
            publishedAfter: '2015-01-01T00:00:00Z',
            publishedBefore: '2020-12-31T23:59:59Z',
            order: 'viewCount',
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
    return await getChannelDetails(channelIds);
  } catch (error) {
    console.error('Error searching Russian channels:', error);
    return [];
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
