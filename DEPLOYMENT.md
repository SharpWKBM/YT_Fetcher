# YouTube Channel Finder - Production Deployment Guide

## Prerequisites

### 1. YouTube API Keys (5 keys recommended for rotation)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**
4. Create 5 API keys:
   - Go to Credentials → Create Credentials → API Key
   - Restrict each key to YouTube Data API v3
   - Copy all 5 keys

### 2. OAuth Providers Setup

#### Google OAuth
1. In Google Cloud Console, go to Credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs:
   - `https://your-domain.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
5. Copy Client ID and Client Secret

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: YouTube Channel Finder
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://your-domain.com/api/auth/callback/github`
4. Copy Client ID and Client Secret

### 3. Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get API keys from Developers → API keys
3. Create Products and Prices:

#### Pro Plan ($9.99/month)
```bash
# Create product
stripe products create \
  --name "Pro Plan" \
  --description "Advanced channel discovery with filters"

# Create price (copy product ID from above)
stripe prices create \
  --product prod_xxxxx \
  --unit-amount 999 \
  --currency usd \
  --recurring[interval]=month
```

#### Enterprise Plan ($29.99/month)
```bash
# Create product
stripe products create \
  --name "Enterprise Plan" \
  --description "Unlimited access with priority support"

# Create price
stripe prices create \
  --product prod_xxxxx \
  --unit-amount 2999 \
  --currency usd \
  --recurring[interval]=month
```

4. Set up webhook endpoint:
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy webhook signing secret

### 4. Turso Database Setup

1. Install Turso CLI:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

2. Create database:
```bash
turso db create youtube-finder
```

3. Get connection details:
```bash
turso db show youtube-finder
turso db tokens create youtube-finder
```

4. Copy `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

## Deployment Steps

### 1. Environment Variables

Create `.env.production` with all required variables:

```bash
# Database (Turso)
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_token

# YouTube API Keys (5 keys for rotation)
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
YOUTUBE_API_KEY_2=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
YOUTUBE_API_KEY_3=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
YOUTUBE_API_KEY_4=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
YOUTUBE_API_KEY_5=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Cron Secret (generate with: openssl rand -hex 32)
CRON_SECRET=your_64_character_hex_string

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret_min_32_chars

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx
```

### 2. Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Link project:
```bash
vercel link
```

3. Add environment variables:
```bash
# Add all variables from .env.production
vercel env add TURSO_DATABASE_URL production
vercel env add TURSO_AUTH_TOKEN production
# ... repeat for all variables
```

Or use Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add all variables from `.env.production`
- Set environment: Production

4. Deploy:
```bash
vercel --prod
```

### 3. Initialize Database Schema

After first deployment, run database migrations:

```bash
# Connect to Turso database
turso db shell youtube-finder

# Run schema creation (copy from lib/db.ts initialization)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT,
  avatar TEXT,
  bio TEXT,
  two_factor_secret TEXT,
  two_factor_enabled INTEGER DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_current_period_end INTEGER,
  subscription_cancel_at_period_end INTEGER DEFAULT 0,
  preferences TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subscriber_count INTEGER,
  video_count INTEGER,
  view_count INTEGER,
  published_at TEXT,
  thumbnail_url TEXT,
  country TEXT,
  custom_url TEXT,
  last_video_date TEXT,
  inactive_months INTEGER,
  niche TEXT,
  tags TEXT,
  social_links TEXT,
  is_blacklisted INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_channels_subscribers ON channels(subscriber_count);
CREATE INDEX IF NOT EXISTS idx_channels_inactive ON channels(inactive_months);
CREATE INDEX IF NOT EXISTS idx_channels_niche ON channels(niche);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
```

### 4. Populate Initial Channel Data

Trigger the cron job to fetch initial channels:

```bash
curl -X POST https://your-domain.com/api/cron/fetch-channels \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Fetched and stored 45 channels",
  "fetched": 50,
  "inserted": 45
}
```

### 5. Verify Cron Job

The cron job runs every Sunday at 2 AM UTC (configured in `vercel.json`).

Check Vercel logs:
```bash
vercel logs --follow
```

### 6. Test Authentication

1. Visit `https://your-domain.com`
2. Click "Sign In"
3. Test Google OAuth login
4. Test GitHub OAuth login
5. Test email/password registration
6. Enable 2FA in profile settings

