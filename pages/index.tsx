import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Meta from '@/components/SEO/Meta';
import styles from '@/styles/Home.module.css';
import ChannelCardV2 from '@/components/ChannelCard/ChannelCardV2';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import TagFilter from '@/components/TagFilter';
import NicheFilter from '@/components/NicheFilter';

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
  isAnonymous?: boolean;
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
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Filters
  const [minSubs, setMinSubs] = useState(0);
  const [maxSubs, setMaxSubs] = useState(10000000);
  const [language, setLanguage] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [inactiveMonths, setInactiveMonths] = useState(0);
  const [lastActivityRange, setLastActivityRange] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [sortBy, setSortBy] = useState<'subscribers' | 'last_upload_date' | 'niche' | 'tag_count'>('subscribers');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status !== 'loading') {
      fetchChannels();
    }
  }, [minSubs, maxSubs, language, region, inactiveMonths, sortBy, order, page, status, lastActivityRange, selectedTags, selectedNiche]);

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
      if (lastActivityRange) params.append('lastActivityRange', lastActivityRange);
      if (selectedNiche) params.append('niche', selectedNiche);
      if (selectedTags.length > 0) {
        selectedTags.forEach(tag => params.append('tags', tag));
      }

      const response = await fetch(`/api/channels?${params}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setChannels(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
        if (data.userTier) setUserTier(data.userTier);
        if (data.channelsViewedThisMonth !== undefined) setChannelsViewed(data.channelsViewedThisMonth);
        if (data.tierLimit) setTierLimit(data.tierLimit);
        if (data.isAnonymous !== undefined) setIsAnonymous(data.isAnonymous);
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

  const handleSort = (column: 'subscribers' | 'last_upload_date' | 'niche' | 'tag_count') => {
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
        setSelectedTags([]);
        setSelectedNiche('');
        break;
      case 'abandoned-large':
        setMinSubs(100000);
        setMaxSubs(10000000);
        setLanguage('');
        setRegion('');
        setInactiveMonths(12);
        setSelectedTags([]);
        setSelectedNiche('');
        break;
      case 'abandoned-medium':
        setMinSubs(10000);
        setMaxSubs(100000);
        setLanguage('');
        setRegion('');
        setInactiveMonths(6);
        setSelectedTags([]);
        setSelectedNiche('');
        break;
      case 'russian-inactive':
        setMinSubs(10000);
        setMaxSubs(10000000);
        setLanguage('ru');
        setRegion('CIS');
        setInactiveMonths(6);
        setSelectedTags([]);
        setSelectedNiche('');
        break;
      case 'english-inactive':
        setMinSubs(10000);
        setMaxSubs(10000000);
        setLanguage('en');
        setRegion('US');
        setInactiveMonths(6);
        setSelectedTags([]);
        setSelectedNiche('');
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
      lastActivityRange,
      selectedTags,
      selectedNiche,
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
    setLastActivityRange(filters.lastActivityRange || '');
    setSelectedTags(filters.selectedTags || []);
    setSelectedNiche(filters.selectedNiche || '');
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
      fetchFavorites();
    }
  }, [session]);

  // Fetch favorites
  const fetchFavorites = async () => {
    if (!session) return;
    try {
      const response = await fetch('/api/favorites');
      const data = await response.json();
      if (data.favorites) {
        const favoriteIds = new Set<string>(data.favorites.map((f: any) => String(f.id)));
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (channelId: string) => {
    if (!session) return;

    const isFavorited = favorites.has(channelId);

    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId }),
        });

        if (response.ok) {
          setFavorites(prev => {
            const newSet = new Set(prev);
            newSet.delete(channelId);
            return newSet;
          });
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId }),
        });

        if (response.ok) {
          setFavorites(prev => new Set(prev).add(channelId));
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <>
      <Meta
        title="Find Inactive YouTube Channels for Sale | YouTube Channel Finder"
        description="Discover abandoned YouTube channels with 10K-1M+ subscribers. Filter by niche, language, and inactivity. Perfect for channel acquisition and growth opportunities."
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "YouTube Channel Finder",
            "description": "Discover inactive YouTube channels with high subscriber counts for acquisition opportunities",
            "url": process.env.NEXT_PUBLIC_BASE_URL || "https://yourdomain.com",
            "applicationCategory": "BusinessApplication",
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "USD",
              "lowPrice": "0",
              "highPrice": "99",
              "offerCount": "3"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is an inactive YouTube channel?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "An inactive YouTube channel is one that hasn't uploaded new content for an extended period (typically 3+ months). These channels may be available for acquisition or collaboration opportunities."
                }
              },
              {
                "@type": "Question",
                "name": "How often is the channel data updated?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our database is updated daily with the latest subscriber counts, upload dates, and channel information. We monitor thousands of channels to ensure you have access to the most current data."
                }
              },
              {
                "@type": "Question",
                "name": "Can I use this tool without signing up?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Anonymous users can browse up to 20 channels per search. Sign up for a free account to view 10 channels per month, save favorites, and access advanced filters."
                }
              },
              {
                "@type": "Question",
                "name": "What's included in the Pro plan?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Pro users get 100 channel views per month, unlimited saved searches, CSV export functionality, priority support, and access to all advanced filters including language, region, and inactivity period."
                }
              },
              {
                "@type": "Question",
                "name": "How do I find channels in a specific niche?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Use our advanced filters to narrow down by subscriber count, language, region, and inactivity period. You can also browse by category to find channels that match your target audience."
                }
              },
              {
                "@type": "Question",
                "name": "Can I export the channel data?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, Pro and Enterprise users can export channel data to CSV format for further analysis. This includes subscriber counts, upload dates, language, region, and direct YouTube links."
                }
              }
            ]
          }
        ]}
      />

      <SubscriptionBanner />

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
                <button
                  onClick={() => window.location.href = '/favorites'}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  ⭐ My Favorites ({favorites.size})
                </button>
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

        {/* Anonymous User Banner */}
        {isAnonymous && (
          <div className={styles.anonymousBanner}>
            <div>
              <h3>🔓 Sign up to unlock full access</h3>
              <p>
                You're viewing limited results. Sign up for free to view 10 channels per month, save favorites, and access advanced filters.
              </p>
            </div>
            <button
              onClick={() => signIn()}
              className={styles.signUpBtn}
            >
              Sign Up Free
            </button>
          </div>
        )}

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

          <div className={styles.filterGroup}>
            <label>Last Activity Range</label>
            <select
              value={lastActivityRange}
              onChange={(e) => { setLastActivityRange(e.target.value); setPage(1); }}
            >
              <option value="">All Channels</option>
              <option value="1-3mo">1-3 months ago</option>
              <option value="3-6mo">3-6 months ago</option>
              <option value="6-12mo">6-12 months ago</option>
              <option value="12-24mo">12-24 months ago</option>
              <option value="24+mo">24+ months ago (dormant)</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
            >
              <option value="subscribers">Subscribers</option>
              <option value="last_upload_date">Last Upload Date</option>
              <option value="niche">Niche</option>
              <option value="tag_count">Tag Count</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Order</label>
            <select
              value={order}
              onChange={(e) => { setOrder(e.target.value as 'ASC' | 'DESC'); setPage(1); }}
            >
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </div>
        </div>

        {/* Tag and Niche Filters */}
        <div className={styles.advancedFilters}>
          <TagFilter
            selectedTags={selectedTags}
            onTagsChange={(tags) => { setSelectedTags(tags); setPage(1); }}
          />
          <NicheFilter
            selectedNiche={selectedNiche}
            onNicheChange={(niche) => { setSelectedNiche(niche); setPage(1); }}
          />
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

        {/* Channel Grid */}
        <div className={styles.channelGrid}>
          {loading ? (
            // Loading Skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <ChannelCardV2
                key={i}
                channel={{
                  id: `skeleton-${i}`,
                  title: 'Loading...',
                  subscribers: 0,
                  language: null,
                  region: null,
                  last_upload_date: null,
                  channel_url: '#',
                  thumbnail_url: null,
                  monthsInactive: null,
                }}
                index={i}
              />
            ))
          ) : channels.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No channels found. Try adjusting your filters.</p>
            </div>
          ) : (
            channels.map((channel, index) => (
              <ChannelCardV2
                key={channel.id}
                channel={channel}
                isFavorite={favorites.has(channel.id)}
                onToggleFavorite={session ? toggleFavorite : undefined}
                index={index}
              />
            ))
          )}
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

        {/* FAQ Section */}
        <div className={styles.faqSection}>
          <h2>Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h3>What is an inactive YouTube channel?</h3>
              <p>
                An inactive YouTube channel is one that hasn't uploaded new content for an extended period (typically 3+ months).
                These channels may be available for acquisition or collaboration opportunities.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>How often is the channel data updated?</h3>
              <p>
                Our database is updated daily with the latest subscriber counts, upload dates, and channel information.
                We monitor thousands of channels to ensure you have access to the most current data.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>Can I use this tool without signing up?</h3>
              <p>
                Yes! Anonymous users can browse up to 20 channels per search. Sign up for a free account to view 10 channels
                per month, save favorites, and access advanced filters.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>What's included in the Pro plan?</h3>
              <p>
                Pro users get 100 channel views per month, unlimited saved searches, CSV export functionality,
                priority support, and access to all advanced filters including language, region, and inactivity period.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>How do I find channels in a specific niche?</h3>
              <p>
                Use our advanced filters to narrow down by subscriber count, language, region, and inactivity period.
                You can also browse by category to find channels that match your target audience.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>Can I export the channel data?</h3>
              <p>
                Yes, Pro and Enterprise users can export channel data to CSV format for further analysis.
                This includes subscriber counts, upload dates, language, region, and direct YouTube links.
              </p>
            </div>
          </div>
        </div>

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
