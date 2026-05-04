# YouTube Channel Finder

Find undervalued YouTube channels: inactive channels with high subscriber counts targeting Russian-speaking/CIS audiences.

## Features

- 🔍 Filter by subscriber range
- 📅 Filter by inactivity period (months since last upload)
- 🌍 Focus on Russian-speaking/CIS channels
- 📊 Sortable table (subscribers, last upload date)
- 🔄 Weekly automatic data refresh via Vercel Cron

## Tech Stack

- **Frontend:** Next.js 14 (React)
- **Database:** Vercel Postgres
- **API:** YouTube Data API v3
- **Deployment:** Vercel
- **Language:** TypeScript

## Setup

1. Clone and install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Add your YouTube API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project and enable YouTube Data API v3
   - Create credentials (API Key)
   - Add to `.env.local`: `YOUTUBE_API_KEY=your_key_here`

4. Set up Vercel Postgres:
   - Deploy to Vercel or link local project: `vercel link`
   - Add Postgres: `vercel postgres create`
   - Environment variables will be automatically injected

5. Run database migration:
```bash
npm run db:migrate
```

6. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

1. Push to GitHub
2. Import to Vercel
3. Add environment variables:
   - `YOUTUBE_API_KEY`
   - `CRON_SECRET` (random string for securing cron endpoint)
4. Deploy

The weekly cron job will run every Sunday at 2 AM UTC.

## API Endpoints

- `GET /api/channels` - List channels with filters
  - Query params: `minSubs`, `maxSubs`, `inactiveMonths`, `sortBy`, `order`, `page`, `limit`
- `POST /api/cron/fetch-channels` - Trigger data fetch (secured with CRON_SECRET)

## License

MIT