### 7. Test Stripe Integration

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
2. Subscribe to Pro plan
3. Verify subscription status in profile
4. Access billing portal
5. Test subscription cancellation

### 8. Configure Custom Domain (Optional)

1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` environment variable
5. Update OAuth redirect URIs in Google/GitHub
6. Update Stripe webhook endpoint

## Post-Deployment Testing

### Functional Testing Checklist

- [ ] Homepage loads with liquid-glass effects
- [ ] Channel list displays correctly
- [ ] Advanced filters work (niche, tags, subscriber range)
- [ ] Search functionality works
- [ ] User registration with email/password
- [ ] OAuth login (Google, GitHub)
- [ ] 2FA setup and verification
- [ ] Profile editing (name, bio, avatar)
- [ ] Password change with validation
- [ ] Subscription upgrade flow
- [ ] Stripe checkout session
- [ ] Billing portal access
- [ ] Cron job execution
- [ ] Rate limiting (100 requests/15min)
- [ ] Temporary email blocking
- [ ] Password strength validation

### Security Testing

- [ ] HTTPS enabled
- [ ] Environment variables not exposed
- [ ] API routes require authentication
- [ ] CSRF protection enabled
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized inputs)
- [ ] Rate limiting active
- [ ] Stripe webhook signature verification
- [ ] 2FA working correctly
- [ ] Password hashing with bcrypt

### Performance Testing

- [ ] Page load time < 3s
- [ ] API response time < 500ms
- [ ] Database queries optimized
- [ ] Images optimized
- [ ] CSS animations smooth (60fps)
- [ ] No console errors
- [ ] Lighthouse score > 90

## Local Development

### Setup

1. Clone repository:
```bash
git clone https://github.com/your-username/youtube-finder.git
cd youtube-finder
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local`:
```bash
cp .env.example .env.local
```

4. Add development environment variables to `.env.local`:
```bash
# Use test/development keys
TURSO_DATABASE_URL=libsql://your-dev-database.turso.io
TURSO_AUTH_TOKEN=your_dev_token

YOUTUBE_API_KEY=your_dev_youtube_key
CRON_SECRET=dev_secret_min_32_chars

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev_secret_min_32_chars

# OAuth (use separate dev apps)
GOOGLE_CLIENT_ID=your_dev_google_id
GOOGLE_CLIENT_SECRET=your_dev_google_secret
GITHUB_CLIENT_ID=your_dev_github_id
GITHUB_CLIENT_SECRET=your_dev_github_secret

# Stripe test mode
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx
STRIPE_PRO_PRICE_ID=price_test_xxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_test_xxxxx
```

5. Initialize local database:
```bash
turso db create youtube-finder-dev
turso db shell youtube-finder-dev < schema.sql
```

6. Run development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

### Testing Stripe Locally

1. Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
# or
scoop install stripe
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

4. Copy webhook signing secret to `.env.local`

5. Test checkout flow with test cards

## Troubleshooting

### YouTube API Quota Exceeded

**Symptoms:**
- Error: "quotaExceeded"
- Channels not updating

**Solutions:**
1. Check quota usage in Google Cloud Console
2. Free tier: 10,000 units/day (≈98 channels)
3. Use API key rotation (5 keys = 5x quota)
4. Reduce batch size in cron job
5. Upgrade to paid tier if needed

### Database Connection Issues

**Symptoms:**
- Error: "Failed to connect to database"
- Timeout errors

**Solutions:**
1. Verify `TURSO_DATABASE_URL` is correct
2. Check `TURSO_AUTH_TOKEN` is valid
3. Test connection: `turso db shell youtube-finder`
4. Ensure database exists: `turso db list`
5. Check Vercel logs for detailed errors

### Authentication Not Working

**Symptoms:**
- OAuth redirect fails
- Session not persisting
- 2FA errors

**Solutions:**
1. Verify `NEXTAUTH_URL` matches deployment URL
2. Check `NEXTAUTH_SECRET` is set (min 32 chars)
3. Verify OAuth redirect URIs in provider settings
4. Clear browser cookies and try again
5. Check Vercel logs for NextAuth errors

### Stripe Webhook Failures

**Symptoms:**
- Subscriptions not updating
- Webhook signature verification failed

**Solutions:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Check webhook endpoint is accessible: `curl https://your-domain.com/api/stripe/webhook`
3. Review webhook logs in Stripe dashboard
4. Ensure webhook events are selected: `checkout.session.completed`, `customer.subscription.*`
5. Test with Stripe CLI: `stripe trigger checkout.session.completed`

