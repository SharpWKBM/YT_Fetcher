import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './SubscriptionBanner.module.css';

interface SubscriptionStatus {
  isActive: boolean;
  status: string | null;
  isTrialing: boolean;
  trialDaysRemaining: number;
  isAdmin: boolean;
}

export default function SubscriptionBanner() {
  const { data: session } = useSession();
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
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

  if (loading || !session?.user || !subStatus) return null;
  if (subStatus.isAdmin || subStatus.isActive) return null;

  if (subStatus.isTrialing) {
    return (
      <div className={styles.banner + ' ' + styles.trial}>
        <div className={styles.content}>
          <span className={styles.icon}>⏰</span>
          <div className={styles.text}>
            <strong>Trial Active</strong>
            <span>{subStatus.trialDaysRemaining} days remaining</span>
          </div>
          <a href="/pricing" className={styles.upgradeBtn}>
            Upgrade Now
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.banner + ' ' + styles.expired}>
      <div className={styles.content}>
        <span className={styles.icon}>🔒</span>
        <div className={styles.text}>
          <strong>Subscription Required</strong>
          <span>Subscribe to continue accessing channels</span>
        </div>
        <a href="/pricing" className={styles.upgradeBtn}>
          Subscribe
        </a>
      </div>
    </div>
  );
}
