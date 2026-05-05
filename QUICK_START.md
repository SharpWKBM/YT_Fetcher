# 🚀 Quick Start - Deploy in 30 Minutes

This guide gets you from zero to production in 30 minutes.

---

## Prerequisites (5 minutes)

You need accounts for:
- [ ] Google Cloud Console (for YouTube API + OAuth)
- [ ] GitHub (for OAuth + code hosting)
- [ ] Stripe (for payments)
- [ ] Turso (for database)
- [ ] Vercel (for hosting)

---

## Step 1: Get API Keys (10 minutes)

### YouTube API Keys (5 keys)
```bash
1. Go to: https://console.cloud.google.com/
2. Create project: "YouTube Channel Finder"
3. Enable: YouTube Data API v3
4. Create 5 API keys (Credentials → Create → API Key)
5. Restrict each to YouTube Data API v3
6. Copy all 5 keys
```

### Google OAuth
```bash
1. Same project, go to: Credentials → Create → OAuth 2.0 Client ID
2. Application type: Web application
3. Authorized redirect URIs:
   - https://YOUR-DOMAIN.vercel.app/api/auth/callback/google
4. Copy Client ID and Secret
```

### GitHub OAuth
```bash
1. Go to: https://github.com/settings/developers
2. New OAuth App
3. Callback URL: https://YOUR-DOMAIN.vercel.app/api/auth/callback/github
4. Copy Client ID and Secret
```

### Stripe
```bash
1. Go to: https://dashboard.stripe.com/
2. Get API keys: Developers → API keys
3. Create products:
   stripe products create --name "Pro Plan"
   stripe prices create --product prod_XXX --unit-amount 999 --currency usd --recurring[interval]=month
   
   stripe products create --name "Enterprise Plan"
   stripe prices create --product prod_XXX --unit-amount 2999 --currency usd --recurring[interval]=month
4. Copy: Secret Key, Publishable Key, Price IDs
5. Create webhook: https://YOUR-DOMAIN.vercel.app/api/stripe/webhook
6. Copy webhook secret
```

### Turso Database
```bash
# Install CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create youtube-finder

# Get credentials
turso db show youtube-finder
turso db tokens create youtube-finder

# Copy: Database URL and Auth Token
```

---

## Step 2: Deploy to Vercel (5 minutes)

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/youtube-finder.git
git push -u origin main
```

### Deploy on Vercel
```bash
1. Go to: https://vercel.com/new
2. Import your GitHub repository
3. Framework: Next.js (auto-detected)
4. Click "Deploy" (will fail - need env vars)
```

---

## Step 3: Configure Environment Variables (5 minutes)

In Vercel dashboard → Settings → Environment Variables, add:

```bash
# Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_token

# YouTube (5 keys)
YOUTUBE_API_KEY=key1
YOUTUBE_API_KEY_2=key2
YOUTUBE_API_KEY_3=key3
YOUTUBE_API_KEY_4=key4
YOUTUBE_API_KEY_5=key5

# Cron (generate: openssl rand -hex 32)
CRON_SECRET=your_64_char_hex

# NextAuth (generate: openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_32_char_secret

# OAuth
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GITHUB_CLIENT_ID=your_github_id
GITHUB_CLIENT_SECRET=your_github_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx
```

Click "Redeploy" after adding all variables.

---

## Step 4: Initialize Database (3 minutes)

```bash
# Connect to database
turso db shell youtube-finder

# Paste and run this SQL:
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

# Exit
.exit
```

---

## Step 5: Populate Initial Data (2 minutes)

```bash
# Trigger cron job to fetch channels
curl -X POST https://your-domain.vercel.app/api/cron/fetch-channels \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should return:
# {"success":true,"message":"Fetched and stored 45 channels","fetched":50,"inserted":45}
```

---

## Step 6: Test Everything (5 minutes)

### Test Authentication
1. Visit: https://your-domain.vercel.app
2. Click "Sign In"
3. Test Google OAuth login ✓
4. Test GitHub OAuth login ✓
5. Test email/password registration ✓

### Test Profile
1. Go to Profile
2. Upload avatar ✓
3. Edit bio ✓
4. Enable 2FA ✓
5. Change password ✓

### Test Subscription
1. Go to Subscription page
2. Click "Upgrade to Pro"
3. Use test card: 4242 4242 4242 4242
4. Complete checkout ✓
5. Verify subscription status ✓
6. Access billing portal ✓

### Test Channel Discovery
1. Go to homepage
2. View channel list ✓
3. Use filters (niche, subscribers, activity) ✓
4. Search channels ✓
5. Check social media links ✓

---

## ✅ You're Live!

Your YouTube Channel Finder is now live at:
**https://your-domain.vercel.app**

---

## Next Steps

### Immediate
- [ ] Update OAuth redirect URIs with custom domain (if using)
- [ ] Update Stripe webhook endpoint with custom domain (if using)
- [ ] Test all features thoroughly
- [ ] Monitor Vercel logs for errors

### This Week
- [ ] Add custom domain (optional)
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Configure error alerts
- [ ] Test with real users

### This Month
- [ ] Gather user feedback
- [ ] Optimize performance
- [ ] Add more features
- [ ] Scale as needed

---

## Troubleshooting

### Build Failed
```bash
# Check Vercel logs
vercel logs --follow

# Common issues:
- Missing environment variables
- TypeScript errors
- Dependency issues
```

### Database Connection Failed
```bash
# Test connection
turso db shell youtube-finder

# Verify credentials
echo $TURSO_DATABASE_URL
echo $TURSO_AUTH_TOKEN
```

### OAuth Not Working
```bash
# Check redirect URIs match exactly:
- Vercel: https://your-domain.vercel.app/api/auth/callback/google
- Google Console: Same URL
- GitHub: Same URL
```

### Stripe Webhook Failed
```bash
# Check webhook signature
# Verify endpoint: https://your-domain.vercel.app/api/stripe/webhook
# Check Stripe dashboard → Webhooks → Events
```

### Cron Job Not Running
```bash
# Test manually
curl -X POST https://your-domain.vercel.app/api/cron/fetch-channels \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check Vercel logs
vercel logs --filter "cron"
```

---

## Support

- **Documentation**: See DEPLOYMENT.md for detailed guide
- **Checklist**: See DEPLOYMENT_CHECKLIST.md for complete checklist
- **Reference**: See QUICK_REFERENCE.md for common commands
- **Vercel Support**: https://vercel.com/support
- **Stripe Support**: https://support.stripe.com

---

## 🎉 Congratulations!

You've successfully deployed the YouTube Channel Finder!

**Total Time**: ~30 minutes
**Status**: ✅ Production Ready
**Next**: Start discovering channels!

---

**Generated**: 2026-05-05
**Version**: 1.0.0
