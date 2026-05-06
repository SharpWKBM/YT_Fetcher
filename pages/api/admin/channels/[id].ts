import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getClient } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = getClient();

  const userResult = await client.execute({
    sql: 'SELECT id, is_admin FROM users WHERE email = ?',
    args: [session.user.email],
  });

  if (!userResult.rows[0] || userResult.rows[0].is_admin !== 1) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    const result = await client.execute({
      sql: 'SELECT * FROM channels WHERE id = ?',
      args: [id],
    });

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    return res.status(200).json({ channel: result.rows[0] });
  }

  if (req.method === 'PUT') {
    const { status } = req.body;

    if (!status || !['pending', 'approved', 'rejected', 'blacklisted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    await client.execute({
      sql: 'UPDATE channels SET status = ? WHERE id = ?',
      args: [status, id],
    });

    await client.execute({
      sql: 'INSERT INTO admin_logs (user_id, action, details) VALUES (?, ?, ?)',
      args: [
        userResult.rows[0].id,
        'channel_status_update',
        JSON.stringify({ channel_id: id, new_status: status }),
      ],
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
