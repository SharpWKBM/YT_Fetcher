import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { stripe, SUBSCRIPTION_TIERS } from '@/lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const session = await getServerSession(req, res, {});
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tier } = req.body;

    // Validate tier
    if (tier !== 'pro' && tier !== 'enterprise') {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const priceId = tier === 'pro'
      ? SUBSCRIPTION_TIERS.PRO.priceId
      : SUBSCRIPTION_TIERS.ENTERPRISE.priceId;

    if (!priceId) {
      return res.status(500).json({ error: 'Price ID not configured' });
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.email,
        tier,
      },
    });

    res.status(200).json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
