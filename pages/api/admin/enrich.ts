import type { NextApiRequest, NextApiResponse } from 'next';
import {
  enrichChannelBatch,
  getChannelsNeedingEnrichment,
  getRemainingChannelsCount,
} from '@/lib/enrichment';

/**
 * Admin trigger for the channel enrichment job.
 *
 * Previously this proxied through a hardcoded production URL; that broke local
 * dev and mixed envs. We now run the job in-process and authenticate with the
 * same `CRON_SECRET` the cron endpoint uses.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return res.status(500).json({ success: false, error: 'CRON_SECRET not configured' });
  }
  if (req.headers.authorization !== `Bearer ${expected}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const start = Date.now();

  try {
    const batchSize = Math.min(Math.max(parseInt(req.query.batchSize as string) || 15, 1), 50);
    const skipResolution = req.query.skipResolution === 'true';

    const channels = await getChannelsNeedingEnrichment(batchSize);
    if (channels.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No channels need enrichment',
        stats: { enriched: 0, failed: 0, skipped: 0, remaining: 0, duration: 0 },
      });
    }

    const stats = await enrichChannelBatch(channels, skipResolution);
    const remaining = await getRemainingChannelsCount();

    return res.status(200).json({
      success: true,
      message: `Enriched ${stats.enriched} channels`,
      stats: { ...stats, remaining, duration: Math.round((Date.now() - start) / 1000) },
    });
  } catch (error) {
    console.error('[Admin Enrich] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Enrichment failed',
    });
  }
}
