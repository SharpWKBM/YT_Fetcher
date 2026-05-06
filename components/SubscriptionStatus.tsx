import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './SubscriptionStatus.module.css';

interface SubscriptionStatusData {
  isActive: boolean;
  status: string | null;
  isTrialing: boolean;
  trialDaysRemaining: number;
  isAdmin: boolean;
  currentPeriodEnd: string | null;
}

export default function SubscriptionStatus() {
  const { data: session } = useSession();
  const [subStatus, setSubStatus] = useState<SubscriptionStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    fetch('/api/user/subscription-status')
      .then(res => res.json())
      .then(data => {
        setSubStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading subscription status...</div>
      </div>
    );
  }

  if (!session?.user || !subStatus) {
    return null;
  }

  if (subStatus.isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.status + ' ' + styles.admin}>
          <div className={styles.badge}>
            <span className={styles.icon}>👑</span>
            <span className={styles.label}>Admin</span>
          </div>
          <p className={styles.description}>Full access to all features</p>
        </div>
      </div>
    );
  }

  if (subStatus.isTrialing) {
    return (
      <div className={styles.container}>
        <div className={styles.status + ' ' + styles.trial}>
          <div className={styles.badge}>
            <span className={styles.icon}>⏰</span>
            <span className={styles.label}>Trial Active</span>
          </div>
          <p className={styles.description}>
            {subStatus.trialDaysRemaining} days remaining
          </p>
          <a href="/pricing" className={styles.upgradeLink}>
            Upgrade to Pro →
          </a>
        </div>
      </div>
    );
  }

  if (subStatus.isActive) {
    const periodEnd = subStatus.currentPeriodEnd 
      ? new Date(subStatus.currentPeriodEnd).toLocaleDateString()
      : 'N/A';

    return (
      <div className={styles.container}>
        <div className={styles.status + ' ' + styles.active}>
          <div className={styles.badge}>
            <span className={styles.icon}>✓</span>
            <span className={styles.label}>Active Subscription</span>
          </div>
          <p className={styles.description}>
            Renews on {periodEnd}
          </p>
          <a href="/api/stripe/portal" className={styles.manageLink}>
            Manage Subscription
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.status + ' ' + styles.inactive}>
        <div className={styles.badge}>
          <span className={styles.icon}>🔒</span>
          <span className={styles.label}>No Active Subscription</span>
        </div>
        <p className={styles.description}>
          Subscribe to access all features
        </p>
        <a href="/pricing" className={styles.subscribeLink}>
          View Plans →
        </a>
      </div>
    </div>
  );
}
