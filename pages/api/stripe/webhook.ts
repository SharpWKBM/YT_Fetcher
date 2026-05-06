import { buffer } from 'micro';
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@libsql/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

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

  let event: Stripe.Event;

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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId) {
          console.error('No userId in checkout session metadata');
          break;
        }

        const subscriptionResponse = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const subscription = subscriptionResponse as any;

        await client.execute({
          sql: `
            UPDATE users
            SET subscription_status = ?,
                stripe_customer_id = ?,
                stripe_subscription_id = ?,
                stripe_current_period_end = ?,
                trial_ends_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [
            subscription.status,
            session.customer as string,
            session.subscription as string,
            new Date((subscription.current_period_end || subscription.currentPeriodEnd) * 1000).toISOString(),
            userId,
          ],
        });

        console.log(`Subscription activated for user ${userId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;

        await client.execute({
          sql: `
            UPDATE users
            SET subscription_status = ?,
                stripe_current_period_end = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE stripe_subscription_id = ?
          `,
          args: [
            subscription.status,
            new Date((subscription.current_period_end || subscription.currentPeriodEnd) * 1000).toISOString(),
            subscription.id,
          ],
        });

        console.log(`Subscription updated: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await client.execute({
          sql: `
            UPDATE users 
            SET subscription_status = 'canceled',
                stripe_subscription_id = NULL,
                stripe_current_period_end = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE stripe_subscription_id = ?
          `,
          args: [subscription.id],
        });

        console.log(`Subscription canceled: ${subscription.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;

        if (invoice.subscription) {
          await client.execute({
            sql: `
              UPDATE users
              SET subscription_status = 'past_due',
                  updated_at = CURRENT_TIMESTAMP
              WHERE stripe_subscription_id = ?
            `,
            args: [invoice.subscription as string],
          });

          console.log(`Payment failed for subscription: ${invoice.subscription}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;

        if (invoice.subscription) {
          await client.execute({
            sql: `
              UPDATE users
              SET subscription_status = 'active',
                  updated_at = CURRENT_TIMESTAMP
              WHERE stripe_subscription_id = ?
            `,
            args: [invoice.subscription as string],
          });

          console.log(`Payment succeeded for subscription: ${invoice.subscription}`);
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Trial ending soon for subscription: ${subscription.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
