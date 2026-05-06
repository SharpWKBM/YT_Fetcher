import { useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './BlacklistButton.module.css';

interface BlacklistButtonProps {
  channelId: string;
  channelTitle: string;
  isBlacklisted?: boolean;
  onBlacklistChange?: (isBlacklisted: boolean) => void;
}

export default function BlacklistButton({ 
  channelId, 
  channelTitle, 
  isBlacklisted: initialBlacklisted = false,
  onBlacklistChange 
}: BlacklistButtonProps) {
  const { data: session } = useSession();
  const [isBlacklisted, setIsBlacklisted] = useState(initialBlacklisted);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');

  if (!session?.user) return null;

  const handleToggle = async () => {
    if (!isBlacklisted) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/blacklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      });

      if (response.ok) {
        setIsBlacklisted(false);
        onBlacklistChange?.(false);
      }
    } catch (error) {
      console.error('Error removing from blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBlacklist = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, reason: reason.trim() || null }),
      });

      if (response.ok) {
        setIsBlacklisted(true);
        setShowConfirm(false);
        setReason('');
        onBlacklistChange?.(true);
      }
    } catch (error) {
      console.error('Error blacklisting channel:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`${styles.btn} ${isBlacklisted ? styles.blacklisted : ''}`}
        title={isBlacklisted ? 'Remove from blacklist' : 'Blacklist this channel'}
      >
        {isBlacklisted ? '✓ Blacklisted' : 'Blacklist'}
      </button>

      {showConfirm && (
        <div className={styles.modal} onClick={() => setShowConfirm(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Blacklist Channel</h3>
            <p>Are you sure you want to blacklist <strong>{channelTitle}</strong>?</p>
            <p className={styles.note}>This channel will be hidden from all search results.</p>
            
            <div className={styles.formGroup}>
              <label htmlFor="reason">Reason (optional)</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you blacklisting this channel?"
                rows={3}
                maxLength={200}
              />
            </div>

            <div className={styles.actions}>
              <button
                onClick={handleConfirmBlacklist}
                disabled={loading}
                className={styles.confirmBtn}
              >
                {loading ? 'Blacklisting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
