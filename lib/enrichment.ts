import { getClient, Channel } from './db';
import { getYouTubeClient, rotateApiKey } from './youtube';

export interface EnrichmentStats {
  total: number;
  enriched: number;
  failed: number;
  skipped: number;
}

/**
 * Fetch channels that are missing critical metadata
 */
export async function getChannelsNeedingEnrichment(limit: number = 15): Promise<Channel[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Invalid limit parameter: must be an integer between 1 and 100');
  }

  const client = getClient();

  const result = await client.execute({
    sql: `
      SELECT * FROM channels
      WHERE (
        language IS NULL OR
        region IS NULL OR
        last_upload_date IS NULL OR
        thumbnail_url IS NULL
      )
      LIMIT ?
    `,
    args: [limit],
  });

  return result.rows as unknown as Channel[];
}

/**
 * Resolve channel handle/username to actual channel ID
 * Only call this for channels that don't have proper IDs (don't start with UC)
 */
export async function resolveChannelId(channel: Channel): Promise<string | null> {
  const youtubeClient = getYouTubeClient();

  // If it already looks like a proper channel ID (starts with UC), return it
  if (channel.id.startsWith('UC')) {
    return channel.id;
  }

  // Try to resolve from the channel URL
  try {
    // Extract handle from URL like https://www.youtube.com/@username
    const handleMatch = channel.channel_url.match(/\/@([^/?]+)/);
    if (handleMatch) {
      const handle = handleMatch[1];

      // Use YouTube API to search for the channel by handle
      const searchResponse = await youtubeClient.search.list({
        part: ['snippet'],
        q: handle,
        type: ['channel'],
        maxResults: 1,
      });

      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        const actualChannelId = searchResponse.data.items[0].snippet?.channelId;
        if (actualChannelId) {
          console.log(`[Resolve] ${channel.id} -> ${actualChannelId}`);
          return actualChannelId;
        }
      }
    }

    // Fallback: try searching by channel title
    const searchResponse = await youtubeClient.search.list({
      part: ['snippet'],
      q: channel.title,
      type: ['channel'],
      maxResults: 1,
    });

    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      const actualChannelId = searchResponse.data.items[0].snippet?.channelId;
      if (actualChannelId) {
        console.log(`[Resolve] ${channel.id} -> ${actualChannelId} (by title)`);
        return actualChannelId;
      }
    }

  } catch (error: any) {
    if (error?.code === 403 && error?.message?.includes('quota')) {
      console.log(`[Resolve] Quota exceeded, rotating key...`);
      rotateApiKey();
    }
    console.error(`[Resolve] Failed to resolve ${channel.id}:`, error.message);
  }

  return null;
}

/**
 * Extract social media links from channel description
 */
export function extractSocialLinks(description: string): string | null {
  const links: string[] = [];

  // Common social media patterns
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[\w.]+/gi,
    /(?:https?:\/\/)?(?:www\.)?twitter\.com\/[\w]+/gi,
    /(?:https?:\/\/)?(?:www\.)?x\.com\/[\w]+/gi,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[\w.]+/gi,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.]+/gi,
    /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/[\w]+/gi,
    /(?:https?:\/\/)?(?:www\.)?discord\.gg\/[\w]+/gi,
    /(?:https?:\/\/)?(?:www\.)?patreon\.com\/[\w]+/gi,
    /(?:https?:\/\/)?t\.me\/[\w]+/gi,
  ];

  for (const pattern of patterns) {
    const matches = description.match(pattern);
    if (matches) {
      links.push(...matches);
    }
  }

  return links.length > 0 ? JSON.stringify(links) : null;
}

/**
 * Enrich a batch of channels with metadata from YouTube API
 * @param channels - Channels to enrich
 * @param skipResolution - If true, skip channels that don't have proper IDs (saves quota)
 * @param retryCount - Internal retry counter for quota exhaustion handling
 */
