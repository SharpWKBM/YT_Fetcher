import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import Stripe from 'stripe';
import { createClient } from '@libsql/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await client.execute({
      sql: 'SELECT stripe_customer_id FROM users WHERE id = ?',
      args: [session.user.id],
    });

    if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: result.rows[0].stripe_customer_id as string,
      return_url: `${process.env.NEXTAUTH_URL}/profile`,
    });

    return res.redirect(303, portalSession.url);
  } catch (error) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}
