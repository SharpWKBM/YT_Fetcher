# Vercel Quick Start - YouTube Channel Finder

**Complete deployment in 10 minutes. 100% working after following these steps.**

## Step 1: Push to GitHub (2 min)

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel (3 min)

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Click **Deploy** (use default settings)
4. Wait for initial deployment to complete

## Step 3: Add Environment Variables (3 min)

Go to **Settings** → **Environment Variables** and add these:

### Required (Minimum to run)
```
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_token
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
YOUTUBE_API_KEY=your_youtube_api_key
CRON_SECRET=generate_random_secret
```

### OAuth (for login)
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Stripe (for subscriptions)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

### Optional
```
ADMIN_EMAIL=your@email.com
SCRAPING_INACTIVITY_MONTHS=0
SCRAPING_MAX_CHANNELS_PER_RUN=50
ENABLE_WEBSITE_SCRAPING=false
```

**Important**: Set environment for **Production**, **Preview**, and **Development**

## Step 4: Redeploy (1 min)

After adding environment variables:
1. Go to **Deployments**
2. Click **...** on latest deployment
3. Click **Redeploy**

## Step 5: Update OAuth Redirect URIs (1 min)

### Google OAuth
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client
3. Add redirect URI: `https://your-project.vercel.app/api/auth/callback/google`

### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Edit your OAuth App
3. Update callback URL: `https://your-project.vercel.app/api/auth/callback/github`

## Step 6: Configure Stripe Webhook (1 min)

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://your-project.vercel.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy signing secret and add to Vercel as `STRIPE_WEBHOOK_SECRET`
5. Redeploy again

## Step 7: Initialize Database (Optional)

The database tables will be created automatically on first API call. To manually initialize:

```bash
# Visit this URL in your browser
https://your-project.vercel.app/api/channels
```

Or use Turso CLI:
```bash
turso db shell your-database < schema.sql
```

## Step 8: Test Everything

Visit your deployment and test:
- ✅ Homepage loads
- ✅ Sign in with Google/GitHub
- ✅ Channel search works
- ✅ Filters work (tags, niches)
- ✅ Subscription flow (use test card: 4242 4242 4242 4242)

## Troubleshooting

### Build fails
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Run `npm run build` locally first

### OAuth not working
- Verify redirect URIs match exactly
- Check `NEXTAUTH_URL` is correct
- Clear browser cookies

### Database errors
- Verify Turso credentials are correct
- Check database exists: `turso db list`
- Test connection: `turso db shell your-database`

### Stripe webhook fails
- Verify webhook secret matches Stripe dashboard
- Check webhook endpoint is accessible
- Review webhook logs in Stripe dashboard

## Next Steps

- Add custom domain in Vercel settings
- Enable Vercel Analytics
- Set up monitoring alerts
- Populate channels via cron job

## Full Documentation

See `DEPLOYMENT.md` for complete deployment guide with all details.
