# Analytics & Tracking Setup Guide

## Google Analytics 4 Setup

### 1. Create Google Analytics Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click "Admin" (gear icon in bottom left)
3. Click "Create Property"
4. Enter property name: "YouTube Channel Finder"
5. Select timezone and currency
6. Click "Next"
7. Select industry category: "Technology"
8. Select business size
9. Click "Create"

### 2. Create Data Stream

1. Select "Web" as platform
2. Enter website URL: `https://yourdomain.com`
3. Enter stream name: "YouTube Channel Finder - Production"
4. Click "Create stream"
5. Copy the **Measurement ID** (format: G-XXXXXXXXXX)

### 3. Add Measurement ID to Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Add to `.env.production`:
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 4. Deploy and Verify

1. Deploy your application
2. Visit your site in production
3. Go to Google Analytics > Reports > Realtime
4. Verify that your visit appears in real-time data

### 5. Configure Enhanced Measurement (Optional)

In Google Analytics:
1. Go to Admin > Data Streams > Your Stream
2. Click "Enhanced measurement"
3. Enable:
   - Page views (enabled by default)
   - Scrolls
   - Outbound clicks
   - Site search
   - Form interactions
   - File downloads

---

## Google Search Console Setup

### 1. Add Property

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click "Add Property"
3. Select "URL prefix" property type
4. Enter: `https://yourdomain.com`
5. Click "Continue"

### 2. Verify Ownership

**Method 1: HTML Tag (Recommended)**

1. Copy the verification meta tag
2. Add to `components/SEO/Meta.tsx`:
   ```tsx
   <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
   ```
3. Deploy and click "Verify"

**Method 2: DNS Record**

1. Add TXT record to your domain DNS:
   ```
   google-site-verification=YOUR_VERIFICATION_CODE
   ```
2. Wait for DNS propagation (up to 48 hours)
3. Click "Verify"

### 3. Submit Sitemap

1. In Search Console, go to "Sitemaps" (left sidebar)
2. Enter sitemap URL: `https://yourdomain.com/sitemap.xml`
3. Click "Submit"
4. Wait 24-48 hours for Google to crawl

### 4. Monitor Indexing

1. Go to "Coverage" or "Pages" report
2. Check for:
   - Valid pages (should increase over time)
   - Errors (fix any issues)
   - Excluded pages (review reasons)

### 5. Track Performance

1. Go to "Performance" report
2. Monitor:
   - Total clicks
   - Total impressions
   - Average CTR
   - Average position
3. Filter by:
   - Queries (what people search for)
   - Pages (which pages get traffic)
   - Countries
   - Devices

---

## Key Metrics to Track

### Google Analytics

**Acquisition:**
- Organic search traffic
- Direct traffic
- Referral traffic
- Social traffic

**Engagement:**
- Average session duration
- Pages per session
- Bounce rate
- Top pages

**Conversions:**
- Sign-ups (set up as conversion event)
- Subscription upgrades
- Channel views

### Google Search Console

**Performance:**
- Impressions (how often you appear in search)
- Clicks (how often people click)
- CTR (click-through rate)
- Average position

**Coverage:**
- Valid pages indexed
- Pages with errors
- Pages excluded

**Enhancements:**
- Mobile usability issues
- Core Web Vitals
- Structured data errors

---

## Custom Events (Optional)

To track specific user actions, add custom events:

### Track Search Queries

```typescript
// In pages/index.tsx, after search
gtag('event', 'search', {
  search_term: searchQuery,
  filters: JSON.stringify(filters)
});
```

### Track Channel Views

```typescript
// In pages/channels/[id].tsx
gtag('event', 'view_channel', {
  channel_id: channel.id,
  channel_name: channel.title,
  subscribers: channel.subscribers
});
```

### Track Sign-ups

```typescript
// After successful sign-up
gtag('event', 'sign_up', {
  method: 'email'
});
```

### Track Conversions

```typescript
// After subscription purchase
gtag('event', 'purchase', {
  transaction_id: subscriptionId,
  value: price,
  currency: 'USD',
  items: [{
    item_id: tier,
    item_name: `${tier} Subscription`,
    price: price
  }]
});
```

---

## Troubleshooting

### Analytics Not Tracking

1. Check that `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set
2. Verify you're testing in production mode (`NODE_ENV=production`)
3. Check browser console for errors
4. Disable ad blockers
5. Wait 24-48 hours for data to appear

### Search Console Not Indexing

1. Verify sitemap is accessible: `https://yourdomain.com/sitemap.xml`
2. Check `robots.txt` allows crawling
3. Ensure pages return 200 status code
4. Check for `noindex` meta tags
5. Wait 1-2 weeks for initial indexing

### Low Click-Through Rate

1. Improve meta titles (include keywords, under 60 chars)
2. Improve meta descriptions (compelling, under 160 chars)
3. Add structured data for rich snippets
4. Target long-tail keywords
5. Improve page content quality

---

## Next Steps

1. ✅ Google Analytics installed
2. ⏳ Create GA4 property and get measurement ID
3. ⏳ Add measurement ID to environment variables
4. ⏳ Deploy to production
5. ⏳ Verify tracking in GA4 Realtime
6. ⏳ Set up Google Search Console
7. ⏳ Verify ownership
8. ⏳ Submit sitemap
9. ⏳ Monitor indexing progress
10. ⏳ Set up custom conversion events

**Estimated Time:** 1-2 hours for setup, 1-2 weeks for initial data
