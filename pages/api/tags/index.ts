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
    const { popular } = req.query;

    if (popular === 'true') {
      return await getPopularTags(res);
    }

    return await getAllTags(res);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

async function getAllTags(res: NextApiResponse) {
  const result = await client.execute({
    sql: `
      SELECT DISTINCT tag
      FROM channel_tags
      ORDER BY tag ASC
    `,
    args: [],
  });

  const tags = result.rows.map(row => row.tag as string);
  return res.status(200).json({ success: true, tags });
}

async function getPopularTags(res: NextApiResponse) {
  const result = await client.execute({
    sql: `
      SELECT tag, COUNT(*) as count
      FROM channel_tags
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 20
    `,
    args: [],
  });

  const tags = result.rows.map(row => ({
    tag: row.tag as string,
    count: Number(row.count),
  }));

  return res.status(200).json({ success: true, tags });
}
