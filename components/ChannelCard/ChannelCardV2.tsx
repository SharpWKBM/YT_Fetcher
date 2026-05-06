import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useInView, useCountUp, useHover } from '@/hooks/useAnimations';
import styles from './ChannelCardV2.module.css';
import animStyles from '@/styles/animations.module.css';
import BlacklistButton from '@/components/BlacklistButton';

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
}

interface ChannelCardV2Props {
  channel: Channel;
  isFavorite?: boolean;
  onToggleFavorite?: (channelId: string) => void;
  index?: number;
}

export default function ChannelCardV2({
  channel,
  isFavorite = false,
  onToggleFavorite,
  index = 0,
}: ChannelCardV2Props) {
  const { ref, hasBeenInView } = useInView({ threshold: 0.2 });
  const { ref: hoverRef, isHovered } = useHover();
  const { count: subscriberCount, animate } = useCountUp(channel.subscribers, 1500);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (hasBeenInView) {
      animate();
    }
  }, [hasBeenInView, animate]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInactiveBadgeClass = (months: number | null) => {
    if (!months) return styles.inactiveBadge;
    if (months >= 24) return `${styles.inactiveBadge} ${styles.critical}`;
    if (months >= 12) return `${styles.inactiveBadge} ${styles.warning}`;
    return styles.inactiveBadge;
  };

  const staggerClass = `staggerDelay${Math.min(index % 5 + 1, 5)}`;

  return (
    <div
      ref={(el) => {
        (ref as any).current = el;
        (hoverRef as any).current = el;
      }}
      className={`${styles.card} ${animStyles.glass} ${animStyles.card3D} ${animStyles.liftHover} ${
        hasBeenInView ? animStyles.fadeInUp : ''
      } ${animStyles[staggerClass]}`}
    >
      {/* Gradient Border Effect */}
      <div className={styles.gradientBorder} />

      {/* Thumbnail Section */}
      <div className={styles.thumbnailWrapper}>
        {!imageLoaded && (
          <div className={`${styles.thumbnailSkeleton} ${animStyles.skeleton}`} />
        )}
        <Image
          src={channel.thumbnail_url || '/placeholder-channel.png'}
          alt={channel.title}
          width={160}
          height={160}
          className={`${styles.thumbnail} ${imageLoaded ? styles.loaded : ''}`}
          onLoadingComplete={() => setImageLoaded(true)}
          quality={85}
        />

        {/* Hover Overlay */}
        <div className={`${styles.hoverOverlay} ${isHovered ? styles.visible : ''}`}>
          <a
            href={channel.channel_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.viewButton} ${animStyles.magneticButton}`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 14.5V5.5L14 10L8 14.5Z"
                fill="currentColor"
              />
            </svg>
            View Channel
          </a>
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            className={`${styles.favoriteButton} ${isFavorite ? styles.active : ''} ${animStyles.scaleHover}`}
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(channel.id);
            }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        {/* Title */}
        <h3 className={styles.title}>{channel.title}</h3>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          {/* Subscribers */}
          <div className={`${styles.stat} ${animStyles.glassSubtle}`}>
            <div className={styles.statIcon}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 8C10.21 8 12 6.21 12 4C12 1.79 10.21 0 8 0C5.79 0 4 1.79 4 4C4 6.21 5.79 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Subscribers</div>
              <div className={styles.statValue}>
                {hasBeenInView ? formatNumber(subscriberCount) : '0'}
              </div>
            </div>
          </div>

          {/* Last Upload */}
          <div className={`${styles.stat} ${animStyles.glassSubtle}`}>
            <div className={styles.statIcon}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM8.5 4H7V9L11.25 11.52L12 10.27L8.5 8.25V4Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Last Upload</div>
              <div className={styles.statValue}>{formatDate(channel.last_upload_date)}</div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className={styles.badges}>
          {channel.monthsInactive !== null && (
            <span className={getInactiveBadgeClass(channel.monthsInactive)}>
              {channel.monthsInactive}+ months inactive
            </span>
          )}
          {channel.language && (
            <span className={`${styles.badge} ${animStyles.glassSubtle}`}>
              {channel.language.toUpperCase()}
            </span>
          )}
          {channel.region && (
            <span className={`${styles.badge} ${animStyles.glassSubtle}`}>
              {channel.region}
            </span>
          )}
        </div>

        {/* Social Links */}
        {channel.social_links && (
          <div className={styles.socialLinks}>
            <div className={styles.socialLabel}>Contact:</div>
            <div className={styles.socialIcons}>
              {JSON.parse(channel.social_links).map((link: { platform: string; url: string }, idx: number) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialIcon}
                  title={`${link.platform}: ${link.url}`}
                >
                  {getSocialIcon(link.platform)}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Blacklist Button */}
        <div className={styles.actions}>
          <BlacklistButton channelId={channel.id} channelTitle={channel.title} />
        </div>
      </div>

      {/* Glow Effect on Hover */}
      {isHovered && <div className={`${styles.glowEffect} ${animStyles.glowBreathe}`} />}
    </div>
  );
}

function getSocialIcon(platform: string) {
  const icons: Record<string, JSX.Element> = {
    instagram: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    twitter: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    facebook: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    tiktok: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    discord: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
    twitch: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
      </svg>
    ),
    telegram: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    linkedin: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    website: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm9.5 12c0 1.657-.425 3.214-1.173 4.572l-3.267-8.946A7.954 7.954 0 0 1 19.5 12zM12 21.5c-1.657 0-3.214-.425-4.572-1.173l8.946-3.267A7.954 7.954 0 0 1 12 21.5zm-9.5-9.5c0-1.657.425-3.214 1.173-4.572l3.267 8.946A7.954 7.954 0 0 1 2.5 12zM12 2.5c1.657 0 3.214.425 4.572 1.173l-8.946 3.267A7.954 7.954 0 0 1 12 2.5z"/>
      </svg>
    ),
  };

  return icons[platform] || icons.website;
}