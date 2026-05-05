import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@libsql/client';
import { getChannelLastUpload } from '@/lib/scrapers/rss-parser';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

interface MonitoringStats {
  totalChecked: number;
  updated: number;
  becameActive: number;
  becameInactive: number;
  errors: number;
  duration: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  const stats: MonitoringStats = {
    totalChecked: 0,
    updated: 0,
    becameActive: 0,
    becameInactive: 0,
    errors: 0,
    duration: 0,
  };

  try {
    console.log('[Monitoring] Starting channel monitoring...');

    // Fetch all channels from database
    const result = await client.execute('SELECT id, last_upload_date FROM channels');
    const channels = result.rows as unknown as Array<{ id: string; last_upload_date: string | null }>;

    console.log(`[Monitoring] Found ${channels.length} channels to check`);

    // Check each channel for updates
    for (const channel of channels) {
      stats.totalChecked++;

      try {
        // Fetch latest upload date from RSS
        const newLastUpload = await getChannelLastUpload(channel.id);
        const oldLastUpload = channel.last_upload_date;

        // Check if upload date changed
        if (newLastUpload !== oldLastUpload) {
          // Update database
          await client.execute({
            sql: 'UPDATE channels SET last_upload_date = ?, fetched_at = CURRENT_TIMESTAMP WHERE id = ?',
            args: [newLastUpload, channel.id],
          });

          stats.updated++;

          // Check if channel became active/inactive
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

          const wasInactive = !oldLastUpload || oldLastUpload <= sixMonthsAgoStr;
          const isInactive = !newLastUpload || newLastUpload <= sixMonthsAgoStr;

          if (wasInactive && !isInactive) {
            stats.becameActive++;
            console.log(`[Monitoring] Channel ${channel.id} became ACTIVE (last upload: ${newLastUpload})`);
          } else if (!wasInactive && isInactive) {
            stats.becameInactive++;
            console.log(`[Monitoring] Channel ${channel.id} became INACTIVE (last upload: ${newLastUpload})`);
          }
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        stats.errors++;
        console.error(`[Monitoring] Error checking channel ${channel.id}:`, error);
      }
    }

    stats.duration = Math.round((Date.now() - startTime) / 1000);

    console.log('[Monitoring] Monitoring complete:', stats);

    res.status(200).json({
      success: true,
      message: 'Channel monitoring complete',
      stats,
    });
  } catch (error) {
    console.error('[Monitoring] Error in monitoring job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to monitor channels',
    });
  }
}
