import { GetServerSideProps } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Users,
  Globe,
  MapPin,
  Calendar,
  Video,
  Clock,
  PlayCircle,
} from 'lucide-react';
import Meta from '@/components/SEO/Meta';
import Breadcrumbs from '@/components/Breadcrumbs/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatCount, formatRelative } from '@/lib/utils';
import { getChannelById, getRelatedChannels } from '@/lib/db';
import { fetchChannelRss } from '@/lib/youtube/no-api/rss';
import { isChannelId } from '@/lib/youtube/no-api/http';

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

interface RecentVideo {
  videoId: string;
  title: string;
  publishedAt: string;
}

interface Props {
  channel: Channel | null;
  relatedChannels: Channel[];
  recentVideos: RecentVideo[];
  error?: string;
}

export default function ChannelProfile({ channel, relatedChannels, recentVideos, error }: Props) {
  if (error || !channel) {
    return (
      <>
        <Meta
          title="Channel Not Found - YouTube Channel Finder"
          description="The requested channel could not be found."
          noindex
        />
        <main className="container py-12">
          <Card>
            <CardContent className="space-y-4 py-12 text-center">
              <p className="text-base font-medium">{error ?? 'Channel not found'}</p>
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

  const inactivityBadge = renderInactivityBadge(channel.monthsInactive);
  const socialLinks = parseSocialLinks(channel.social_links);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Organization',
      name: channel.title,
      url: channel.channel_url,
      logo: channel.thumbnail_url,
      sameAs: [channel.channel_url],
      description: `YouTube channel with ${formatCount(channel.subscribers)} subscribers.`,
    },
  };

  return (
    <>
      <Meta
        title={`${channel.title} – ${formatCount(channel.subscribers)} subs | YouTube Channel Finder`}
        description={`Profile for ${channel.title} (${formatCount(
          channel.subscribers,
        )} subscribers). Last upload: ${channel.last_upload_date ?? 'unknown'}.`}
        image={channel.thumbnail_url || undefined}
        type="profile"
        schema={schema}
      />

      <div className="min-h-screen bg-background text-foreground">
        <main className="container py-8 sm:py-12">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Channels', href: '/' },
              { label: channel.title, href: `/channels/${channel.id}` },
            ]}
          />

          <div className="my-6">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to search
              </Link>
            </Button>
          </div>

          {/* Hero card --------------------------------------------------- */}
          <Card className="overflow-hidden">
            {/* Banner placeholder gradient — channel banner is not in DB yet */}
            <div className="h-32 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent sm:h-40" />

            <CardContent className="relative -mt-12 space-y-6 p-6 sm:-mt-16 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Avatar
                  src={channel.thumbnail_url}
                  alt={channel.title}
                  fallback={channel.title}
                  className="h-24 w-24 ring-4 ring-background sm:h-32 sm:w-32"
                />
                <div className="flex-1 space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{channel.title}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {channel.niche && <Badge variant="default">{channel.niche}</Badge>}
                    {channel.language && (
                      <Badge variant="outline" className="gap-1">
                        <Globe className="h-3 w-3" />
                        {channel.language.toUpperCase()}
                      </Badge>
                    )}
                    {channel.region && (
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {channel.region}
                      </Badge>
                    )}
                    {inactivityBadge}
                  </div>
                </div>
                <Button asChild size="lg" className="sm:self-end">
                  <a href={channel.channel_url} target="_blank" rel="noopener noreferrer">
                    Open on YouTube
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile icon={Users} label="Subscribers" value={formatCount(channel.subscribers)} />
                <StatTile
                  icon={Video}
                  label="Videos"
                  value={channel.video_count != null ? formatCount(channel.video_count) : '—'}
                />
                <StatTile
                  icon={Calendar}
                  label="Last upload"
                  value={formatRelative(channel.last_upload_date)}
                />
                <StatTile
                  icon={Clock}
                  label="Inactive for"
                  value={
                    channel.monthsInactive != null
                      ? `${channel.monthsInactive} mo`
                      : '—'
                  }
                />
              </div>

              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                  <span className="text-sm font-medium text-muted-foreground">Links:</span>
                  {socialLinks.map(l => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent videos ----------------------------------------------- */}
          {recentVideos.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-xl font-semibold tracking-tight">Recent uploads</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentVideos.slice(0, 9).map(v => (
                  <a
                    key={v.videoId}
                    href={`https://www.youtube.com/watch?v=${v.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <Card className="overflow-hidden transition hover:border-primary/40 hover:shadow-md">
                      <div className="relative aspect-video w-full bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`}
                          alt={v.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/30">
                          <PlayCircle className="h-12 w-12 text-white opacity-0 transition group-hover:opacity-100" />
                        </div>
                      </div>
                      <CardContent className="space-y-1 p-3">
                        <p className="line-clamp-2 text-sm font-medium leading-snug">{v.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelative(v.publishedAt)}
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Related ----------------------------------------------------- */}
          {relatedChannels.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-xl font-semibold tracking-tight">Similar channels</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedChannels.map(r => (
                  <Link key={r.id} href={`/channels/${r.id}`}>
                    <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                      <CardContent className="flex items-center gap-3 p-4">
                        <Avatar
                          src={r.thumbnail_url}
                          alt={r.title}
                          fallback={r.title}
                          className="h-12 w-12"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{r.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCount(r.subscribers)} subs
                            {r.language && ` · ${r.language.toUpperCase()}`}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function renderInactivityBadge(months: number | null | undefined) {
  if (months == null) return null;
  if (months >= 12) {
    return <Badge variant="destructive">Inactive {months}+ months</Badge>;
  }
  if (months >= 6) {
    return (
      <Badge
        variant="default"
        className={cn('bg-amber-500 text-white hover:bg-amber-500/90 dark:bg-amber-700')}
      >
        Inactive {months} months
      </Badge>
    );
  }
  return null;
}

interface ParsedSocial {
  label: string;
  url: string;
}

function parseSocialLinks(raw: string | null | undefined): ParsedSocial[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((url: unknown): ParsedSocial | null => {
        if (typeof url !== 'string') return null;
        try {
          const u = new URL(url.startsWith('http') ? url : `https://${url}`);
          const host = u.hostname.replace(/^www\./, '');
          return { label: host.split('.')[0], url: u.toString() };
        } catch {
          return null;
        }
      })
      .filter((x): x is ParsedSocial => x !== null);
  } catch {
    return [];
  }
}

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const { id } = context.params as { id: string };

  try {
    const channel = await getChannelById(id);
    if (!channel) {
      return {
        props: {
          channel: null,
          relatedChannels: [],
          recentVideos: [],
          error: 'Channel not found',
        },
      };
    }

    // Calculate months inactive
    let monthsInactive: number | null = null;
    if (channel.last_upload_date) {
      const lastUpload = new Date(channel.last_upload_date);
      const now = new Date();
      monthsInactive =
        (now.getFullYear() - lastUpload.getFullYear()) * 12 +
        (now.getMonth() - lastUpload.getMonth());
    }

    // Fetch recent videos via RSS in parallel with related channels.
    // Both are best-effort — if either fails, we still render the page.
    const [related, rss] = await Promise.all([
      getRelatedChannels(channel.id, {
        language: channel.language,
        region: channel.region,
        subscriberRange: [channel.subscribers * 0.5, channel.subscribers * 2],
        limit: 6,
      }),
      isChannelId(channel.id) ? fetchChannelRss(channel.id).catch(() => null) : Promise.resolve(null),
    ]);

    const relatedWithInactivity = related.map(r => {
      let mi: number | null = null;
      if (r.last_upload_date) {
        const d = new Date(r.last_upload_date);
        const now = new Date();
        mi = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      }
      return { ...r, monthsInactive: mi };
    });

    return {
      props: {
        channel: { ...channel, monthsInactive },
        relatedChannels: relatedWithInactivity,
        recentVideos: rss?.recentVideos.slice(0, 9) ?? [],
      },
    };
  } catch (err) {
    console.error('Error fetching channel:', err);
    return {
      props: {
        channel: null,
        relatedChannels: [],
        recentVideos: [],
        error: 'Failed to load channel',
      },
    };
  }
};
