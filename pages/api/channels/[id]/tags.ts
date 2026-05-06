import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: channelId } = req.query;

  if (typeof channelId !== 'string') {
    return res.status(400).json({ error: 'Invalid channel ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getTags(channelId, res);
      case 'POST':
        return await addTag(channelId, req.body, res);
      case 'DELETE':
        return await removeTag(channelId, req.body, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error managing tags:', error);
    return res.status(500).json({ error: 'Failed to manage tags' });
  }
}

async function getTags(channelId: string, res: NextApiResponse) {
  const result = await client.execute({
    sql: `SELECT tag FROM channel_tags WHERE channel_id = ? ORDER BY created_at DESC`,
    args: [channelId],
  });

  const tags = result.rows.map(row => row.tag as string);
  return res.status(200).json({ success: true, tags });
}

async function addTag(channelId: string, body: any, res: NextApiResponse) {
  const { tag } = body;

  if (!tag || typeof tag !== 'string') {
    return res.status(400).json({ error: 'Tag is required' });
  }

  const normalizedTag = tag.trim().toLowerCase();

  if (normalizedTag.length === 0 || normalizedTag.length > 50) {
    return res.status(400).json({ error: 'Tag must be between 1 and 50 characters' });
  }

  const id = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    await client.execute({
      sql: `INSERT INTO channel_tags (id, channel_id, tag) VALUES (?, ?, ?)`,
      args: [id, channelId, normalizedTag],
    });

    return res.status(201).json({ success: true, tag: normalizedTag });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Tag already exists for this channel' });
    }
    throw error;
  }
}

async function removeTag(channelId: string, body: any, res: NextApiResponse) {
  const { tag } = body;

  if (!tag || typeof tag !== 'string') {
    return res.status(400).json({ error: 'Tag is required' });
  }

  const normalizedTag = tag.trim().toLowerCase();

  await client.execute({
    sql: `DELETE FROM channel_tags WHERE channel_id = ? AND tag = ?`,
    args: [channelId, normalizedTag],
  });

  return res.status(200).json({ success: true });
}
