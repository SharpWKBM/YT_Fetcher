import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { getClient } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const admin = await requireAdmin(req, res, session);

  if (!admin) {
    return;
  }

  const client = getClient();

  if (req.method === 'GET') {
    try {
      const { search, tier, page = '1', limit = '50' } = req.query;

      let sql = 'SELECT id, email, name, tier, channels_viewed_this_month, created_at, is_admin FROM users WHERE 1=1';
      const args: any[] = [];

      if (search) {
        sql += ' AND (email LIKE ? OR name LIKE ?)';
        args.push(`%${search}%`, `%${search}%`);
      }

      if (tier) {
        sql += ' AND tier = ?';
        args.push(tier);
      }

      // Count total
      const countResult = await client.execute({
        sql: sql.replace('SELECT id, email, name, tier, channels_viewed_this_month, created_at, subscription_status, is_admin', 'SELECT COUNT(*) as count'),
        args,
      });
      const total = (countResult.rows[0] as any).count;

      // Add pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      args.push(limitNum, offset);

      const result = await client.execute({ sql, args });

      await logAdminAction(
        admin.id,
        'LIST_USERS',
        'user',
        null,
        { search, tier, page, limit },
        req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      );

      res.status(200).json({
        success: true,
        users: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
