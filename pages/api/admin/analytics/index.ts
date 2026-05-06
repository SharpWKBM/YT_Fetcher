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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = getClient();

  try {
    // User statistics
    const userStats = await client.execute(`
      SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END) as free_users,
        SUM(CASE WHEN tier = 'pro' THEN 1 ELSE 0 END) as pro_users,
        SUM(CASE WHEN tier = 'enterprise' THEN 1 ELSE 0 END) as enterprise_users
      FROM users
    `);

    // Channel statistics
    const channelStats = await client.execute(`
      SELECT
        COUNT(*) as total_channels,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_channels,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_channels,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_channels,
        SUM(CASE WHEN status = 'blacklisted' THEN 1 ELSE 0 END) as blacklisted_channels
      FROM channels
    `);

    // Subscription revenue (last 30 days)
    const revenueStats = await client.execute(`
      SELECT
        COUNT(*) as total_events,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_transaction
      FROM subscription_events
      WHERE event_type IN ('subscription.created', 'subscription.updated')
        AND created_at >= datetime('now', '-30 days')
    `);

    // Recent subscription events (last 7 days)
    const recentEvents = await client.execute(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as event_count,
        SUM(amount) as daily_revenue
      FROM subscription_events
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Top niches by channel count
    const topNiches = await client.execute(`
      SELECT
        niche,
        COUNT(*) as channel_count
      FROM channels
      WHERE niche IS NOT NULL AND status = 'approved'
      GROUP BY niche
      ORDER BY channel_count DESC
      LIMIT 10
    `);

    // Recent admin actions (last 50)
    const recentActions = await client.execute(`
      SELECT
        a.action,
        a.resource_type,
        a.created_at,
        u.email as admin_email
      FROM admin_audit_log a
      JOIN users u ON a.admin_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `);

    await logAdminAction(
      admin.id,
      'VIEW_ANALYTICS',
      'analytics',
      null,
      {},
      req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    );

    res.status(200).json({
      success: true,
      analytics: {
        users: userStats.rows[0],
        channels: channelStats.rows[0],
        revenue: revenueStats.rows[0],
        recentEvents: recentEvents.rows,
        topNiches: topNiches.rows,
        recentActions: recentActions.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
