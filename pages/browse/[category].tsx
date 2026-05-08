import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';
import Meta from '@/components/SEO/Meta';
import Breadcrumbs from '@/components/Breadcrumbs/Breadcrumbs';
import ChannelCard from '@/components/ChannelCard/ChannelCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCount } from '@/lib/utils';
import { getChannels } from '@/lib/db';

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
  social_links?: string | null;
  niche?: string | null;
  video_count?: number | null;
}

interface Props {
  category: string;
  channels: Channel[];
  total: number;
  page: number;
  totalPages: number;
}

interface CategoryInfo {
  title: string;
  description: string;
  inactiveMonths?: number;
  maxInactive?: number;
  minSubs?: number;
  maxSubs?: number;
}

const CATEGORIES: Record<string, CategoryInfo> = {
  'inactive-3-6': {
    title: 'Inactive 3–6 months',
    description: 'Channels that have stalled but might still be revived.',
    inactiveMonths: 3,
    maxInactive: 6,
  },
  'inactive-6-12': {
    title: 'Inactive 6–12 months',
    description: 'Likely dormant — strong acquisition candidates.',
    inactiveMonths: 6,
    maxInactive: 12,
  },
  'inactive-12plus': {
    title: 'Inactive 12+ months',
    description: 'Long-dormant channels often available below market.',
    inactiveMonths: 12,
    maxInactive: 999,
  },
  small: {
    title: 'Small (10K–50K)',
    description: 'Right-sized for first-time acquirers.',
    minSubs: 10_000,
    maxSubs: 50_000,
  },
  medium: {
    title: 'Medium (50K–500K)',
    description: 'Established audience without enterprise pricing.',
    minSubs: 50_000,
    maxSubs: 500_000,
  },
  large: {
    title: 'Large (500K–5M)',
    description: 'Premium channels with significant reach.',
    minSubs: 500_000,
    maxSubs: 5_000_000,
  },
};

export default function BrowseCategory({ category, channels, total, page, totalPages }: Props) {
  const info = CATEGORIES[category];
  const router = useRouter();

  if (!info) {
    return (
      <>
        <Meta title="Category not found" description="Category not found" noindex />
        <main className="container py-12">
          <Card>
            <CardContent className="space-y-4 py-12 text-center">
              <p className="text-base font-medium">Category not found</p>
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to search
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${info.title} – YouTube channels`,
    description: `Browse ${total} YouTube channels in the ${info.title} category`,
    numberOfItems: total,
  };

  function goPage(p: number) {
    void router.push({ pathname: router.pathname, query: { ...router.query, page: p } });
  }

  return (
    <>
      <Meta
        title={`${info.title} – Browse channels | YouTube Channel Finder`}
        description={`Discover ${total} YouTube channels matching: ${info.title}. ${info.description}`}
        schema={schema}
      />

      <div className="min-h-screen bg-background text-foreground">
        <main className="container py-8 sm:py-12">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Browse', href: '/' },
              { label: info.title, href: `/browse/${category}` },
            ]}
          />

          <div className="my-6">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to search
              </Link>
            </Button>
          </div>

          <header className="mb-8 space-y-3">
            <Badge variant="secondary">{formatCount(total)} matches</Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{info.title}</h1>
            <p className="text-muted-foreground">{info.description}</p>
          </header>

          {channels.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-base font-medium">No channels in this category yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Backfill is still running — check back soon, or browse other categories.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/">Back to all channels</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {channels.map((channel, index) => (
                <ChannelCard key={channel.id} channel={channel} index={index} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page <span className="font-semibold text-foreground">{page}</span> of{' '}
                <span className="font-semibold text-foreground">{totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </nav>
          )}
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const { category } = context.params as { category: string };
  const page = parseInt(context.query.page as string) || 1;
  const limit = 24;

  const categoryInfo = CATEGORIES[category];
  if (!categoryInfo) {
    return { props: { category, channels: [], total: 0, page: 1, totalPages: 0 } };
  }

  try {
    const filters: Parameters<typeof getChannels>[0] = {
      page,
      limit,
      sortBy: 'subscribers',
      order: 'DESC',
    };
    if (categoryInfo.inactiveMonths != null) filters.inactiveMonths = categoryInfo.inactiveMonths;
    if (categoryInfo.minSubs != null) filters.minSubs = categoryInfo.minSubs;
    if (categoryInfo.maxSubs != null) filters.maxSubs = categoryInfo.maxSubs;

    const result = await getChannels(filters);

    const channels = result.channels.map(channel => {
      let monthsInactive: number | null = null;
      if (channel.last_upload_date) {
        const d = new Date(channel.last_upload_date);
        const now = new Date();
        monthsInactive =
          (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      }
      return { ...channel, monthsInactive };
    });

    return {
      props: {
        category,
        channels,
        total: result.total,
        page: result.page,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  } catch (error) {
    console.error('Error fetching channels:', error);
    return { props: { category, channels: [], total: 0, page: 1, totalPages: 0 } };
  }
};
