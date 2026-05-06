import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import styles from '@/styles/AdminSubscriptions.module.css';

interface Subscription {
  id: string;
  email: string;
  name: string;
  tier: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminSubscriptions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchSubscriptions();
    }
  }, [status, router, currentPage, tierFilter]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (tierFilter) {
        params.append('tier', tierFilter);
      }

      const response = await fetch(`/api/admin/subscriptions?${params}`);

      if (response.status === 403) {
        router.push('/');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Name', 'Tier', 'Customer ID', 'Subscription ID', 'Created'];
    const rows = subscriptions.map(sub => [
      sub.email,
      sub.name || '',
      sub.tier,
      sub.stripe_customer_id,
      sub.stripe_subscription_id,
      new Date(sub.created_at).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCancelSubscription = async (userId: string, userEmail: string) => {
    if (!confirm(`Cancel subscription for ${userEmail}?`)) {
      return;
    }

    const reason = prompt('Reason for cancellation:');
    if (!reason) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/subscriptions/${userId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      alert('Subscription cancelled successfully');
      fetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async (userId: string, userEmail: string) => {
    const amountStr = prompt(`Refund amount for ${userEmail} (USD):`);
    if (!amountStr) {
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount');
      return;
    }

    const reason = prompt('Reason for refund:');
    if (!reason) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/subscriptions/${userId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      alert('Refund processed successfully');
      fetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setActionLoading(null);
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
        <title>Subscription Management - Admin</title>
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Subscription Management</h1>
          <button className={styles.backButton} onClick={() => router.push('/admin')}>
            Back to Dashboard
          </button>
        </header>

        <div className={styles.controls}>
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="">All Tiers</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>

          <button onClick={exportToCSV} className={styles.exportButton}>
            Export to CSV
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Tier</th>
                <th>Customer ID</th>
                <th>Subscription ID</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.email}</td>
                  <td>{sub.name || '-'}</td>
                  <td>
                    <span className={`${styles.tierBadge} ${styles[sub.tier]}`}>
                      {sub.tier}
                    </span>
                  </td>
                  <td className={styles.monospace}>{sub.stripe_customer_id}</td>
                  <td className={styles.monospace}>{sub.stripe_subscription_id}</td>
                  <td>{new Date(sub.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleCancelSubscription(sub.id, sub.email)}
                        disabled={actionLoading === sub.id}
                        className={styles.cancelButton}
                      >
                        {actionLoading === sub.id ? 'Processing...' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => handleRefund(sub.id, sub.email)}
                        disabled={actionLoading === sub.id}
                        className={styles.refundButton}
                      >
                        Refund
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.pageButton}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total subscriptions)
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
              className={styles.pageButton}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
