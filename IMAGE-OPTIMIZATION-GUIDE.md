# Image Optimization Guide

## Overview

This guide covers optimizing images in the YouTube Channel Finder application using Next.js Image component and creating Open Graph images.

## Current Image Usage

Images are currently used in:
- `components/ChannelCard/ChannelCardV2.tsx` - Channel thumbnails
- `pages/channels/[id].tsx` - Channel profile thumbnails
- `pages/browse/[category].tsx` - Channel thumbnails in browse pages
- `styles/ChannelProfile.module.css` - Related channel thumbnails

## Next.js Image Component Benefits

1. **Automatic Optimization**: Converts images to modern formats (WebP, AVIF)
2. **Lazy Loading**: Images load only when entering viewport
3. **Responsive Images**: Serves appropriate sizes for different devices
4. **Blur Placeholder**: Shows blur-up effect while loading
5. **Performance**: Reduces Largest Contentful Paint (LCP)

## Migration Example

### Before (Standard img tag)

```tsx
<img
  src={channel.thumbnail_url || '/placeholder-channel.png'}
  alt={channel.title}
  className={styles.thumbnail}
  onLoad={() => setImageLoaded(true)}
  loading="lazy"
/>
```

### After (Next.js Image component)

```tsx
import Image from 'next/image';

<Image
  src={channel.thumbnail_url || '/placeholder-channel.png'}
  alt={channel.title}
  width={120}
  height={120}
  className={styles.thumbnail}
  onLoad={() => setImageLoaded(true)}
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzMzMyIvPjwvc3ZnPg=="
/>
```

## Configuration Already in Place

The `next.config.js` already has image optimization configured:

```javascript
images: {
  domains: ['yt3.ggpht.com', 'yt3.googleusercontent.com'],
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  formats: ['image/avif', 'image/webp'],
}
```

## Files to Update

### 1. ChannelCardV2.tsx (Priority: High)

**Location**: `components/ChannelCard/ChannelCardV2.tsx` line 89-95

**Current**:
```tsx
<img
  src={channel.thumbnail_url || '/placeholder-channel.png'}
  alt={channel.title}
  className={`${styles.thumbnail} ${imageLoaded ? styles.loaded : ''}`}
  onLoad={() => setImageLoaded(true)}
  loading="lazy"
/>
```

**Replace with**:
```tsx
import Image from 'next/image';

<Image
  src={channel.thumbnail_url || '/placeholder-channel.png'}
  alt={channel.title}
  width={120}
  height={120}
  className={`${styles.thumbnail} ${imageLoaded ? styles.loaded : ''}`}
  onLoad={() => setImageLoaded(true)}
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzMzMyIvPjwvc3ZnPg=="
/>
```

### 2. Channel Profile Page (Priority: High)

**Location**: `pages/channels/[id].tsx`

**Find all img tags and replace with Image component**

### 3. Browse Category Page (Priority: Medium)

**Location**: `pages/browse/[category].tsx`

**Find all img tags and replace with Image component**

## Creating Open Graph Images

### Static OG Images

Create static OG images for marketing pages:

**Files to create**:
- `public/og-home.jpg` (1200x630) - Homepage
- `public/og-features.jpg` (1200x630) - Features page
- `public/og-pricing.jpg` (1200x630) - Pricing page

**Design guidelines**:
- Size: 1200x630 pixels (Facebook/Twitter recommended)
- Format: JPG or PNG
- File size: < 300KB
- Include: Logo, page title, brief description
- Use brand colors and fonts

### Dynamic OG Images for Channel Pages

For dynamic channel pages, you can:

**Option 1: Use Vercel OG Image Generation**

Install package:
```bash
npm install @vercel/og
```

Create API route `pages/api/og/channel.tsx`:
```tsx
import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const channelName = searchParams.get('name');
  const subscribers = searchParams.get('subs');

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a2e',
          color: 'white',
        }}
      >
        <h1 style={{ fontSize: 60 }}>{channelName}</h1>
        <p style={{ fontSize: 40 }}>{subscribers} subscribers</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

Then in `pages/channels/[id].tsx`:
```tsx
<Meta
  image={`${baseUrl}/api/og/channel?name=${encodeURIComponent(channel.title)}&subs=${formatSubscribers(channel.subscribers)}`}
  // ... other props
/>
```

**Option 2: Pre-generate with Puppeteer**

For better performance, pre-generate OG images during build or via cron job.

## Placeholder Image

Create a placeholder for missing thumbnails:

**File**: `public/placeholder-channel.png`

**Specifications**:
- Size: 120x120 pixels
- Format: PNG with transparency
- Content: Generic channel icon or logo
- File size: < 10KB

## CSS Considerations

When using Next.js Image, you may need to adjust CSS:

```css
/* Before */
.thumbnail {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
}

/* After - Image component handles sizing */
.thumbnail {
  border-radius: 50%;
  object-fit: cover;
}
```

## Performance Impact

Expected improvements after migration:

- **LCP**: 20-40% faster (images load progressively)
- **CLS**: Reduced layout shift (width/height specified)
- **Bandwidth**: 30-50% reduction (modern formats)
- **Mobile**: Significant improvement (responsive images)

## Testing Checklist

After implementing Image optimization:

- [ ] All images load correctly
- [ ] No layout shift (CLS = 0)
- [ ] Blur placeholder appears
- [ ] Images lazy load on scroll
- [ ] Responsive images on mobile
- [ ] External domains work (YouTube thumbnails)
- [ ] Fallback placeholder works
- [ ] Build completes successfully
- [ ] Lighthouse score improves

## Rollout Strategy

1. **Phase 1**: Update ChannelCardV2 (most visible)
2. **Phase 2**: Update channel profile pages
3. **Phase 3**: Update browse pages
4. **Phase 4**: Create static OG images
5. **Phase 5**: Implement dynamic OG images (optional)

## Troubleshooting

### Image not loading

- Check domain is in `next.config.js` images.domains
- Verify image URL is valid
- Check network tab for errors

### Layout shift

- Always specify width and height
- Use aspect-ratio CSS if needed

### Build errors

- Ensure all Image imports are correct
- Check that external domains are configured

---

## Implementation Status

- ✅ Image optimization configured in next.config.js
- ⏳ Migrate ChannelCardV2 to Image component
- ⏳ Migrate channel profile page to Image component
- ⏳ Migrate browse pages to Image component
- ⏳ Create static OG images
- ⏳ Implement dynamic OG images (optional)

**Estimated Time**: 2-3 hours for full migration
