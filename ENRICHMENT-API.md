# Channel Enrichment API Endpoint

## Overview

This endpoint enriches YouTube channel metadata by fetching missing information from the YouTube Data API v3. It's designed to run as a Vercel serverless function with automatic cron scheduling.

## Endpoint

**POST** `/api/cron/enrich-channels`

## Authentication

Requires Bearer token authentication:
```
Authorization: Bearer <CRON_SECRET>
```

## Query Parameters

- `batchSize` (optional, default: 15) - Number of channels to process per batch
- `skipResolution` (optional, default: false) - Skip channels without proper IDs (saves API quota)

## Response Format

```json
{
  "success": true,
  "message": "Enriched 15 channels",
  "stats": {
    "enriched": 15,
    "failed": 0,
    "skipped": 0,
    "remaining": 26985,
    "duration": 12
  }
}
```

## How It Works

1. **Query Database**: Fetches channels with missing metadata (NULL language, region, last_upload_date, or thumbnail_url)
2. **Resolve IDs**: For channels with proper IDs (starting with `UC`), uses them directly. For handle-based IDs, optionally resolves to proper channel IDs
3. **Fetch Metadata**: Calls YouTube Data API to get channel details
4. **Extract Data**: Parses language, region, thumbnail, social links, and last upload date
5. **Update Database**: Saves enriched metadata back to Turso database

## Cron Schedule

Runs automatically every 10 minutes via Vercel Cron:
- **Schedule**: `*/10 * * * *`
- **Channels per run**: 15
- **Daily throughput**: ~2,160 channels
- **Time to complete 27K channels**: ~12.5 days

## API Quota Usage

- **Per channel**: ~3 API units (channels.list + playlistItems.list)
- **Per batch**: ~45 units (15 channels × 3 units)
- **Daily usage**: ~2,160 units (well within 50K daily limit with 5 keys)

## Manual Triggering

You can manually trigger enrichment batches:

```bash
# Test locally
curl -X POST "http://localhost:3000/api/cron/enrich-channels?batchSize=5" \
  -H "Authorization: Bearer your-cron-secret"

# Production
curl -X POST "https://your-app.vercel.app/api/cron/enrich-channels?batchSize=5" \
  -H "Authorization: Bearer your-cron-secret"
```

## Environment Variables Required

- `CRON_SECRET` - Authentication token
- `YOUTUBE_API_KEY` through `YOUTUBE_API_KEY_5` - YouTube Data API keys
- `TURSO_DATABASE_URL` - Turso database connection URL
- `TURSO_AUTH_TOKEN` - Turso authentication token

## Monitoring

Check enrichment progress:

```sql
SELECT 
  COUNT(*) as total,
  COUNT(language) as has_language,
  COUNT(region) as has_region,
  COUNT(last_upload_date) as has_last_upload,
  COUNT(thumbnail_url) as has_thumbnail
FROM channels;
```

## Error Handling

- **Quota Exceeded**: Automatically rotates to next API key and retries
- **Channel Not Found**: Marks as failed, continues with next channel
- **Timeout**: Processes as many channels as possible within 60s limit
- **Database Error**: Returns 500 error, cron will retry in 10 minutes

## Files

- `pages/api/cron/enrich-channels.ts` - API endpoint handler
- `lib/enrichment.ts` - Core enrichment logic
- `vercel.json` - Cron configuration
