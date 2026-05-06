import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { channelId } = req.query;

  if (!channelId || typeof channelId !== 'string') {
    return res.status(400).json({ error: 'Channel ID is required' });
  }

  try {
    const result = await client.execute({
      sql: `SELECT COUNT(*) as count FROM channel_blacklist WHERE channel_id = ? AND user_id = ?`,
      args: [channelId, session.user.id],
    });

    const isBlacklisted = Number(result.rows[0].count) > 0;

    return res.status(200).json({
      success: true,
      isBlacklisted,
    });
  } catch (error) {
    console.error('Error checking blacklist status:', error);
    return res.status(500).json({ error: 'Failed to check blacklist status' });
  }
}
