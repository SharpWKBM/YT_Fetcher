import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

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
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      type: ['channel'],
      regionCode: 'RU',
      relevanceLanguage: 'ru',
      maxResults,
      order: 'viewCount',
    });

    if (!searchResponse.data.items) {
      return [];
    }

    const channelIds = searchResponse.data.items
      .map(item => item.id?.channelId)
      .filter(Boolean) as string[];

    return await getChannelDetails(channelIds);
  } catch (error) {
    console.error('Error searching Russian channels:', error);
    return [];
  }
}

export async function getChannelDetails(channelIds: string[]): Promise<YouTubeChannel[]> {
  if (channelIds.length === 0) return [];

  try {
    const channelsResponse = await youtube.channels.list({
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
          const playlistResponse = await youtube.playlistItems.list({
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
        } catch (error) {
          console.error(`Error fetching uploads for channel ${channelId}:`, error);
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
  } catch (error) {
    console.error('Error fetching channel details:', error);
    return [];
  }
}

export async function fetchAndStoreChannels(batchSize: number = 50): Promise<number> {
  const channels = await searchRussianChannels(batchSize);
  return channels.length;
}
