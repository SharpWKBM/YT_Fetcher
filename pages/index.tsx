import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession, signIn, signOut } from 'next-auth/react';
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
  monthsInactive: number | null;
}

interface ApiResponse {
  success: boolean;
  data: Channel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  userTier?: string;
  channelsViewedThisMonth?: number;
  tierLimit?: number;
}

interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: string;
  created_at: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [channelsViewed, setChannelsViewed] = useState(0);
  const [tierLimit, setTierLimit] = useState(10);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Filters
  const [minSubs, setMinSubs] = useState(0);
  const [maxSubs, setMaxSubs] = useState(10000000);
  const [language, setLanguage] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [inactiveMonths, setInactiveMonths] = useState(0);
  const [sortBy, setSortBy] = useState<'subscribers' | 'last_upload_date'>('subscribers');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status !== 'loading') {
      fetchChannels();
    }
  }, [minSubs, maxSubs, language, region, inactiveMonths, sortBy, order, page, status]);

  const fetchChannels = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        minSubs: minSubs.toString(),
        maxSubs: maxSubs.toString(),
        inactiveMonths: inactiveMonths.toString(),
        sortBy,
        order,
        page: page.toString(),
        limit: '50',
      });

      // Only add language and region if they are selected
      if (language) params.append('language', language);
      if (region) params.append('region', region);

      const response = await fetch(`/api/channels?${params}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setChannels(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
        if (data.userTier) setUserTier(data.userTier);
        if (data.channelsViewedThisMonth !== undefined) setChannelsViewed(data.channelsViewedThisMonth);
        if (data.tierLimit) setTierLimit(data.tierLimit);
      } else {
        setError('Failed to fetch channels');
      }
    } catch (err) {
      setError('Network error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: 'subscribers' | 'last_upload_date') => {
    if (sortBy === column) {
      setOrder(order === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSortBy(column);
      setOrder('DESC');
    }
    setPage(1);
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

  const getTierClass = (tier: string) => {
    return `${styles.tierBadge} ${styles[tier]}`;
  };

  const getInactiveBadgeClass = (months: number | null) => {
    if (!months) return styles.inactiveBadge;
    return `${styles.inactiveBadge} ${months >= 12 ? styles.danger : styles.warning}`;
  };

  // Preset filter combinations
  const applyPreset = (preset: string) => {
    setPage(1);
    switch (preset) {
      case 'all':
        setMinSubs(0);
        setMaxSubs(10000000);
        setLanguage('');
        setRegion('');
        setInactiveMonths(0);
        break;
      case 'abandoned-large':
        setMinSubs(100000);
        setMaxSubs(10000000);
        setLanguage('');
        setRegion('');
        setInactiveMonths(12);
        break;
      case 'abandoned-medium':
        setMinSubs(10000);
        setMaxSubs(100000);
        setLanguage('');
        setRegion('');
        setInactiveMonths(6);
        break;
      case 'russian-inactive':
        setMinSubs(10000);
        setMaxSubs(10000000);
        setLanguage('ru');
        setRegion('CIS');
        setInactiveMonths(6);
        break;
      case 'english-inactive':
        setMinSubs(10000);
        setMaxSubs(10000000);
        setLanguage('en');
        setRegion('US');
        setInactiveMonths(6);
        break;
    }
  };

  // Fetch saved searches
  const fetchSavedSearches = async () => {
    if (!session) return;
    try {
      const response = await fetch('/api/saved-searches');
      const data = await response.json();
      if (data.searches) {
        setSavedSearches(data.searches);
      }
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    }
  };

  // Save current search
  const saveCurrentSearch = async () => {
    if (!session || !searchName.trim()) return;

    const filters = {
      minSubs,
      maxSubs,
      language,
      region,
      inactiveMonths,
      sortBy,
      order,
    };

    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchName, filters }),
      });

      if (response.ok) {
        setSearchName('');
        setShowSaveDialog(false);
        fetchSavedSearches();
      }
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  // Load saved search
  const loadSavedSearch = (search: SavedSearch) => {
    const filters = JSON.parse(search.filters);
    setMinSubs(filters.minSubs || 0);
    setMaxSubs(filters.maxSubs || 10000000);
    setLanguage(filters.language || '');
    setRegion(filters.region || '');
    setInactiveMonths(filters.inactiveMonths || 0);
    setSortBy(filters.sortBy || 'subscribers');
    setOrder(filters.order || 'DESC');
    setPage(1);
    setShowSavedSearches(false);
  };

  // Delete saved search
  const deleteSavedSearch = async (searchId: string) => {
    if (!session) return;
    try {
      const response = await fetch('/api/saved-searches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId }),
      });

      if (response.ok) {
        fetchSavedSearches();
      }
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  };

  // Fetch saved searches on mount
  useEffect(() => {
    if (session) {
      fetchSavedSearches();
    }
  }, [session]);

  return (
    <>
      <Head>
        <title>YouTube Channel Finder - Discover Abandoned Channels</title>
        <meta name="description" content="Find inactive YouTube channels with high subscriber counts in the Russian-speaking market" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>YouTube Channel Finder</h1>
          <div className={styles.headerActions}>
            {session ? (
              <>
                <div className={styles.userInfo}>
                  <span className={getTierClass(userTier)}>
                    {userTier}
                  </span>
                  <span className={styles.usageCounter}>
                    {channelsViewed}/{tierLimit === Infinity ? '∞' : tierLimit} viewed
                  </span>
                </div>
                <div className={styles.savedSearchesWrapper}>
                  <button
                    onClick={() => setShowSavedSearches(!showSavedSearches)}
                    className={`${styles.btn} ${styles.btnSecondary}`}
                  >
                    My Searches ({savedSearches.length})
                  </button>
                  {showSavedSearches && (
                    <div className={styles.dropdown}>
                      {savedSearches.length === 0 ? (
                        <div className={styles.dropdownEmpty}>No saved searches yet</div>
                      ) : (
                        savedSearches.map((search) => (
                          <div key={search.id} className={styles.dropdownItem}>
                            <span
                              onClick={() => loadSavedSearch(search)}
                              className={styles.searchName}
                            >
                              {search.name}
                            </span>
                            <button
                              onClick={() => deleteSavedSearch(search.id)}
                              className={styles.deleteBtn}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className={styles.userInfo}>
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className={styles.avatar}
                    />
                  )}
                  <span className={styles.userName}>{session.user?.name}</span>
                  <button
                    onClick={() => signOut()}
                    className={`${styles.btn} ${styles.btnSecondary}`}
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <p className={styles.description}>
          Discover undervalued YouTube channels worldwide with high subscriber counts but inactive uploads. Perfect for acquisition opportunities.
        </p>

        {/* Upgrade Banner */}
        {session && userTier === 'free' && channelsViewed >= tierLimit && (
          <div className={styles.upgradeBanner}>
            <div>
              <h3>Upgrade to Pro</h3>
              <p>
                You've reached your free tier limit. Upgrade to view 100 channels/month plus advanced filtering and export features.
              </p>
            </div>
            <button className={styles.upgradeBtn}>
              Upgrade - $29/mo
            </button>
          </div>
        )}

        {/* Filters */}
        <div className={styles.presets}>
          <button onClick={() => applyPreset('all')} className={styles.presetBtn}>
            All Channels
          </button>
          <button onClick={() => applyPreset('abandoned-large')} className={styles.presetBtn}>
            Abandoned 100K+
          </button>
          <button onClick={() => applyPreset('abandoned-medium')} className={styles.presetBtn}>
            Abandoned 10K-100K
          </button>
          <button onClick={() => applyPreset('russian-inactive')} className={styles.presetBtn}>
            Russian Inactive
          </button>
          <button onClick={() => applyPreset('english-inactive')} className={styles.presetBtn}>
            English Inactive
          </button>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Min Subscribers</label>
            <input
              type="number"
              value={minSubs}
              onChange={(e) => { setMinSubs(Number(e.target.value)); setPage(1); }}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Max Subscribers</label>
            <input
              type="number"
              value={maxSubs}
              onChange={(e) => { setMaxSubs(Number(e.target.value)); setPage(1); }}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Language</label>
            <select
              value={language}
              onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
            >
              <option value="">All Languages</option>
              <option value="en">English</option>
              <option value="ru">Russian</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Region</label>
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPage(1); }}
            >
              <option value="">All Regions</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="CIS">CIS (Russia, Ukraine, etc.)</option>
              <option value="EU">European Union</option>
              <option value="Asia">Asia</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Inactive For</label>
            <select
              value={inactiveMonths}
              onChange={(e) => { setInactiveMonths(Number(e.target.value)); setPage(1); }}
            >
              <option value={0}>Any (including active)</option>
              <option value={3}>3+ months</option>
              <option value={6}>6+ months</option>
              <option value={12}>12+ months</option>
              <option value={24}>24+ months</option>
            </select>
          </div>
        </div>

        {/* Save Search Button */}
        {session && (
          <div className={styles.saveSearchSection}>
            <button
              onClick={() => setShowSaveDialog(true)}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              💾 Save Current Search
            </button>
          </div>
        )}

        {/* Save Search Dialog */}
        {showSaveDialog && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h3>Save Search</h3>
              <input
                type="text"
                placeholder="Enter search name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className={styles.modalInput}
                onKeyPress={(e) => e.key === 'Enter' && saveCurrentSearch()}
              />
              <div className={styles.modalActions}>
                <button
                  onClick={saveCurrentSearch}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={!searchName.trim()}
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowSaveDialog(false); setSearchName(''); }}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className={styles.resultsHeader}>
          <div className={styles.resultsCount}>
            {loading ? 'Loading...' : `Found ${formatNumber(total)} channels`}
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
                <th
                  className={styles.sortable}
                  onClick={() => handleSort('subscribers')}
                  style={{ textAlign: 'right' }}
                >
                  Subscribers {sortBy === 'subscribers' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th
                  className={styles.sortable}
                  onClick={() => handleSort('last_upload_date')}
                >
                  Last Upload {sortBy === 'last_upload_date' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th style={{ textAlign: 'center' }}>Inactive</th>
                <th style={{ textAlign: 'center' }}>Language</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading Skeletons
                Array.from({ length: 5 }).map((_, i) => (
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
                  </tr>
                ))
              ) : channels.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No channels found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                channels.map((channel) => (
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
                      <span className={getInactiveBadgeClass(channel.monthsInactive)}>
                        {channel.monthsInactive !== null ? `${channel.monthsInactive} mo` : 'N/A'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {channel.language?.toUpperCase() || 'RU'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className={styles.pagination}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <p>
            <strong>Pricing:</strong> Free (10 channels/mo) • Pro $29/mo (100 channels/mo) • Enterprise $99/mo (Unlimited)
          </p>
        </div>
      </main>
    </>
  );
}
