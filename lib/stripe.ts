import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    price: 0,
    channelsPerMonth: 10,
    features: [
      '10 channels per month',
      'Basic search filters',
      'View channel details',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 9.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    channelsPerMonth: 1000,
    features: [
      '1,000 channels per month',
      'Advanced filters',
      'Export to CSV',
      'Email notifications',
      'Priority support',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 29.99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    channelsPerMonth: -1, // Unlimited
    features: [
      'Unlimited channels',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'White-label options',
    ],
  },
};

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === SUBSCRIPTION_TIERS.PRO.priceId) return 'pro';
  if (priceId === SUBSCRIPTION_TIERS.ENTERPRISE.priceId) return 'enterprise';
  return 'free';
}
