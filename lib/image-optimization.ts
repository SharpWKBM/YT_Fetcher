// Image optimization utilities for channel thumbnails

/**
 * Generate optimized image URL with Next.js Image Optimization API
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  width: number,
  quality: number = 75
): string {
  if (!originalUrl) {
    return '/placeholder-channel.png';
  }

  // Use Next.js Image Optimization API
  const params = new URLSearchParams({
    url: originalUrl,
    w: width.toString(),
    q: quality.toString(),
  });

  return `/_next/image?${params.toString()}`;
}

/**
 * Get responsive image srcset for different screen sizes
 */
export function getResponsiveSrcSet(originalUrl: string): string {
  if (!originalUrl) {
    return '';
  }

  const sizes = [320, 640, 960, 1280];
  return sizes
    .map(size => `${getOptimizedImageUrl(originalUrl, size)} ${size}w`)
    .join(', ');
}

/**
 * Preload critical images for better performance
 */
export function preloadImage(url: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Lazy load images with Intersection Observer
 */
export function setupLazyLoading(selector: string = 'img[data-src]'): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return;
  }

  const images = document.querySelectorAll(selector);

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.getAttribute('data-src');

        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01,
  });

  images.forEach(img => imageObserver.observe(img));
}

/**
 * Convert YouTube thumbnail URL to higher quality version
 */
export function getHighQualityThumbnail(thumbnailUrl: string): string {
  if (!thumbnailUrl) {
    return '/placeholder-channel.png';
  }

  // YouTube thumbnail quality levels:
  // default.jpg (120x90)
  // mqdefault.jpg (320x180)
  // hqdefault.jpg (480x360)
  // sddefault.jpg (640x480)
  // maxresdefault.jpg (1280x720)

  return thumbnailUrl
    .replace('/default.jpg', '/hqdefault.jpg')
    .replace('/mqdefault.jpg', '/hqdefault.jpg');
}

/**
 * Generate blur placeholder for progressive image loading
 */
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;

  if (!canvas) {
    // Server-side fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  }

  // Create gradient placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f0f0f0');
  gradient.addColorStop(1, '#e0e0e0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
}

/**
 * Image loading priorities
 */
export const IMAGE_PRIORITY = {
  HIGH: 'high', // Above-the-fold images
  LOW: 'low', // Below-the-fold images
  AUTO: 'auto', // Browser decides
} as const;

/**
 * Recommended image sizes for different use cases
 */
export const IMAGE_SIZES = {
  THUMBNAIL_SMALL: 120,
  THUMBNAIL_MEDIUM: 240,
  THUMBNAIL_LARGE: 480,
  CARD: 320,
  DETAIL: 640,
  FULL: 1280,
} as const;

/**
 * Image quality presets
 */
export const IMAGE_QUALITY = {
  LOW: 50,
  MEDIUM: 75,
  HIGH: 90,
  MAX: 100,
} as const;
