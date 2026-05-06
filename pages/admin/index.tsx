import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import styles from '@/styles/AdminDashboard.module.css';

interface Analytics {
  users: {
    total_users: number;
    free_users: number;
    pro_users: number;
    enterprise_users: number;
  };
  channels: {
    total_channels: number;
    pending_channels: number;
    approved_channels: number;
    rejected_channels: number;
    blacklisted_channels: number;
  };
  revenue: {
    total_events: number;
    total_revenue: number;
    avg_transaction: number;
  };
  topNiches: Array<{
    niche: string;
    channel_count: number;
  }>;
  recentActions: Array<{
    action: string;
    resource_type: string;
    created_at: string;
    admin_email: string;
  }>;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchAnalytics();
    }
  }, [status, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics');

      if (response.status === 403) {
        router.push('/');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - YouTube Finder</title>
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Admin Dashboard</h1>
          <div className={styles.userInfo}>
            {session?.user?.email}
          </div>
        </header>

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Total Users</div>
            <div className={styles.metricValue}>{analytics?.users.total_users || 0}</div>
            <div className={styles.metricBreakdown}>
              Free: {analytics?.users.free_users || 0} | Pro: {analytics?.users.pro_users || 0} | Enterprise: {analytics?.users.enterprise_users || 0}
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Total Channels</div>
            <div className={styles.metricValue}>{analytics?.channels.total_channels || 0}</div>
            <div className={styles.metricBreakdown}>
              Pending: {analytics?.channels.pending_channels || 0} | Approved: {analytics?.channels.approved_channels || 0}
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Revenue (30d)</div>
            <div className={styles.metricValue}>${analytics?.revenue.total_revenue?.toFixed(2) || '0.00'}</div>
            <div className={styles.metricBreakdown}>
              Events: {analytics?.revenue.total_events || 0} | Avg: ${analytics?.revenue.avg_transaction?.toFixed(2) || '0.00'}
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Conversion Rate</div>
            <div className={styles.metricValue}>
              {analytics?.users.total_users
                ? (((analytics.users.pro_users + analytics.users.enterprise_users) / analytics.users.total_users) * 100).toFixed(1)
                : 0}%
            </div>
            <div className={styles.metricBreakdown}>
              Paid: {(analytics?.users.pro_users || 0) + (analytics?.users.enterprise_users || 0)}
            </div>
          </div>
        </div>

        {/* Top Niches Section */}
        {analytics?.topNiches && analytics.topNiches.length > 0 && (
          <div className={styles.section}>
            <h2>Top Niches</h2>
            <div className={styles.nichesList}>
              {analytics.topNiches.slice(0, 5).map((niche, index) => (
                <div key={index} className={styles.nicheItem}>
                  <span>{niche.niche}</span>
                  <span className={styles.nicheCount}>{niche.channel_count} channels</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Actions Section */}
        {analytics?.recentActions && analytics.recentActions.length > 0 && (
          <div className={styles.section}>
            <h2>Recent Admin Actions</h2>
            <div className={styles.actionsTable}>
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Admin</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentActions.slice(0, 10).map((action, index) => (
                    <tr key={index}>
                      <td>{action.action}</td>
                      <td>{action.resource_type}</td>
                      <td>{action.admin_email}</td>
                      <td>{new Date(action.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={styles.navigation}>
          <button
            className={styles.navButton}
            onClick={() => router.push('/admin/users')}
          >
            Manage Users
          </button>
          <button
            className={styles.navButton}
            onClick={() => router.push('/admin/subscriptions')}
          >
            Manage Subscriptions
          </button>
          <button
            className={styles.navButton}
            onClick={() => router.push('/admin/channels')}
          >
            Manage Channels
          </button>
          <button
            className={styles.navButton}
            onClick={() => router.push('/admin/logs')}
          >
            View Activity Logs
          </button>
          <button
            className={styles.navButton}
            onClick={() => router.push('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    </>
  );
}
