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
      const { tier, page = '1', limit = '50' } = req.query;

      let sql = 'SELECT id, email, name, tier, stripe_customer_id, stripe_subscription_id, created_at FROM users WHERE stripe_subscription_id IS NOT NULL';
      const args: any[] = [];

      if (tier) {
        sql += ' AND tier = ?';
        args.push(tier);
      }

      // Count total
      const countResult = await client.execute({
        sql: sql.replace('SELECT id, email, name, tier, stripe_customer_id, stripe_subscription_id, created_at', 'SELECT COUNT(*) as count'),
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
        'LIST_SUBSCRIPTIONS',
        'subscription',
        null,
        { tier, page, limit },
        req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      );

      res.status(200).json({
        success: true,
        subscriptions: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
