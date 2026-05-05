import Meta from '@/components/SEO/Meta';
import { useSession, signIn } from 'next-auth/react';
import styles from '@/styles/Features.module.css';

export default function Features() {
  const { data: session } = useSession();

  return (
    <>
      <Meta
        title="Features - YouTube Channel Finder | Advanced Search & Filters"
        description="Discover inactive YouTube channels with advanced filters: subscriber count, language, region, inactivity period. Save searches, export data, and track favorites."
      />

      <main className={styles.container}>
        <div className={styles.header}>
          <h1>Powerful Features for Channel Discovery</h1>
          <p>Everything you need to find the perfect YouTube channel</p>
        </div>

        <div className={styles.featuresGrid}>
          <section className={styles.feature}>
            <div className={styles.icon}>🔍</div>
            <h2>Advanced Search Filters</h2>
            <p>Find exactly what you're looking for with granular filters:</p>
            <ul>
              <li>Subscriber range (10K - 10M+)</li>
              <li>Language and region targeting</li>
              <li>Inactivity period (3-24+ months)</li>
              <li>Sort by subscribers or last upload date</li>
              <li>Custom filter combinations</li>
            </ul>
          </section>

          <section className={styles.feature}>
            <div className={styles.icon}>💾</div>
            <h2>Save & Organize</h2>
            <p>Keep track of promising channels:</p>
            <ul>
              <li>Save custom search filters</li>
              <li>Favorite channels for later review</li>
              <li>Export results to CSV (Pro+)</li>
              <li>Track viewing history</li>
              <li>Organize by categories</li>
            </ul>
          </section>

          <section className={styles.feature}>
            <div className={styles.icon}>📊</div>
            <h2>Channel Insights</h2>
            <p>Make informed decisions with detailed data:</p>
            <ul>
              <li>Subscriber count and growth trends</li>
              <li>Last upload date and inactivity period</li>
              <li>Channel language and region</li>
              <li>Direct links to YouTube channels</li>
              <li>Historical performance data</li>
            </ul>
          </section>

          <section className={styles.feature}>
            <div className={styles.icon}>🚀</div>
            <h2>Regular Updates</h2>
            <p>Stay ahead with fresh data:</p>
            <ul>
              <li>Daily database updates</li>
              <li>New channels added regularly</li>
              <li>Automated monitoring of channel activity</li>
              <li>Email alerts for new opportunities (Pro+)</li>
              <li>Real-time availability status</li>
            </ul>
          </section>

          <section className={styles.feature}>
            <div className={styles.icon}>🎯</div>
            <h2>Smart Recommendations</h2>
            <p>Discover channels you might have missed:</p>
            <ul>
              <li>Similar channel suggestions</li>
              <li>Trending niches and categories</li>
              <li>Best value opportunities</li>
              <li>Recently inactive channels</li>
              <li>High-growth potential picks</li>
            </ul>
          </section>

          <section className={styles.feature}>
            <div className={styles.icon}>🔒</div>
            <h2>Secure & Private</h2>
            <p>Your data is safe with us:</p>
            <ul>
              <li>Encrypted data transmission</li>
              <li>Secure authentication</li>
              <li>Private search history</li>
              <li>GDPR compliant</li>
              <li>No data sharing with third parties</li>
            </ul>
          </section>
        </div>

        <section className={styles.comparison}>
          <h2>Compare Plans</h2>
          <div className={styles.comparisonTable}>
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Pro</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Channels per month</td>
                  <td>10</td>
                  <td>100</td>
                  <td>Unlimited</td>
                </tr>
                <tr>
                  <td>Advanced filters</td>
                  <td>Basic</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Save searches</td>
                  <td>—</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Export to CSV</td>
                  <td>—</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>API access</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Priority support</td>
                  <td>—</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className={styles.cta}>
          <h2>Ready to get started?</h2>
          <p>Join thousands of users finding their next YouTube channel</p>
          <div className={styles.ctaButtons}>
            <button
              className={styles.ctaPrimary}
              onClick={() => !session ? signIn() : window.location.href = '/'}
            >
              {session ? 'Start Searching' : 'Sign Up Free'}
            </button>
            <button
              className={styles.ctaSecondary}
              onClick={() => window.location.href = '/pricing'}
            >
              View Pricing
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
