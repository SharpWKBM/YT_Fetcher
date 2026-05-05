import Meta from '@/components/SEO/Meta';
import { useSession, signIn } from 'next-auth/react';
import styles from '@/styles/Pricing.module.css';

export default function Pricing() {
  const { data: session } = useSession();

  const handleUpgrade = (tier: string) => {
    if (!session) {
      signIn();
      return;
    }
    // TODO: Implement Stripe checkout
    window.location.href = '/subscription';
  };

  return (
    <>
      <Meta
        title="Pricing Plans - YouTube Channel Finder | From $29/month"
        description="Choose the right plan: Free (10 channels/mo), Pro ($29 - 100 channels), Enterprise ($99 - unlimited). Find your next YouTube channel acquisition today."
        schema={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "YouTube Channel Finder",
          "offers": [
            {
              "@type": "Offer",
              "name": "Free Plan",
              "price": "0",
              "priceCurrency": "USD"
            },
            {
              "@type": "Offer",
              "name": "Pro Plan",
              "price": "29",
              "priceCurrency": "USD"
            },
            {
              "@type": "Offer",
              "name": "Enterprise Plan",
              "price": "99",
              "priceCurrency": "USD"
            }
          ]
        }}
      />

      <main className={styles.container}>
        <div className={styles.header}>
          <h1>Pricing Plans</h1>
          <p>Choose the plan that fits your needs</p>
        </div>

        <div className={styles.pricingGrid}>
          {/* Free Tier */}
          <div className={styles.pricingCard}>
            <h2>Free</h2>
            <div className={styles.price}>
              <span className={styles.amount}>$0</span>
              <span className={styles.period}>/month</span>
            </div>
            <ul className={styles.features}>
              <li>✓ 10 channels viewed per month</li>
              <li>✓ Basic filters</li>
              <li>✓ Public channel profiles</li>
              <li>✓ Email support</li>
            </ul>
            <button
              className={styles.btn}
              onClick={() => !session && signIn()}
            >
              {session ? 'Current Plan' : 'Get Started'}
            </button>
          </div>

          {/* Pro Tier */}
          <div className={`${styles.pricingCard} ${styles.featured}`}>
            <div className={styles.badge}>Most Popular</div>
            <h2>Pro</h2>
            <div className={styles.price}>
              <span className={styles.amount}>$29</span>
              <span className={styles.period}>/month</span>
            </div>
            <ul className={styles.features}>
              <li>✓ 100 channels viewed per month</li>
              <li>✓ Advanced filters</li>
              <li>✓ Save searches</li>
              <li>✓ Favorites list</li>
              <li>✓ Export to CSV</li>
              <li>✓ Priority support</li>
            </ul>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => handleUpgrade('pro')}
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className={styles.pricingCard}>
            <h2>Enterprise</h2>
            <div className={styles.price}>
              <span className={styles.amount}>$99</span>
              <span className={styles.period}>/month</span>
            </div>
            <ul className={styles.features}>
              <li>✓ Unlimited channel views</li>
              <li>✓ All Pro features</li>
              <li>✓ API access</li>
              <li>✓ Custom reports</li>
              <li>✓ Dedicated account manager</li>
              <li>✓ 24/7 support</li>
            </ul>
            <button
              className={styles.btn}
              onClick={() => handleUpgrade('enterprise')}
            >
              Contact Sales
            </button>
          </div>
        </div>

        {/* FAQ Section with Schema */}
        <section className={styles.faq}>
          <h2>Frequently Asked Questions</h2>

          <div className={styles.faqItem}>
            <h3>Can I upgrade or downgrade anytime?</h3>
            <p>Yes, you can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the next billing cycle.</p>
          </div>

          <div className={styles.faqItem}>
            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit cards (Visa, Mastercard, American Express) via Stripe.</p>
          </div>

          <div className={styles.faqItem}>
            <h3>Is there a refund policy?</h3>
            <p>Yes, we offer a 14-day money-back guarantee on all paid plans.</p>
          </div>

          <div className={styles.faqItem}>
            <h3>How much does a YouTube channel cost?</h3>
            <p>YouTube channels typically cost 12-36 months of revenue. A channel earning $1,000/month might sell for $12,000-$36,000.</p>
          </div>
        </section>

        <div className={styles.cta}>
          <h2>Ready to find your next YouTube channel?</h2>
          <button
            className={styles.ctaBtn}
            onClick={() => window.location.href = '/'}
          >
            Start Searching
          </button>
        </div>
      </main>
    </>
  );
}
