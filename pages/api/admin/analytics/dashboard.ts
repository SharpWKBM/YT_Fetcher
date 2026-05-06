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
      // Get total users
      const totalUsersResult = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM users',
        args: [],
      });
      const totalUsers = (totalUsersResult.rows[0] as any).count;

      // Get active subscriptions
      const activeSubsResult = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM users WHERE stripe_subscription_id IS NOT NULL',
        args: [],
      });
      const activeSubscriptions = (activeSubsResult.rows[0] as any).count;

      // Get users by tier
      const tierResult = await client.execute({
        sql: 'SELECT tier, COUNT(*) as count FROM users GROUP BY tier',
        args: [],
      });

      const usersByTier: Record<string, number> = {
        free: 0,
        pro: 0,
        enterprise: 0,
      };

      tierResult.rows.forEach((row: any) => {
        if (row.tier in usersByTier) {
          usersByTier[row.tier] = row.count;
        }
      });

      await logAdminAction(
        admin.id,
        'VIEW_DASHBOARD',
        'system',
        null,
        null,
        req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      );

      res.status(200).json({
        success: true,
        metrics: {
          totalUsers,
          activeSubscriptions,
          usersByTier,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
