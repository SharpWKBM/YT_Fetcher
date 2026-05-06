# Pre-Deployment Checklist - Vercel

**Complete this checklist before deploying to ensure 100% working deployment.**

## ✅ Code Ready

- [x] Build passes locally: `npm run build`
- [x] TypeScript compiles with no errors
- [x] All tests pass: `npm test`
- [x] No console errors in browser
- [x] Git repository is clean and pushed to GitHub

## ✅ Configuration Files

- [x] `vercel.json` - Configured with crons and security headers
- [x] `next.config.js` - Image domains and optimization settings
- [x] `.gitignore` - Excludes .env files and sensitive data
- [x] `package.json` - All dependencies listed with correct versions

## ✅ Environment Variables Prepared

### Database (Required)
- [ ] `TURSO_DATABASE_URL` - Get from: `turso db show your-database`
- [ ] `TURSO_AUTH_TOKEN` - Get from: `turso db tokens create your-database`

### Authentication (Required)
- [ ] `NEXTAUTH_URL` - Will be: `https://your-project.vercel.app`
- [ ] `NEXTAUTH_SECRET` - Generate: `openssl rand -base64 32`

### YouTube API (Required)
- [ ] `YOUTUBE_API_KEY` - From Google Cloud Console
- [ ] `YOUTUBE_API_KEY_2` (optional - for quota rotation)
- [ ] `YOUTUBE_API_KEY_3` (optional)
- [ ] `YOUTUBE_API_KEY_4` (optional)
- [ ] `YOUTUBE_API_KEY_5` (optional)

### OAuth Providers (Required for login)
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GITHUB_CLIENT_ID` - From GitHub Developer Settings
- [ ] `GITHUB_CLIENT_SECRET`

### Stripe (Required for subscriptions)
- [ ] `STRIPE_SECRET_KEY` - From Stripe Dashboard
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET` - Will get after creating webhook
- [ ] `STRIPE_PRO_PRICE_ID` - Create product/price in Stripe
- [ ] `STRIPE_ENTERPRISE_PRICE_ID`

### Cron Security (Required)
- [ ] `CRON_SECRET` - Generate: `openssl rand -hex 32`

### Optional
- [ ] `ADMIN_EMAIL` - Your admin email
- [ ] `SCRAPING_INACTIVITY_MONTHS` - Default: 0
- [ ] `SCRAPING_MAX_CHANNELS_PER_RUN` - Default: 50
- [ ] `ENABLE_WEBSITE_SCRAPING` - Default: false

## ✅ External Services Setup

### Turso Database
- [ ] Database created: `turso db create youtube-finder`
- [ ] Connection tested: `turso db shell youtube-finder`
- [ ] Schema will be auto-initialized on first API call

### Google Cloud Console
- [ ] YouTube Data API v3 enabled
- [ ] API keys created (1-5 keys)
- [ ] OAuth 2.0 Client created
- [ ] Redirect URI ready to add: `https://your-project.vercel.app/api/auth/callback/google`

### GitHub Developer Settings
- [ ] OAuth App created
- [ ] Callback URL ready to add: `https://your-project.vercel.app/api/auth/callback/github`

### Stripe Dashboard
- [ ] Account created and verified
- [ ] Products created (Pro, Enterprise)
- [ ] Prices created (monthly recurring)
- [ ] Webhook endpoint ready to add: `https://your-project.vercel.app/api/stripe/webhook`

## ✅ Deployment Steps

1. [ ] Push code to GitHub
2. [ ] Import repository to Vercel
3. [ ] Add all environment variables in Vercel dashboard
4. [ ] Deploy to production
5. [ ] Update OAuth redirect URIs with actual Vercel URL
6. [ ] Create Stripe webhook with actual Vercel URL
7. [ ] Redeploy after adding webhook secret
8. [ ] Test authentication (Google, GitHub)
9. [ ] Test subscription flow
10. [ ] Test channel search and filters

## ✅ Post-Deployment Verification

### Functionality
- [ ] Homepage loads without errors
- [ ] Channel list displays
- [ ] Filters work (tags, niches, subscribers)
- [ ] Search functionality works
- [ ] User registration works
- [ ] OAuth login works (Google, GitHub)
- [ ] Profile editing works
- [ ] Subscription upgrade works
- [ ] Stripe checkout completes
- [ ] Billing portal accessible

### Security
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Security headers present (check browser dev tools)
- [ ] No environment variables exposed in client
- [ ] API routes require authentication where needed
- [ ] Stripe webhook signature verified

### Performance
- [ ] Page load time < 3 seconds
- [ ] Images optimized (Next.js Image component)
- [ ] No console errors
- [ ] Lighthouse score > 90

### Cron Jobs
- [ ] Cron jobs visible in Vercel dashboard
- [ ] Manual trigger works: `curl -X POST https://your-project.vercel.app/api/cron/fetch-channels -H "Authorization: Bearer YOUR_CRON_SECRET"`

## 🚀 Ready to Deploy!

Once all checkboxes are complete, you're ready to deploy with 100% confidence.

**Quick Deploy Command:**
```bash
git push origin main
# Then import to Vercel dashboard
```

**Or use Vercel CLI:**
```bash
vercel --prod
```

## 📚 Documentation

- **Quick Start**: See `VERCEL_QUICK_START.md`
- **Full Guide**: See `DEPLOYMENT.md`
- **Troubleshooting**: See `DEPLOYMENT.md` → Troubleshooting section

## 🆘 Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Review `DEPLOYMENT.md` troubleshooting section
3. Verify all environment variables are set correctly
4. Test locally first: `npm run build && npm start`
