import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';

interface Channel {
  id: string;
  title: string;
  subscribers: number;
  language: string | null;
  region: string | null;
  last_upload_date: string | null;
  channel_url: string;
  thumbnail_url: string | null;
  favorited_at: string;
}

export default function Favorites() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchFavorites();
    }
  }, [status, router]);

  const fetchFavorites = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/favorites');
      const data = await response.json();

      if (data.favorites) {
        setFavorites(data.favorites);
      } else {
        setError('Failed to fetch favorites');
      }
    } catch (err) {
      setError('Network error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (channelId: string) => {
    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(ch => ch.id !== channelId));
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInactiveBadgeClass = (lastUpload: string | null) => {
    if (!lastUpload) return styles.inactiveBadge;

    const uploadDate = new Date(lastUpload);
    const now = new Date();
    const monthsDiff = (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    return `${styles.inactiveBadge} ${monthsDiff >= 12 ? styles.danger : styles.warning}`;
  };

  const getMonthsInactive = (lastUpload: string | null) => {
    if (!lastUpload) return null;

    const uploadDate = new Date(lastUpload);
    const now = new Date();
    const monthsDiff = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    return monthsDiff;
  };

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <Head>
        <title>My Favorites - YouTube Channel Finder</title>
        <meta name="description" content="Your favorited YouTube channels" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>My Favorites</h1>
          <div className={styles.headerActions}>
            <button
              onClick={() => router.push('/')}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              ← Back to Search
            </button>
          </div>
        </div>

        <p className={styles.description}>
          Your bookmarked YouTube channels. Click the remove button to unfavorite a channel.
        </p>

        {/* Results Header */}
        <div className={styles.resultsHeader}>
          <div className={styles.resultsCount}>
            {loading ? 'Loading...' : `${favorites.length} favorite${favorites.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Channel</th>
                <th style={{ textAlign: 'right' }}>Subscribers</th>
                <th>Last Upload</th>
                <th style={{ textAlign: 'center' }}>Inactive</th>
                <th style={{ textAlign: 'center' }}>Language</th>
                <th style={{ textAlign: 'center' }}>Favorited</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading Skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <div className={styles.skeletonRow}>
                        <div className={`${styles.skeletonCircle} skeleton`}></div>
                        <div className={`${styles.skeletonText} ${styles.skeletonTextLong} skeleton`}></div>
                      </div>
                    </td>
                    <td>
                      <div className={`${styles.skeletonText} ${styles.skeletonTextShort} skeleton`}></div>
                    </td>
                    <td>
                      <div className={`${styles.skeletonText} ${styles.skeletonTextMedium} skeleton`}></div>
                    </td>
                    <td>
                      <div className={`${styles.skeletonText} ${styles.skeletonTextShort} skeleton`}></div>
                    </td>
                    <td>
                      <div className={`${styles.skeletonText} ${styles.skeletonTextShort} skeleton`}></div>
                    </td>
                    <td>
                      <div className={`${styles.skeletonText} ${styles.skeletonTextShort} skeleton`}></div>
                    </td>
                    <td>
                      <div className={`${styles.skeletonText} ${styles.skeletonTextShort} skeleton`}></div>
                    </td>
                  </tr>
                ))
              ) : favorites.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No favorites yet. Go to the search page and click the star icon to add channels to your favorites.
                  </td>
                </tr>
              ) : (
                favorites.map((channel) => (
                  <tr key={channel.id}>
                    <td>
                      <div className={styles.channelCell}>
                        {channel.thumbnail_url && (
                          <img
                            src={channel.thumbnail_url}
                            alt={channel.title}
                            className={styles.channelThumbnail}
                          />
                        )}
                        <a
                          href={channel.channel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.channelLink}
                        >
                          {channel.title}
                        </a>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatNumber(channel.subscribers)}
                    </td>
                    <td>
                      {formatDate(channel.last_upload_date)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={getInactiveBadgeClass(channel.last_upload_date)}>
                        {getMonthsInactive(channel.last_upload_date) !== null
                          ? `${getMonthsInactive(channel.last_upload_date)} mo`
                          : 'N/A'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {channel.language?.toUpperCase() || 'N/A'}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                      {formatDate(channel.favorited_at)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => removeFavorite(channel.id)}
                        className={styles.removeBtn}
                        title="Remove from favorites"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
