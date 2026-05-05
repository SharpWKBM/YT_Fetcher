import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import { stripe, getTierFromPriceId } from '@/lib/stripe';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_email;
        const tier = session.metadata?.tier || 'free';

        if (customerEmail) {
          // Update user tier in database
          await client.execute({
            sql: `
              UPDATE users
              SET tier = ?, updated_at = CURRENT_TIMESTAMP
              WHERE email = ?
            `,
            args: [tier, customerEmail],
          });

          console.log(`[Webhook] Updated user ${customerEmail} to ${tier} tier`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if ('email' in customer && customer.email) {
          await client.execute({
            sql: `
              UPDATE users
              SET tier = ?, updated_at = CURRENT_TIMESTAMP
              WHERE email = ?
            `,
            args: [tier, customer.email],
          });

          console.log(`[Webhook] Updated subscription for ${customer.email} to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if ('email' in customer && customer.email) {
          // Downgrade to free tier
          await client.execute({
            sql: `
              UPDATE users
              SET tier = 'free', updated_at = CURRENT_TIMESTAMP
              WHERE email = ?
            `,
            args: [customer.email],
          });

          console.log(`[Webhook] Downgraded ${customer.email} to free tier`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
