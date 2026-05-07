import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const batchSize = parseInt(req.query.batchSize as string) || 15;

    // Call the actual enrichment endpoint
    const response = await fetch(
      `https://youtube-finder-nine.vercel.app/api/cron/enrich-channels?batchSize=${batchSize}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[Admin Enrich] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger enrichment',
    });
  }
}
