import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession, signIn, signOut } from 'next-auth/react';

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

export default function Home() {
  const { data: session, status } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [channelsViewed, setChannelsViewed] = useState(0);
  const [tierLimit, setTierLimit] = useState(10);

  // Filters
  const [minSubs, setMinSubs] = useState(10000);
  const [maxSubs, setMaxSubs] = useState(1000000);
  const [inactiveMonths, setInactiveMonths] = useState(6);
  const [sortBy, setSortBy] = useState<'subscribers' | 'last_upload_date'>('subscribers');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status !== 'loading') {
      fetchChannels();
    }
  }, [minSubs, maxSubs, inactiveMonths, sortBy, order, page, status]);

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
        language: 'ru',
        region: 'CIS',
      });

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

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return '#7c3aed';
      case 'pro': return '#2563eb';
      default: return '#64748b';
    }
  };

  const getTierName = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  return (
    <>
      <Head>
        <title>YouTube Channel Finder - Undervalued Russian Channels</title>
        <meta name="description" content="Find inactive YouTube channels with high subscriber counts" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Header with Auth */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h1 style={{ margin: 0 }}>YouTube Channel Finder</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {session ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    background: getTierBadgeColor(userTier),
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {getTierName(userTier)}
                  </span>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    {channelsViewed}/{tierLimit === Infinity ? '∞' : tierLimit} viewed
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                    />
                  )}
                  <span style={{ fontSize: '14px' }}>{session.user?.name}</span>
                  <button
                    onClick={() => signOut()}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <p style={{ color: '#666', marginBottom: '30px' }}>
          Find undervalued Russian-speaking channels with high subscribers but inactive uploads
        </p>

        {/* Tier Upgrade Banner */}
        {session && userTier === 'free' && channelsViewed >= tierLimit && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0' }}>Upgrade to Pro</h3>
              <p style={{ margin: 0, opacity: 0.9 }}>
                You've reached your free tier limit. Upgrade to view 100 channels/month + advanced features.
              </p>
            </div>
            <button style={{
              padding: '10px 20px',
              borderRadius: '4px',
              border: 'none',
              background: 'white',
              color: '#667eea',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}>
              Upgrade - $29/mo
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Min Subscribers
            </label>
            <input
              type="number"
              value={minSubs}
              onChange={(e) => { setMinSubs(Number(e.target.value)); setPage(1); }}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Max Subscribers
            </label>
            <input
              type="number"
              value={maxSubs}
              onChange={(e) => { setMaxSubs(Number(e.target.value)); setPage(1); }}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Inactive For (months)
            </label>
            <select
              value={inactiveMonths}
              onChange={(e) => { setInactiveMonths(Number(e.target.value)); setPage(1); }}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div style={{ marginBottom: '15px', color: '#666' }}>
          {loading ? 'Loading...' : `Found ${formatNumber(total)} channels`}
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fee',
            color: '#c00',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ background: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Channel</th>
                <th
                  style={{ padding: '12px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('subscribers')}
                >
                  Subscribers {sortBy === 'subscribers' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th
                  style={{ padding: '12px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('last_upload_date')}
                >
                  Last Upload {sortBy === 'last_upload_date' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Inactive</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Language</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((channel) => (
                <tr key={channel.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {channel.thumbnail_url && (
                        <img
                          src={channel.thumbnail_url}
                          alt={channel.title}
                          style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                        />
                      )}
                      <a
                        href={channel.channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: '500' }}
                      >
                        {channel.title}
                      </a>
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {formatNumber(channel.subscribers)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {formatDate(channel.last_upload_date)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      background: channel.monthsInactive && channel.monthsInactive >= 12 ? '#fee' : '#eff6ff',
                      color: channel.monthsInactive && channel.monthsInactive >= 12 ? '#c00' : '#2563eb',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {channel.monthsInactive !== null ? `${channel.monthsInactive} mo` : 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {channel.language?.toUpperCase() || 'RU'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            marginTop: '20px',
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                background: page === 1 ? '#f5f5f5' : 'white',
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                background: page === totalPages ? '#f5f5f5' : 'white',
                cursor: page === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '60px',
          paddingTop: '20px',
          borderTop: '1px solid #eee',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          <p>
            <strong>Pricing:</strong> Free (10 channels/mo) • Pro $29/mo (100 channels/mo) • Enterprise $99/mo (Unlimited)
          </p>
        </div>
      </main>
    </>
  );
}