export async function enrichChannelBatch(
  channels: Channel[],
  skipResolution: boolean = false,
  retryCount: number = 0
): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    total: channels.length,
    enriched: 0,
    failed: 0,
    skipped: 0,
  };

  if (channels.length === 0) {
    return stats;
  }

  const client = getClient();

  const RATE_LIMIT_DELAY_MS = 100; // Delay between API calls to avoid rate limiting

  try {
    console.log(`[Enrichment] Processing ${channels.length} channels...`);

    // Step 1: Resolve channel IDs (or skip if skipResolution=true)
    const resolvedChannels: Array<{ original: Channel; actualId: string }> = [];

    for (const channel of channels) {
      // If channel already has proper ID (starts with UC), use it directly
      if (channel.id.startsWith('UC')) {
        resolvedChannels.push({ original: channel, actualId: channel.id });
      } else if (!skipResolution) {
        // Try to resolve handle to ID
        const actualId = await resolveChannelId(channel);
        if (actualId) {
          resolvedChannels.push({ original: channel, actualId });
        } else {
          console.log(`[Enrichment] ✗ Could not resolve ${channel.id} (${channel.title})`);
          stats.failed++;
        }
        // Small delay to avoid rate limiting on search API
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      } else {
        // Skip channels without proper IDs when skipResolution=true
        console.log(`[Enrichment] ⊘ Skipped ${channel.id} (not a proper channel ID)`);
        stats.skipped++;
      }
    }

    if (resolvedChannels.length === 0) {
      console.log('[Enrichment] No channels could be resolved');
      return stats;
    }

    console.log(`[Enrichment] Resolved ${resolvedChannels.length}/${channels.length} channels`);
    console.log(`[Enrichment] Fetching details for ${resolvedChannels.length} channels...`);

    // Step 2: Fetch channel details using actual IDs
    const actualIds = resolvedChannels.map(rc => rc.actualId);
    const youtubeClient = getYouTubeClient();
    const channelsResponse = await youtubeClient.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: actualIds,
    });

    if (!channelsResponse.data.items) {
      console.log('[Enrichment] No data returned from YouTube API');
      stats.failed = channels.length;
      return stats;
    }

    // Process each channel
    for (const ytChannel of channelsResponse.data.items) {
      const actualChannelId = ytChannel.id!;
      const snippet = ytChannel.snippet!;
      const contentDetails = ytChannel.contentDetails!;

      // Find the original channel record
      const originalChannel = resolvedChannels.find(rc => rc.actualId === actualChannelId)?.original;
      if (!originalChannel) {
        console.log(`[Enrichment] Warning: Could not find original record for ${actualChannelId}`);
        continue;
      }

      try {
        // Get last upload date from uploads playlist
        let lastUploadDate: string | null = null;
        if (contentDetails.relatedPlaylists?.uploads) {
          const uploadsPlaylistId = contentDetails.relatedPlaylists.uploads;

          try {
            const playlistResponse = await youtubeClient.playlistItems.list({
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
          } catch (playlistError: any) {
            if (playlistError?.code === 403 && playlistError?.message?.includes('quota')) {
              console.log(`[Enrichment] Quota exceeded on playlist fetch, rotating key...`);
              rotateApiKey();
            } else {
              console.error(`[Enrichment] Error fetching playlist for ${actualChannelId}:`, playlistError.message);
            }
          }
        }

        // Extract social links from description
        const description = snippet.description || '';
        const socialLinks = extractSocialLinks(description);

        // Get thumbnail URL (prefer medium or high quality)
        const thumbnailUrl =
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          snippet.thumbnails?.high?.url ||
          null;

        // Update the ORIGINAL channel record (not the resolved ID)
        await client.execute({
          sql: `
            UPDATE channels
            SET
              language = COALESCE(?, language),
              region = COALESCE(?, region),
              last_upload_date = COALESCE(?, last_upload_date),
              thumbnail_url = COALESCE(?, thumbnail_url),
              social_links = COALESCE(?, social_links),
              fetched_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [
            snippet.defaultLanguage || snippet.country || null,
            snippet.country || null,
            lastUploadDate,
            thumbnailUrl,
            socialLinks,
            originalChannel.id, // Use original ID, not resolved ID
          ],
        });

        stats.enriched++;
        console.log(`[Enrichment] ✓ Enriched ${originalChannel.id} -> ${actualChannelId} (${snippet.title})`);

      } catch (updateError: any) {
        console.error(`[Enrichment] Failed to update ${originalChannel.id}:`, updateError.message);
        stats.failed++;
      }
    }

    // Mark channels that weren't found in YouTube API response as failed
    const foundIds = new Set(channelsResponse.data.items.map(ch => ch.id));
    const notFoundActualIds = actualIds.filter(id => !foundIds.has(id));

    if (notFoundActualIds.length > 0) {
      console.log(`[Enrichment] ${notFoundActualIds.length} resolved channels not found in YouTube API`);
      stats.failed += notFoundActualIds.length;
    }

  } catch (error: any) {
    // Handle quota exceeded error
    if (error?.code === 403 && error?.message?.includes('quota')) {
      if (retryCount >= 5) {
        console.error('[Enrichment] Max retries exceeded, all API keys exhausted');
        stats.failed = channels.length;
        return stats;
      }
      console.log(`[Enrichment] Quota exceeded, rotating API key... (retry ${retryCount + 1}/5)`);
      rotateApiKey();

      // Retry with new key
      console.log(`[Enrichment] Retrying batch with new API key...`);
      return await enrichChannelBatch(channels, skipResolution, retryCount + 1);
    }

    console.error('[Enrichment] Error enriching batch:', error.message);
    stats.failed = channels.length;
  }

  return stats;
}

/**
 * Get count of channels still needing enrichment
 */
export async function getRemainingChannelsCount(): Promise<number> {
  const client = getClient();

  const result = await client.execute({
    sql: `
      SELECT COUNT(*) as count FROM channels
      WHERE (
        language IS NULL OR
        region IS NULL OR
        last_upload_date IS NULL OR
        thumbnail_url IS NULL
      )
    `,
    args: [],
  });

  return Number(result.rows[0].count);
}
