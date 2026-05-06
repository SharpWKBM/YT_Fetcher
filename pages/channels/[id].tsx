import { GetServerSideProps } from 'next';
import Link from 'next/link';
import Meta from '@/components/SEO/Meta';
import Breadcrumbs from '@/components/Breadcrumbs/Breadcrumbs';
import styles from '@/styles/ChannelProfile.module.css';
import { getChannelById, getRelatedChannels } from '@/lib/db';
import { useState } from 'react';

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

interface ChannelProfileProps {
  channel: Channel;
  relatedChannels: Channel[];
  error?: string;
}

export default function ChannelProfile({ channel, relatedChannels, error }: ChannelProfileProps) {

  if (error) {
    return (
      <>
        <Meta
          title="Channel Not Found - YouTube Channel Finder"
          description="The requested channel could not be found."
          noindex={true}
        />
        <main className={styles.container}>
          <div className={styles.error}>{error}</div>
          <Link href="/" className={styles.backLink}>
            ← Back to Search
          </Link>
        </main>
      </>
    );
  }

  const channelUrl = channel.channel_url;
  const formatSubscribers = (subs: number) => {
    if (subs >= 1000000) return `${(subs / 1000000).toFixed(1)}M`;
    if (subs >= 1000) return `${(subs / 1000).toFixed(1)}K`;
    return subs.toString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInactivityBadge = (months: number | null) => {
    if (!months) return null;
    if (months >= 12) {
      return <span className={`${styles.inactiveBadge} ${styles.danger}`}>Inactive {months}+ months</span>;
    }
    if (months >= 6) {
      return <span className={`${styles.inactiveBadge} ${styles.warning}`}>Inactive {months} months</span>;
    }
    return null;
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Organization',
      name: channel.title,
      url: channelUrl,
      logo: channel.thumbnail_url,
      sameAs: [channelUrl],
      description: `YouTube channel with ${formatSubscribers(channel.subscribers)} subscribers. ${
        channel.language ? `Language: ${channel.language}.` : ''
      } ${channel.region ? `Region: ${channel.region}.` : ''}`,
    },
  };

  return (
    <>
      <Meta
        title={`${channel.title} - YouTube Channel Profile | ${formatSubscribers(channel.subscribers)} Subscribers`}
        description={`Explore ${channel.title}, a YouTube channel with ${formatSubscribers(
          channel.subscribers
        )} subscribers. ${channel.language ? `Language: ${channel.language}.` : ''} ${
          channel.monthsInactive
            ? `Inactive for ${channel.monthsInactive} months.`
            : 'Last upload: ' + formatDate(channel.last_upload_date)
        }`}
        image={channel.thumbnail_url || undefined}
        type="profile"
        schema={schema}
      />

      <main className={styles.container}>
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Channels', href: '/' },
            { label: channel.title, href: `/channels/${channel.id}` },
          ]}
        />

        <div className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← Back to Search
          </Link>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            {channel.thumbnail_url && (
              <img src={channel.thumbnail_url} alt={channel.title} className={styles.thumbnail} />
            )}
            <div className={styles.profileInfo}>
              <h1 className={styles.channelTitle}>{channel.title}</h1>
              <a href={channelUrl} target="_blank" rel="noopener noreferrer" className={styles.channelUrl}>
                View on YouTube →
              </a>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Subscribers</div>
              <div className={styles.statValue}>{formatSubscribers(channel.subscribers)}</div>
            </div>

            {channel.language && (
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Language</div>
                <div className={styles.statValue}>{channel.language}</div>
              </div>
            )}

            {channel.region && (
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Region</div>
                <div className={styles.statValue}>{channel.region}</div>
              </div>
            )}

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Last Upload</div>
              <div className={styles.statValue}>{formatDate(channel.last_upload_date)}</div>
              {getInactivityBadge(channel.monthsInactive)}
            </div>
          </div>
        </div>

        {relatedChannels.length > 0 && (
          <div className={styles.relatedSection}>
            <h2>Similar Channels</h2>
            <div className={styles.relatedGrid}>
              {relatedChannels.map((related) => (
                <Link
                  key={related.id}
                  href={`/channels/${related.id}`}
                  className={styles.relatedCard}
                >
                  {related.thumbnail_url && (
                    <img
                      src={related.thumbnail_url}
                      alt={related.title}
                      className={styles.relatedThumbnail}
                    />
                  )}
                  <div className={styles.relatedTitle}>{related.title}</div>
                  <div className={styles.relatedStats}>
                    {formatSubscribers(related.subscribers)} subscribers
                    {related.language && ` • ${related.language}`}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  try {
    const channel = await getChannelById(id);

    if (!channel) {
      return {
        props: {
          channel: null,
          relatedChannels: [],
          error: 'Channel not found',
        },
      };
    }

    // Calculate months inactive
    let monthsInactive = null;
    if (channel.last_upload_date) {
      const lastUpload = new Date(channel.last_upload_date);
      const now = new Date();
      const diffMonths =
        (now.getFullYear() - lastUpload.getFullYear()) * 12 + (now.getMonth() - lastUpload.getMonth());
      monthsInactive = diffMonths;
    }

    // Get related channels (same language/region, similar subscriber count)
    const relatedChannels = await getRelatedChannels(channel.id, {
      language: channel.language,
      region: channel.region,
      subscriberRange: [channel.subscribers * 0.5, channel.subscribers * 2],
      limit: 6,
    });

    const relatedWithInactivity = relatedChannels.map((related) => {
      let relatedMonthsInactive = null;
      if (related.last_upload_date) {
        const lastUpload = new Date(related.last_upload_date);
        const now = new Date();
        const diffMonths =
          (now.getFullYear() - lastUpload.getFullYear()) * 12 + (now.getMonth() - lastUpload.getMonth());
        relatedMonthsInactive = diffMonths;
      }
      return { ...related, monthsInactive: relatedMonthsInactive };
    });

    return {
      props: {
        channel: { ...channel, monthsInactive },
        relatedChannels: relatedWithInactivity,
      },
    };
  } catch (error) {
    console.error('Error fetching channel:', error);
    return {
      props: {
        channel: null,
        relatedChannels: [],
        error: 'Failed to load channel',
      },
    };
  }
};
