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
        SELECT ct.tag, COUNT(*) as count
        FROM channel_tags ct
        INNER JOIN channels c ON ct.channel_id = c.id
        GROUP BY ct.tag
        ORDER BY count DESC, ct.tag ASC
      `,
      args: [],
    });

    const tags = result.rows.map(row => ({
      name: row.tag as string,
      count: Number(row.count),
    }));

    return res.status(200).json({
      success: true,
      tags,
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return res.status(500).json({ error: 'Failed to fetch tags' });
  }
}
