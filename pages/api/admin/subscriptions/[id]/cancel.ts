import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { getClient } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const admin = await requireAdmin(req, res, session);

  if (!admin) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = getClient();
  const { id } = req.query;
  const { reason } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    // Get user's subscription
    const userResult = await client.execute({
      sql: 'SELECT id, email, stripe_subscription_id, tier FROM users WHERE id = ?',
      args: [id],
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0] as any;

    if (!user.stripe_subscription_id) {
      return res.status(400).json({ error: 'User has no active subscription' });
    }

    // Cancel subscription in Stripe
    const subscription = await stripe.subscriptions.cancel(user.stripe_subscription_id);

    // Update user tier to free
    await client.execute({
      sql: 'UPDATE users SET tier = ?, stripe_subscription_id = NULL WHERE id = ?',
      args: ['free', id],
    });

    // Log subscription event
    await client.execute({
      sql: `INSERT INTO subscription_events (id, user_id, event_type, tier, stripe_event_id, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        `evt_${Date.now()}`,
        id,
        'subscription.cancelled',
        user.tier,
        subscription.id,
        JSON.stringify({ reason, cancelled_by: 'admin', admin_id: admin.id }),
      ],
    });

    // Log admin action
    await logAdminAction(
      admin.id,
      'CANCEL_SUBSCRIPTION',
      'subscription',
      id,
      { reason, stripe_subscription_id: user.stripe_subscription_id },
      req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    );

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription,
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
}
