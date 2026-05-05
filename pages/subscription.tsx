import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/effects.module.css';
import animations from '@/styles/animations.module.css';
import { SUBSCRIPTION_TIERS } from '@/lib/stripe';

interface Subscription {
  tier: 'free' | 'pro' | 'enterprise';
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export default function Subscription() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchSubscription();
    }
  }, [status, router]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      const data = await response.json();
      setSubscription(data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'pro' | 'enterprise') => {
    setUpgrading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={animations.shimmer}>Loading subscription...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const currentTier = subscription.tier;
  const isActive = subscription.status === 'active';

  return (
    <>
      <Head>
        <title>Subscription - YouTube Finder</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
            <p className="text-xl text-gray-600">Find more YouTube channels with advanced features</p>
          </div>

          {/* Current Subscription Banner */}
          {currentTier !== 'free' && (
            <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-2xl p-6 mb-8 text-center`}>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-2xl font-bold text-gray-900">
                  Current Plan: <span className="text-indigo-600">{currentTier.toUpperCase()}</span>
                </div>
                {isActive && subscription.current_period_end && (
                  <div className="text-gray-600">
                    {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </div>
                )}
                <button
                  onClick={handleManageBilling}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Manage Billing
                </button>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-2xl p-8 ${currentTier === 'free' ? 'ring-4 ring-indigo-500' : ''}`}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">$0</div>
                <div className="text-gray-600">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                {SUBSCRIPTION_TIERS.FREE.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {currentTier === 'free' ? (
                <div className="text-center py-3 bg-gray-100 rounded-lg font-medium text-gray-600">
                  Current Plan
                </div>
              ) : (
                <button
                  disabled
                  className="w-full py-3 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                >
                  Downgrade Not Available
                </button>
              )}
            </div>

            {/* Pro Tier */}
            <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-2xl p-8 ${currentTier === 'pro' ? 'ring-4 ring-indigo-500' : ''} relative`} style={{ animationDelay: '0.1s' }}>
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">${SUBSCRIPTION_TIERS.PRO.price}</div>
                <div className="text-gray-600">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                {SUBSCRIPTION_TIERS.PRO.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {currentTier === 'pro' ? (
                <div className="text-center py-3 bg-indigo-100 rounded-lg font-medium text-indigo-600">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={upgrading || currentTier === 'enterprise'}
                  className={`w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${animations.glowPulse}`}
                >
                  {upgrading ? 'Processing...' : currentTier === 'enterprise' ? 'Downgrade Not Available' : 'Upgrade to Pro'}
                </button>
              )}
            </div>

            {/* Enterprise Tier */}
            <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-2xl p-8 ${currentTier === 'enterprise' ? 'ring-4 ring-indigo-500' : ''}`} style={{ animationDelay: '0.2s' }}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">${SUBSCRIPTION_TIERS.ENTERPRISE.price}</div>
                <div className="text-gray-600">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                {SUBSCRIPTION_TIERS.ENTERPRISE.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {currentTier === 'enterprise' ? (
                <div className="text-center py-3 bg-purple-100 rounded-lg font-medium text-purple-600">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade('enterprise')}
                  disabled={upgrading}
                  className={`w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${animations.glowPulse}`}
                >
                  {upgrading ? 'Processing...' : 'Upgrade to Enterprise'}
                </button>
              )}
            </div>
          </div>

          {/* FAQ Section */}
          <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-2xl p-8 mt-12`} style={{ animationDelay: '0.3s' }}>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600">We accept all major credit cards, debit cards, and various local payment methods through Stripe.</p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Can I upgrade or downgrade my plan?</h3>
                <p className="text-gray-600">You can upgrade at any time. Downgrades are not currently supported, but you can cancel and restart on a lower tier.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
