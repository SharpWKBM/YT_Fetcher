import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await client.execute({
      sql: `
        SELECT niche, COUNT(*) as count
        FROM channels
        WHERE niche IS NOT NULL AND niche != ''
        GROUP BY niche
        ORDER BY count DESC, niche ASC
      `,
      args: [],
    });

    const niches = result.rows.map(row => ({
      name: row.niche as string,
      count: Number(row.count),
    }));

    return res.status(200).json({
      success: true,
      niches,
    });
  } catch (error) {
    console.error('Error fetching niches:', error);
    return res.status(500).json({ error: 'Failed to fetch niches' });
  }
}
