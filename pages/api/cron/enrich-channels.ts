import type { NextApiRequest, NextApiResponse } from 'next';
import { enrichChannelBatch, getChannelsNeedingEnrichment, getRemainingChannelsCount } from '@/lib/enrichment';

interface EnrichmentResponse {
  success: boolean;
  message: string;
  stats: {
    enriched: number;
    failed: number;
    skipped: number;
    remaining: number;
    duration: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnrichmentResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();

  try {
    // Parse and validate query parameters
    const batchSize = Math.min(Math.max(parseInt(req.query.batchSize as string) || 15, 1), 50);
    const skipResolution = req.query.skipResolution === 'true';

    console.log('=== Channel Enrichment via Vercel Serverless ===');
    console.log(`Batch size: ${batchSize}`);
    console.log(`Skip resolution: ${skipResolution}`);

    // Fetch channels needing enrichment
    const channels = await getChannelsNeedingEnrichment(batchSize);

    if (channels.length === 0) {
      console.log('[Enrichment] No channels need enrichment');
      return res.status(200).json({
        success: true,
        message: 'No channels need enrichment',
        stats: {
          enriched: 0,
          failed: 0,
          skipped: 0,
          remaining: 0,
          duration: Math.round((Date.now() - startTime) / 1000),
        },
      });
    }

    console.log(`[Enrichment] Found ${channels.length} channels needing enrichment`);

    // Enrich the batch
    const batchStats = await enrichChannelBatch(channels, skipResolution);

    // Get remaining count
    const remaining = await getRemainingChannelsCount();

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`[Enrichment] Batch complete: ${batchStats.enriched} enriched, ${batchStats.failed} failed, ${batchStats.skipped} skipped`);
    console.log(`[Enrichment] Remaining channels: ${remaining}`);
    console.log(`[Enrichment] Duration: ${duration}s`);

    res.status(200).json({
      success: true,
      message: `Enriched ${batchStats.enriched} channels`,
      stats: {
        enriched: batchStats.enriched,
        failed: batchStats.failed,
        skipped: batchStats.skipped,
        remaining,
        duration,
      },
    });
  } catch (error: any) {
    console.error('[Enrichment] Error in enrichment job:', error);
    res.status(500).json({
      error: 'Failed to enrich channels',
      success: false,
    });
  }
}
