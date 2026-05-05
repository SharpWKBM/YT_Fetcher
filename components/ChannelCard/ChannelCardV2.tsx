import { useState, useEffect } from 'react';
import { useInView, useCountUp, useHover } from '@/hooks/useAnimations';
import styles from './ChannelCardV2.module.css';
import animStyles from '@/styles/animations.module.css';

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
        <img
          src={channel.thumbnail_url || '/placeholder-channel.png'}
          alt={channel.title}
          className={`${styles.thumbnail} ${imageLoaded ? styles.loaded : ''}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
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
      </div>

      {/* Glow Effect on Hover */}
      {isHovered && <div className={`${styles.glowEffect} ${animStyles.glowBreathe}`} />}
    </div>
  );
}
