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
    const { page = '1', limit = '50', action } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT
        admin_logs.id,
        admin_logs.user_id,
        admin_logs.action,
        admin_logs.details,
        admin_logs.created_at,
        users.email,
        users.name
      FROM admin_logs
      LEFT JOIN users ON admin_logs.user_id = users.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (action) {
      sql += ' AND admin_logs.action = ?';
      args.push(action);
    }

    const countResult = await client.execute({
      sql: sql.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) as count FROM'),
      args,
    });

    const total = Number(countResult.rows[0].count);

    sql += ' ORDER BY admin_logs.created_at DESC LIMIT ? OFFSET ?';
    args.push(limitNum, offset);

    const result = await client.execute({ sql, args });

    return res.status(200).json({
      logs: result.rows,
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
