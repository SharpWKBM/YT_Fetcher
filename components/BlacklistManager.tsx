import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './BlacklistManager.module.css';

interface BlacklistedChannel {
  id: string;
  channel_id: string;
  user_id: string;
  reason: string | null;
  created_at: string;
  title: string;
  thumbnail_url: string | null;
  channel_url: string;
}

export default function BlacklistManager() {
  const { data: session } = useSession();
  const [blacklist, setBlacklist] = useState<BlacklistedChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchBlacklist();
    }
  }, [session]);

  const fetchBlacklist = async () => {
    try {
      const response = await fetch('/api/blacklist');
      const data = await response.json();
      if (data.success) {
        setBlacklist(data.blacklist);
      }
    } catch (error) {
      console.error('Error fetching blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (channelId: string) => {
    try {
      const response = await fetch('/api/blacklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      });

      if (response.ok) {
        setBlacklist(prev => prev.filter(item => item.channel_id !== channelId));
      }
    } catch (error) {
      console.error('Error removing from blacklist:', error);
    }
  };

  if (!session?.user) return null;

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading blacklist...</p>
      </div>
    );
  }

  if (blacklist.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>No blacklisted channels</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {blacklist.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.info}>
              {item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className={styles.thumbnail}
                />
              )}
              <div className={styles.details}>
                <a
                  href={item.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.title}
                >
                  {item.title}
                </a>
                {item.reason && (
                  <p className={styles.reason}>Reason: {item.reason}</p>
                )}
                <p className={styles.date}>
                  Blacklisted on {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleRemove(item.channel_id)}
              className={styles.removeBtn}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
