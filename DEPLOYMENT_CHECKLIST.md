# Deployment Checklist

Use this checklist to deploy your upgraded YouTube Channel Finder to production.

## ☐ Step 1: Set Up YouTube API Keys (30 minutes)

Follow `API_KEY_SETUP.md` to create 5 API keys:

- [ ] Create Google Cloud Project #1, enable YouTube API, generate key
- [ ] Create Google Cloud Project #2, enable YouTube API, generate key
- [ ] Create Google Cloud Project #3, enable YouTube API, generate key
- [ ] Create Google Cloud Project #4, enable YouTube API, generate key
- [ ] Create Google Cloud Project #5, enable YouTube API, generate key
- [ ] Save all 5 keys securely

## ☐ Step 2: Set Up OAuth Authentication (20 minutes)

Follow `AUTH_SETUP.md`:

### Google OAuth
- [ ] Go to Google Cloud Console → APIs & Services → Credentials
- [ ] Create OAuth client ID (Web application)
- [ ] Add authorized origins: `http://localhost:3000` and your Vercel URL
- [ ] Add redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://your-app.vercel.app/api/auth/callback/google`
- [ ] Copy Client ID and Client Secret

### GitHub OAuth
- [ ] Go to GitHub Settings → Developer settings → OAuth Apps
- [ ] Create new OAuth app
- [ ] Set callback URL: `https://your-app.vercel.app/api/auth/callback/github`
- [ ] Copy Client ID and Client Secret

### Generate NextAuth Secret
- [ ] Run: `openssl rand -base64 32`
- [ ] Copy the generated secret

## ☐ Step 3: Configure Environment Variables (10 minutes)

### Local Development (.env.local)
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add all 5 YouTube API keys
- [ ] Add Google OAuth credentials
- [ ] Add GitHub OAuth credentials
- [ ] Add NEXTAUTH_SECRET
- [ ] Set NEXTAUTH_URL to `http://localhost:3000`

### Vercel Production
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

- [ ] `TURSO_DATABASE_URL` (already set)
- [ ] `TURSO_AUTH_TOKEN` (already set)
- [ ] `YOUTUBE_API_KEY` = first key
- [ ] `YOUTUBE_API_KEY_2` = second key
- [ ] `YOUTUBE_API_KEY_3` = third key
- [ ] `YOUTUBE_API_KEY_4` = fourth key
- [ ] `YOUTUBE_API_KEY_5` = fifth key
- [ ] `CRON_SECRET` (already set)
- [ ] `NEXTAUTH_URL` = your Vercel URL (e.g., `https://youtube-finder-nine.vercel.app`)
- [ ] `NEXTAUTH_SECRET` = generated secret
- [ ] `GOOGLE_CLIENT_ID` = from Google OAuth
- [ ] `GOOGLE_CLIENT_SECRET` = from Google OAuth
- [ ] `GITHUB_CLIENT_ID` = from GitHub OAuth
- [ ] `GITHUB_CLIENT_SECRET` = from GitHub OAuth

## ☐ Step 4: Test Locally (10 minutes)

- [ ] Run `npm install` to ensure next-auth is installed
- [ ] Run `npm run dev`
- [ ] Visit `http://localhost:3000`
- [ ] Click "Sign In" and test Google login
- [ ] Click "Sign In" and test GitHub login
- [ ] Verify tier badge shows "Free"
- [ ] Verify usage counter shows "0/10 viewed"
- [ ] Browse channels and verify counter increments
- [ ] Verify upgrade banner appears at 10 views

## ☐ Step 5: Deploy to Production (5 minutes)

```bash
git add .
git commit -m "feat: upgrade to subscription-ready SaaS product

- Add API key rotation (5x quota, zero cost)
- Add Google & GitHub OAuth authentication
- Add professional dashboard UI with tier badges
- Add user tier system (Free/Pro/Enterprise)
- Add usage tracking and limits
- Add upgrade banner for free tier users"

git push
```

- [ ] Wait for Vercel to deploy
- [ ] Check deployment logs for errors

## ☐ Step 6: Test Production (10 minutes)

- [ ] Visit your production URL
- [ ] Test Google sign-in
- [ ] Test GitHub sign-in
- [ ] Verify tier badge appears
- [ ] Verify usage counter works
- [ ] Browse 10 channels to hit free tier limit
- [ ] Verify upgrade banner appears
- [ ] Check Vercel logs for any errors

## ☐ Step 7: Verify Database (5 minutes)

- [ ] Check Turso dashboard
- [ ] Verify `users` table was created
- [ ] Verify your user record exists
- [ ] Verify `channels_viewed_this_month` increments

## ☐ Step 8: Monitor Cron Job (Optional)

- [ ] Wait for next weekly cron run (check `vercel.json` schedule)
- [ ] Check Vercel logs for cron execution
- [ ] Verify new channels are being added to database
- [ ] Verify API key rotation is working (check logs for rotation messages)

---

## 🎉 Launch Complete!

Once all steps are checked, your app is live and ready for users!

## Next Steps (Optional)

### Add Stripe for Revenue (When Ready)
- [ ] Create Stripe account
- [ ] Install Stripe packages: `npm install stripe @stripe/stripe-js`
- [ ] Create Stripe products for Pro ($29/mo) and Enterprise ($99/mo)
- [ ] Add Stripe checkout API route
- [ ] Add Stripe webhook for payment events
- [ ] Wire up "Upgrade" button to Stripe checkout
- [ ] Test with Stripe test mode
- [ ] Go live with Stripe

### Marketing & Growth
- [ ] Add Google Analytics
- [ ] Create landing page copy
- [ ] Set up email collection
- [ ] Share on Reddit, Twitter, Product Hunt
- [ ] Create demo video
- [ ] Write blog post about the tool

---

## Troubleshooting

### "Redirect URI mismatch" error
- Verify OAuth redirect URIs exactly match your Vercel URL
- No trailing slashes
- Use `https://` for production

### "Invalid client" error
- Double-check Client ID and Client Secret
- Ensure environment variables are set in Vercel
- Redeploy after adding variables

### Database errors
- Check Turso credentials are correct
- Verify database is accessible from Vercel
- Check Vercel logs for detailed error messages

### API quota exceeded
- Verify all 5 API keys are set in Vercel
- Check Google Cloud Console for quota usage
- Ensure keys are from different projects

---

**Estimated Total Time**: 90 minutes
**Cost**: $0
**Result**: Production-ready SaaS product 🚀
