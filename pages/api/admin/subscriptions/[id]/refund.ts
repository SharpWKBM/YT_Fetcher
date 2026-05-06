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
  const { amount, reason } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid refund amount' });
  }

  try {
    // Get user's payment info
    const userResult = await client.execute({
      sql: 'SELECT id, email, stripe_customer_id, tier FROM users WHERE id = ?',
      args: [id],
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0] as any;

    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'User has no Stripe customer ID' });
    }

    // Get recent payment intents for this customer
    const paymentIntents = await stripe.paymentIntents.list({
      customer: user.stripe_customer_id,
      limit: 10,
    });

    if (paymentIntents.data.length === 0) {
      return res.status(400).json({ error: 'No payment found for this user' });
    }

    // Use the most recent successful payment
    const latestPayment = paymentIntents.data.find(pi => pi.status === 'succeeded');

    if (!latestPayment) {
      return res.status(400).json({ error: 'No successful payment found' });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: latestPayment.id,
      amount: Math.round(amount * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        admin_id: admin.id,
        admin_reason: reason || 'Admin-initiated refund',
      },
    });

    // Log subscription event
    await client.execute({
      sql: `INSERT INTO subscription_events (id, user_id, event_type, tier, amount, stripe_event_id, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        `evt_${Date.now()}`,
        id,
        'refund.created',
        user.tier,
        amount,
        refund.id,
        JSON.stringify({ reason, refunded_by: 'admin', admin_id: admin.id, payment_intent: latestPayment.id }),
      ],
    });

    // Log admin action
    await logAdminAction(
      admin.id,
      'REFUND_PAYMENT',
      'payment',
      id,
      { amount, reason, refund_id: refund.id, payment_intent: latestPayment.id },
      req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    );

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refund,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
}
