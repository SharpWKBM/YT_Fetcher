import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const result = await client.execute({
        sql: `
          SELECT cb.*, c.title, c.thumbnail_url, c.channel_url
          FROM channel_blacklist cb
          JOIN channels c ON cb.channel_id = c.id
          WHERE cb.user_id = ?
          ORDER BY cb.created_at DESC
        `,
        args: [session.user.id],
      });

      return res.status(200).json({
        success: true,
        blacklist: result.rows,
      });
    } catch (error) {
      console.error('Error fetching blacklist:', error);
      return res.status(500).json({ error: 'Failed to fetch blacklist' });
    }
  }

  if (req.method === 'POST') {
    const { channelId, reason } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }

    try {
      const id = `bl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await client.execute({
        sql: `INSERT INTO channel_blacklist (id, channel_id, user_id, reason) VALUES (?, ?, ?, ?)`,
        args: [id, channelId, session.user.id, reason || null],
      });

      return res.status(201).json({
        success: true,
        message: 'Channel blacklisted successfully',
      });
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: 'Channel already blacklisted' });
      }
      console.error('Error blacklisting channel:', error);
      return res.status(500).json({ error: 'Failed to blacklist channel' });
    }
  }

  if (req.method === 'DELETE') {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }

    try {
      await client.execute({
        sql: `DELETE FROM channel_blacklist WHERE channel_id = ? AND user_id = ?`,
        args: [channelId, session.user.id],
      });

      return res.status(200).json({
        success: true,
        message: 'Channel removed from blacklist',
      });
    } catch (error) {
      console.error('Error removing from blacklist:', error);
      return res.status(500).json({ error: 'Failed to remove from blacklist' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
