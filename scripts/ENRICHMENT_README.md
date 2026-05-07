# Channel Metadata Enrichment

This script enriches channels imported from online databases with missing metadata from the YouTube API.

## What It Does

The enrichment script populates missing fields for channels:
- **language** - Channel's default language
- **region** - Channel's country/region
- **last_upload_date** - Date of most recent video upload
- **thumbnail_url** - Channel thumbnail image
- **social_links** - Social media links extracted from channel description

## How It Works

1. **Query** - Finds channels with missing metadata (NULL values)
2. **Resolve** - Converts username-based IDs (e.g., `@username`) to actual YouTube channel IDs (e.g., `UCxxx...`)
3. **Fetch** - Retrieves channel details from YouTube Data API v3
4. **Update** - Populates missing fields in the database
5. **Repeat** - Processes in batches until all channels are enriched

## Features

- **Automatic ID Resolution** - Handles both username handles (`@username`) and channel IDs (`UCxxx`)
- **API Key Rotation** - Automatically rotates between 5 API keys when quota is exceeded
- **Batch Processing** - Processes 50 channels at a time to avoid rate limits
- **Social Link Extraction** - Extracts Instagram, Twitter, TikTok, Discord, etc. from descriptions
- **Progress Tracking** - Real-time progress updates and statistics

## Usage

### Quick Test (5 channels, 2 batches)
```bash
cd D:\YTFetcher\youtube-finder
set BATCH_SIZE=5
set MAX_BATCHES=2
npx tsx scripts/enrich-channel-metadata.ts
```

### Full Production Run (all channels)
```bash
# Windows
scripts\enrich-all-channels.bat

# Linux/Mac
bash scripts/enrich-all-channels.sh
```

### Custom Configuration
```bash
set BATCH_SIZE=50        # Channels per batch (default: 50)
set MAX_BATCHES=600      # Maximum batches to process (default: 100)
npx tsx scripts/enrich-channel-metadata.ts
```

## Performance

- **Batch Size**: 50 channels per batch
- **Processing Time**: ~3-5 seconds per batch (including delays)
- **Total Time**: ~2-3 hours for 27,000 channels
- **API Quota**: Uses ~2-3 API calls per channel (search + channels.list + playlistItems.list)

## API Quota Management

The script uses YouTube Data API v3 with the following quota costs:
- **search.list**: 100 units per call (for ID resolution)
- **channels.list**: 1 unit per call
- **playlistItems.list**: 1 unit per call

With 5 API keys, you have 50,000 units/day total (10,000 per key).

**Estimated quota usage for 27,000 channels:**
- ID resolution: 27,000 × 100 = 2,700,000 units
- Channel details: 540 × 1 = 540 units (batches of 50)
- Playlist items: 27,000 × 1 = 27,000 units
- **Total**: ~2,727,540 units

**Note**: This exceeds daily quota, so the script will need to run over multiple days or you'll need additional API keys.

## Optimization Tips

1. **Add More API Keys** - Add `YOUTUBE_API_KEY_6`, `YOUTUBE_API_KEY_7`, etc. to `.env`
2. **Reduce Batch Size** - Lower `BATCH_SIZE` to reduce quota usage per run
3. **Run Overnight** - Let it run continuously to process as many as possible
4. **Resume Support** - The script automatically resumes from where it left off

## Monitoring Progress

The script outputs real-time progress:
```
--- Batch 1/100 ---
[Enrichment] Found 50 channels needing enrichment
[Enrichment] Resolving channel IDs for 50 channels...
[Resolve] gamingchannelhack -> UC5WeqqnNenYoL5ziW26CS2Q
...
[Enrichment] Resolved 50/50 channels
[Enrichment] Fetching details for 50 channels...
[Enrichment] ✓ Enriched gamingchannelhack -> UC5WeqqnNenYoL5ziW26CS2Q (Gaming Channel)
...
[Enrichment] Batch complete: 50 enriched, 0 failed

[Progress] Total: 50/50 enriched
```

## Troubleshooting

### Quota Exceeded
If you see "quota exceeded" errors:
1. The script automatically rotates to the next API key
2. If all keys are exhausted, wait 24 hours or add more keys
3. The script will resume from where it left off

### Channels Not Found
Some channels may not be found if:
- The channel was deleted or made private
- The username/handle changed
- The channel ID is invalid

These are marked as "failed" and skipped.

### Database Connection Issues
Ensure your `.env` file has valid Turso credentials:
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

## Files

- `scripts/enrich-channel-metadata.ts` - Main enrichment script
- `scripts/enrich-all-channels.bat` - Windows batch runner
- `scripts/enrich-all-channels.sh` - Linux/Mac shell runner
- `scripts/check-channel-ids.ts` - Utility to inspect channel ID formats

## Next Steps

After enrichment completes:
1. Verify the data: `SELECT COUNT(*) FROM channels WHERE language IS NOT NULL`
2. Test filters in the UI to ensure they work correctly
3. Consider running enrichment periodically to update stale data
