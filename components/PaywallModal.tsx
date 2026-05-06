import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './PaywallModal.module.css';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export default function PaywallModal({ isOpen, onClose, feature = 'this feature' }: PaywallModalProps) {
  const { data: session } = useSession();
  const [trialDays, setTrialDays] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !session?.user) return;

    fetch('/api/user/subscription-status')
      .then(res => res.json())
      .then(data => {
        if (data.isTrialing) {
          setTrialDays(data.trialDaysRemaining);
        }
      })
      .catch(() => {});
  }, [isOpen, session]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modal} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
          ×
        </button>

        <div className={styles.icon}>🔒</div>
        
        <h2>Subscription Required</h2>
        
        <p className={styles.message}>
          Access to {feature} requires an active subscription.
        </p>

        {trialDays > 0 && (
          <div className={styles.trialInfo}>
            <span className={styles.trialIcon}>⏰</span>
            <span>You have {trialDays} days left in your trial</span>
          </div>
        )}

        <div className={styles.benefits}>
          <h3>Subscription Benefits:</h3>
          <ul>
            <li>✓ Unlimited channel searches</li>
            <li>✓ Advanced filtering options</li>
            <li>✓ Export data to CSV</li>
            <li>✓ API access</li>
            <li>✓ Bulk operations</li>
            <li>✓ Priority support</li>
          </ul>
        </div>

        <div className={styles.actions}>
          <a href="/pricing" className={styles.upgradeBtn}>
            View Plans
          </a>
          <button onClick={onClose} className={styles.cancelBtn}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
