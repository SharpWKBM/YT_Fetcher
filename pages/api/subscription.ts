import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
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

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch user subscription info
    const result = await client.execute({
      sql: `SELECT subscription_tier, subscription_status,
             stripe_subscription_id, stripe_current_period_end
             FROM users WHERE email = ?`,
      args: [session.user.email],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0] as any;

    const subscription = {
      tier: user.subscription_tier || 'free',
      status: user.subscription_status,
      current_period_end: user.stripe_current_period_end,
      cancel_at_period_end: false, // TODO: Fetch from Stripe if needed
    };

    return res.status(200).json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription' });
  }
}