### Cron Job Not Running

**Symptoms:**
- Channels not updating weekly
- No cron logs in Vercel

**Solutions:**
1. Verify `vercel.json` exists in root
2. Check cron configuration: `"schedule": "0 2 * * 0"`
3. Ensure `CRON_SECRET` is set
4. Test manually: `curl -X POST https://your-domain.com/api/cron/fetch-channels -H "Authorization: Bearer YOUR_CRON_SECRET"`
5. Check Vercel cron logs in dashboard

### No Channels Showing

**Symptoms:**
- Empty channel list
- Filters return no results

**Solutions:**
1. Run cron job manually to populate database
2. Check database has data: `turso db shell youtube-finder` → `SELECT COUNT(*) FROM channels;`
3. Verify filters aren't too restrictive
4. Check browser console for API errors
5. Test API endpoint: `curl https://your-domain.com/api/channels`

### Rate Limiting Issues

**Symptoms:**
- Error: "Too many requests"
- 429 status code

**Solutions:**
1. Default: 100 requests per 15 minutes per IP
2. Wait 15 minutes for rate limit reset
3. Adjust limits in API routes if needed
4. Use authenticated requests (higher limits)
5. Implement exponential backoff in client

### Build Failures

**Symptoms:**
- Vercel build fails
- TypeScript errors

**Solutions:**
1. Run `npm run build` locally first
2. Fix TypeScript errors: `npm run type-check`
3. Ensure all dependencies installed: `npm install`
4. Check Node.js version matches Vercel (18.x)
5. Review build logs in Vercel dashboard

### Performance Issues

**Symptoms:**
- Slow page loads
- High API response times
- Database timeouts

**Solutions:**
1. Enable database indexes (already configured)
2. Implement pagination for large result sets
3. Add caching headers to API responses
4. Optimize images (use Next.js Image component)
5. Monitor Vercel analytics for bottlenecks

## Monitoring and Maintenance

### Vercel Analytics

Enable in Vercel dashboard:
- Web Analytics (page views, performance)
- Speed Insights (Core Web Vitals)
- Log Drains (export logs to external service)

### Database Maintenance

```bash
# Check database size
turso db inspect youtube-finder

# Backup database
turso db dump youtube-finder > backup.sql

# Restore from backup
turso db shell youtube-finder < backup.sql

# Optimize database
turso db shell youtube-finder
> VACUUM;
> ANALYZE;
```

### API Quota Monitoring

Monitor YouTube API usage:
1. Go to Google Cloud Console
2. APIs & Services → Dashboard
3. YouTube Data API v3 → Quotas
4. Set up quota alerts

### Stripe Dashboard

Monitor subscriptions:
1. Customers → Active subscriptions
2. Payments → Recent payments
3. Webhooks → Event logs
4. Set up email alerts for failed payments

### Security Updates

Regular maintenance:
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Update major versions carefully
npm outdated
npm install package@latest
```

## Scaling Considerations

### Database Scaling

- Turso scales automatically
- Monitor query performance
- Add indexes for new filter fields
- Consider read replicas for high traffic

### API Rate Limits

Current limits:
- Free tier: 100 req/15min
- Pro tier: 500 req/15min
- Enterprise: 2000 req/15min

Adjust in API routes as needed.

### Cron Job Scaling

- Current: 50 channels/week
- Increase batch size for more channels
- Add multiple cron jobs for different niches
- Implement queue system for large batches

### CDN and Caching

Vercel automatically provides:
- Edge caching for static assets
- Image optimization
- Automatic compression

Add custom caching:
```typescript
// In API routes
res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
```

## Support and Resources

- **Documentation**: [Next.js Docs](https://nextjs.org/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Stripe Docs**: [stripe.com/docs](https://stripe.com/docs)
- **Turso Docs**: [docs.turso.tech](https://docs.turso.tech)
- **YouTube API**: [developers.google.com/youtube](https://developers.google.com/youtube)

## License

MIT License - See LICENSE file for details
