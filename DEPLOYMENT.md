# YouTube Channel Finder - Deployment Guide

## Prerequisites

1. **YouTube API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable YouTube Data API v3
   - Create credentials (API Key)
   - Copy the API key

2. **GitHub Repository**
   - Create a new repository on GitHub
   - Push this code to the repository

## Deployment Steps

### 1. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 2. Add Vercel Postgres

1. In your Vercel project dashboard, go to "Storage" tab
2. Click "Create Database"
3. Select "Postgres"
4. Choose a region close to your users (e.g., Frankfurt for CIS)
5. Click "Create"
6. Vercel will automatically inject environment variables

### 3. Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
YOUTUBE_API_KEY=your_youtube_api_key_here
CRON_SECRET=generate_random_string_here
```

To generate a secure CRON_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Deploy

1. Click "Deploy" in Vercel
2. Wait for deployment to complete
3. Your app will be live at `https://your-project.vercel.app`

### 5. Initialize Database

After first deployment, manually trigger the cron endpoint to create the database schema and fetch initial data:

```bash
curl -X POST https://your-project.vercel.app/api/cron/fetch-channels \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 6. Verify Cron Job

The cron job is configured to run every Sunday at 2 AM UTC (see `vercel.json`).

To test it manually:
```bash
curl -X POST https://your-project.vercel.app/api/cron/fetch-channels \
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

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```bash
cp .env.example .env.local
```

3. Add your API keys to `.env.local`

4. Link to Vercel project (to use Vercel Postgres locally):
```bash
npx vercel link
npx vercel env pull .env.local
```

5. Run development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Troubleshooting

### YouTube API Quota Exceeded

- Free tier: 10,000 units/day
- Each channel fetch uses ~102 units
- Limit: ~98 channels/day
- Solution: Reduce batch size or upgrade to paid tier

### Database Connection Issues

- Verify Vercel Postgres is created
- Check environment variables are set
- Ensure `@vercel/postgres` package is installed

### Cron Job Not Running

- Verify `vercel.json` is in root directory
- Check Vercel logs for cron execution
- Ensure `CRON_SECRET` matches in both Vercel settings and your test requests

### No Channels Showing

- Run the cron endpoint manually to populate database
- Check browser console for API errors
- Verify filters aren't too restrictive

## API Quota Management

Current configuration fetches 50 channels per week (Sunday 2 AM UTC).

To adjust:
- Edit `vercel.json` cron schedule
- Modify batch size in `pages/api/cron/fetch-channels.ts`

## Next Steps

- Add more search queries (different keywords, regions)
- Implement channel quality scoring
- Add email notifications for new findings
- Export results to CSV
- Add authentication for private use
