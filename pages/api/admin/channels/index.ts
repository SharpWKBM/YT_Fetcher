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
    sql: 'SELECT is_admin FROM users WHERE email = ?',
    args: [session.user.email],
  });

  if (!userResult.rows[0] || userResult.rows[0].is_admin !== 1) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  if (req.method === 'GET') {
    const { page = '1', limit = '20', status, search } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let sql = 'SELECT id, channel_id, title, subscriber_count, video_count, status, created_at FROM channels WHERE 1=1';
    const args: any[] = [];

    if (status && ['pending', 'approved', 'rejected', 'blacklisted'].includes(status as string)) {
      sql += ' AND status = ?';
      args.push(status);
    }

    if (search) {
      sql += ' AND (title LIKE ? OR channel_id LIKE ?)';
      args.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await client.execute({
      sql: sql.replace('SELECT id, channel_id, title, subscriber_count, video_count, status, created_at FROM channels', 'SELECT COUNT(*) as count FROM channels'),
      args,
    });

    const total = Number(countResult.rows[0].count);

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(limitNum, offset);

    const result = await client.execute({ sql, args });

    return res.status(200).json({
      channels: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
