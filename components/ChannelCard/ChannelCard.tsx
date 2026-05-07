/**
 * Modern Tailwind+shadcn ChannelCard.
 *
 * Replaces ChannelCardV2 (CSS-Modules + custom animations). Same props
 * shape so callers can swap one for the other. Uses next/image for
 * responsive thumbnails and graceful fallback.
 */
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Calendar, Users, ExternalLink, Globe, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCount, formatRelative } from '@/lib/utils';

export interface Channel {
  id: string;
  title: string;
  subscribers: number;
  language: string | null;
  region: string | null;
  last_upload_date: string | null;
  channel_url: string;
  thumbnail_url: string | null;
  monthsInactive?: number | null;
  social_links?: string | null;
  niche?: string | null;
  video_count?: number | null;
}

interface Props {
  channel: Channel;
  isFavorite?: boolean;
  onToggleFavorite?: (channelId: string) => void;
  /** stagger animation index */
  index?: number;
}

export default function ChannelCard({ channel, isFavorite, onToggleFavorite, index = 0 }: Props) {
  const inactivityTone = useInactivityTone(channel.monthsInactive);
  const socialLinks = parseSocialLinks(channel.social_links);

  return (
    <Card
      className={cn(
        'group relative flex h-full flex-col overflow-hidden border-border/60',
        'transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg',
        'animate-slide-up',
      )}
      style={{ animationDelay: `${(index % 12) * 30}ms` }}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {channel.thumbnail_url ? (
          <Image
            src={channel.thumbnail_url}
            alt={channel.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            quality={80}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-muted-foreground">
            {channel.title.slice(0, 2).toUpperCase()}
          </div>
        )}

        {onToggleFavorite && (
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              onToggleFavorite(channel.id);
            }}
            className={cn(
              'absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur',
              'shadow-sm transition hover:scale-110 hover:bg-background focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring',
              isFavorite && 'text-primary',
            )}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
          </button>
        )}

        {channel.niche && (
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 bg-background/85 backdrop-blur"
          >
            {channel.niche}
          </Badge>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <h3
          className="line-clamp-2 text-base font-semibold leading-snug tracking-tight"
          title={channel.title}
        >
          {channel.title}
        </h3>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat icon={Users} label="Subs" value={formatCount(channel.subscribers)} />
          <Stat
            icon={Calendar}
            label="Active"
            value={formatRelative(channel.last_upload_date)}
            tone={inactivityTone}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {channel.language && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Globe className="h-3 w-3" />
              {channel.language.toUpperCase()}
            </Badge>
          )}
          {channel.region && (
            <Badge variant="outline" className="gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {channel.region}
            </Badge>
          )}
          {channel.video_count != null && (
            <Badge variant="outline" className="text-xs">
              {formatCount(channel.video_count)} videos
            </Badge>
          )}
        </div>

        {socialLinks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
            {socialLinks.slice(0, 4).map(link => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs text-muted-foreground hover:text-primary"
                title={link.url}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Button asChild size="sm" variant="default" className="flex-1">
            <Link href={`/channels/${channel.id}`}>Details</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={channel.channel_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open on YouTube"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'critical';
}

function Stat({ icon: Icon, label, value, tone = 'default' }: StatProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5',
        tone === 'warning' && 'bg-amber-100/70 dark:bg-amber-950/40',
        tone === 'critical' && 'bg-red-100/70 dark:bg-red-950/40',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function useInactivityTone(months: number | null | undefined): StatProps['tone'] {
  if (months == null) return 'default';
  if (months >= 24) return 'critical';
  if (months >= 12) return 'warning';
  return 'default';
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
          const label = host.split('.')[0];
          return { label, url: u.toString() };
        } catch {
          return null;
        }
      })
      .filter((x): x is ParsedSocial => x !== null);
  } catch {
    return [];
  }
}
