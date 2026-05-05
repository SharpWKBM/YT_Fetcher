# Quick Reference Guide

## Common Commands

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Database Operations

```bash
# Create new database
turso db create youtube-finder

# List databases
turso db list

# Connect to database shell
turso db shell youtube-finder

# Show database info
turso db show youtube-finder

# Create auth token
turso db tokens create youtube-finder

# Backup database
turso db dump youtube-finder > backup.sql

# Restore database
turso db shell youtube-finder < backup.sql
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Add environment variable
vercel env add VARIABLE_NAME production

# Pull environment variables
vercel env pull .env.local

# Deploy to production
vercel --prod

# View logs
vercel logs --follow

# List deployments
vercel ls
```

### Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
scoop install stripe                    # Windows

# Login to Stripe
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted

# Create product
stripe products create --name "Pro Plan" --description "Advanced features"

# Create price
stripe prices create --product prod_xxxxx --unit-amount 999 --currency usd --recurring[interval]=month
```

### Git Operations

```bash
# Check status
git status

# Create new branch
git checkout -b feature/new-feature

# Stage changes
git add .

# Commit with message
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request (GitHub CLI)
gh pr create --title "Add new feature" --body "Description"

# Merge pull request
gh pr merge 123 --squash
```

## API Testing

### Authentication

```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'

# Setup 2FA
curl -X POST http://localhost:3000/api/auth/2fa/setup \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Verify 2FA
curl -X POST http://localhost:3000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"token": "123456"}'
```

### Profile

```bash
# Get profile
curl http://localhost:3000/api/profile \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Update profile
curl -X PUT http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "Updated Name",
    "bio": "My bio",
    "preferences": {
      "emailNotifications": true,
      "theme": "dark",
      "language": "en"
    }
  }'

# Change password
curl -X POST http://localhost:3000/api/profile/password \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "current_password": "OldPass123!",
    "new_password": "NewPass123!",
    "confirm_password": "NewPass123!"
  }'
```

### Channels

```bash
# List channels
curl "http://localhost:3000/api/channels?limit=10&offset=0"

# Filter by niche
curl "http://localhost:3000/api/channels?niche=Gaming"

# Filter by subscriber range
curl "http://localhost:3000/api/channels?minSubs=1000&maxSubs=10000"

# Search channels
curl "http://localhost:3000/api/channels?search=gaming"
```

### Subscription

```bash
# Get subscription status
curl http://localhost:3000/api/subscription \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Create checkout session
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"tier": "pro"}'

# Create portal session
curl -X POST http://localhost:3000/api/stripe/create-portal-session \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Cron

```bash
# Trigger channel fetch
curl -X POST http://localhost:3000/api/cron/fetch-channels \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Database Queries

### Users

```sql
-- List all users
SELECT id, email, name, subscription_tier, created_at FROM users;

-- Find user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Count users by subscription tier
SELECT subscription_tier, COUNT(*) as count 
FROM users 
GROUP BY subscription_tier;

-- List users with 2FA enabled
SELECT id, email, name FROM users WHERE two_factor_enabled = 1;
```

### Channels

```sql
-- List all channels
SELECT id, title, subscriber_count, niche, inactive_months FROM channels;

-- Find channels by niche
SELECT * FROM channels WHERE niche = 'Gaming';

-- Count channels by niche
SELECT niche, COUNT(*) as count 
FROM channels 
GROUP BY niche 
ORDER BY count DESC;

-- Find inactive channels
SELECT title, subscriber_count, inactive_months 
FROM channels 
WHERE inactive_months > 12 
ORDER BY subscriber_count DESC;

-- Find channels with social links
SELECT title, social_links 
FROM channels 
WHERE social_links IS NOT NULL AND social_links != '[]';
```

## Environment Variable Generation

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -hex 32

# Generate random password
openssl rand -base64 16
```

## Troubleshooting Commands

### Check Node.js version
```bash
node --version  # Should be 18.x or higher
```

### Check npm version
```bash
npm --version
```

### Clear Next.js cache
```bash
rm -rf .next
npm run build
```

### Check port availability
```bash
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000
```

### Kill process on port
```bash
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>
```

### Check environment variables
```bash
# Windows PowerShell
Get-Content .env.local

# macOS/Linux
cat .env.local
```

### Test database connection
```bash
turso db shell youtube-finder
> SELECT 1;
> .exit
```

### Check Vercel deployment status
```bash
vercel ls
vercel inspect <deployment-url>
```

## Monitoring

### View Vercel logs
```bash
# Real-time logs
vercel logs --follow

# Logs for specific deployment
vercel logs <deployment-url>

# Filter by function
vercel logs --filter "api/channels"
```

### Check API quota (YouTube)
```bash
# Visit Google Cloud Console
# APIs & Services > Dashboard > YouTube Data API v3 > Quotas
```

### Monitor Stripe webhooks
```bash
# Visit Stripe Dashboard
# Developers > Webhooks > [Your endpoint] > Events
```

## Backup and Restore

### Backup database
```bash
# Create backup
turso db dump youtube-finder > backup-$(date +%Y%m%d).sql

# Verify backup
ls -lh backup-*.sql
```

### Restore database
```bash
# Restore from backup
turso db shell youtube-finder < backup-20260505.sql

# Verify restoration
turso db shell youtube-finder
> SELECT COUNT(*) FROM users;
> SELECT COUNT(*) FROM channels;
```

### Backup environment variables
```bash
# Export from Vercel
vercel env pull .env.backup

# Backup to secure location
cp .env.local .env.backup-$(date +%Y%m%d)
```

## Performance Testing

### Test API response time
```bash
# Using curl
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/channels

# curl-format.txt content:
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

### Load testing with Apache Bench
```bash
# Install Apache Bench
# macOS: brew install httpd
# Ubuntu: apt-get install apache2-utils

# Run load test (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:3000/api/channels
```

### Lighthouse audit
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view
```

## Security Checks

### Check for vulnerabilities
```bash
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may break things)
npm audit fix --force
```

### Check outdated packages
```bash
npm outdated

# Update specific package
npm update package-name

# Update all packages
npm update
```

### Scan for secrets
```bash
# Install gitleaks
brew install gitleaks  # macOS

# Scan repository
gitleaks detect --source . --verbose
```

## Quick Fixes

### Reset local database
```bash
turso db shell youtube-finder
> DROP TABLE IF EXISTS users;
> DROP TABLE IF EXISTS channels;
> -- Run schema creation SQL
```

### Clear node_modules
```bash
rm -rf node_modules package-lock.json
npm install
```

### Reset Vercel deployment
```bash
vercel remove <project-name>
vercel link
vercel --prod
```

### Regenerate Stripe webhook secret
```bash
# Delete old webhook in Stripe Dashboard
# Create new webhook
# Update STRIPE_WEBHOOK_SECRET in Vercel
vercel env rm STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_WEBHOOK_SECRET production
```

## Useful Links

- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs
- **Turso Docs**: https://docs.turso.tech
- **Stripe Docs**: https://stripe.com/docs
- **YouTube API**: https://developers.google.com/youtube/v3
- **NextAuth.js**: https://next-auth.js.org
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**Last Updated**: 2026-05-05
