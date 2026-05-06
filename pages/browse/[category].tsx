import { GetServerSideProps } from 'next';
import Link from 'next/link';
import Meta from '@/components/SEO/Meta';
import Breadcrumbs from '@/components/Breadcrumbs/Breadcrumbs';
import styles from '@/styles/Home.module.css';
import { getChannels } from '@/lib/db';
import { useState } from 'react';

interface Channel {
  id: string;
  title: string;
  subscribers: number;
  language: string | null;
  region: string | null;
  last_upload_date: string | null;
  thumbnail_url: string | null;
  monthsInactive: number | null;
}

interface BrowseCategoryProps {
  category: string;
  channels: Channel[];
  total: number;
  page: number;
  totalPages: number;
}

const CATEGORIES = {
  'inactive-3-6': { title: 'Inactive 3-6 Months', inactiveMonths: 3, maxInactive: 6 },
  'inactive-6-12': { title: 'Inactive 6-12 Months', inactiveMonths: 6, maxInactive: 12 },
  'inactive-12plus': { title: 'Inactive 12+ Months', inactiveMonths: 12, maxInactive: 999 },
  'small': { title: 'Small Channels (10K-50K)', minSubs: 10000, maxSubs: 50000 },
  'medium': { title: 'Medium Channels (50K-500K)', minSubs: 50000, maxSubs: 500000 },
  'large': { title: 'Large Channels (500K-5M)', minSubs: 500000, maxSubs: 5000000 },
};

export default function BrowseCategory({ category, channels, total, page, totalPages }: BrowseCategoryProps) {
  const categoryInfo = CATEGORIES[category as keyof typeof CATEGORIES];

  if (!categoryInfo) {
    return (
      <>
        <Meta
          title="Category Not Found - YouTube Channel Finder"
          description="The requested category could not be found."
          noindex={true}
        />
        <main className={styles.container}>
          <div className={styles.error}>Category not found</div>
          <Link href="/" className={styles.backLink}>
            ← Back to Search
          </Link>
        </main>
      </>
    );
  }

  const formatSubscribers = (subs: number) => {
    if (subs >= 1000000) return `${(subs / 1000000).toFixed(1)}M`;
    if (subs >= 1000) return `${(subs / 1000).toFixed(1)}K`;
    return subs.toString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryInfo.title} - YouTube Channels`,
    description: `Browse ${total} YouTube channels in the ${categoryInfo.title} category`,
    numberOfItems: total,
  };

  return (
    <>
      <Meta
        title={`${categoryInfo.title} - Browse YouTube Channels`}
        description={`Discover ${total} YouTube channels in the ${categoryInfo.title} category. Find inactive channels ready for acquisition or collaboration.`}
        schema={schema}
      />

      <main className={styles.container}>
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Browse', href: '/' },
            { label: categoryInfo.title, href: `/browse/${category}` },
          ]}
        />

        <div className={styles.header}>
          <div>
            <Link href="/" className={styles.backLink}>
              ← Back to Search
            </Link>
            <h1>{categoryInfo.title}</h1>
            <p className={styles.description}>
              Showing {channels.length} of {total} channels
            </p>
          </div>
        </div>

        <div className={styles.channelGrid}>
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/channels/${channel.id}`}
              className={styles.relatedCard}
            >
              {channel.thumbnail_url && (
                <img
                  src={channel.thumbnail_url}
                  alt={channel.title}
                  className={styles.relatedThumbnail}
                />
              )}
              <div className={styles.relatedTitle}>{channel.title}</div>
              <div className={styles.relatedStats}>
                {formatSubscribers(channel.subscribers)} subscribers
                {channel.language && ` • ${channel.language}`}
              </div>
              {channel.monthsInactive && channel.monthsInactive >= 6 && (
                <div className={styles.relatedStats}>
                  Last upload: {formatDate(channel.last_upload_date)}
                </div>
              )}
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => window.location.href = `?page=${page - 1}`}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => window.location.href = `?page=${page + 1}`}
            >
              Next
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { category } = context.params as { category: string };
  const page = parseInt(context.query.page as string) || 1;
  const limit = 24;

  const categoryInfo = CATEGORIES[category as keyof typeof CATEGORIES];

  if (!categoryInfo) {
    return {
      props: {
        category,
        channels: [],
        total: 0,
        page: 1,
        totalPages: 0,
      },
    };
  }

  try {
    const filters: any = {
      page,
      limit,
      sortBy: 'subscribers' as const,
      order: 'DESC' as const,
    };

    if ('inactiveMonths' in categoryInfo) {
      filters.inactiveMonths = categoryInfo.inactiveMonths;
    }

    if ('minSubs' in categoryInfo) {
      filters.minSubs = categoryInfo.minSubs;
      filters.maxSubs = categoryInfo.maxSubs;
    }

    const result = await getChannels(filters);

    const channelsWithInactivity = result.channels.map((channel) => {
      let monthsInactive = null;
      if (channel.last_upload_date) {
        const lastUpload = new Date(channel.last_upload_date);
        const now = new Date();
        const diffMonths =
          (now.getFullYear() - lastUpload.getFullYear()) * 12 + (now.getMonth() - lastUpload.getMonth());
        monthsInactive = diffMonths;
      }
      return { ...channel, monthsInactive };
    });

    return {
      props: {
        category,
        channels: channelsWithInactivity,
        total: result.total,
        page: result.page,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  } catch (error) {
    console.error('Error fetching channels:', error);
    return {
      props: {
        category,
        channels: [],
        total: 0,
        page: 1,
        totalPages: 0,
      },
    };
  }
};
