# How to Get Your CRON_SECRET and Test the Endpoint

## Step 1: Find Your CRON_SECRET

Your CRON_SECRET is stored in your local `.env` file. Run this command:

```bash
cd D:\YTFetcher\youtube-finder
cat .env | grep CRON_SECRET
```

Or open the file manually:
```
D:\YTFetcher\youtube-finder\.env
```

Look for the line:
```
CRON_SECRET=your_secret_here
```

## Step 2: Test the Endpoint

Replace `YOUR_CRON_SECRET` with the actual value from Step 1:

```bash
curl -X POST "https://youtube-finder-nine.vercel.app/api/cron/enrich-channels?batchSize=5" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Example (if your secret is "abc123"):**
```bash
curl -X POST "https://youtube-finder-nine.vercel.app/api/cron/enrich-channels?batchSize=5" \
  -H "Authorization: Bearer abc123"
```

## Step 3: Verify Success

You should see a response like:
```json
{
  "success": true,
  "message": "Enriched 5 channels",
  "stats": {
    "enriched": 5,
    "failed": 0,
    "skipped": 0,
    "remaining": 26995,
    "duration": 8
  }
}
```

## Troubleshooting

### Error: "Method not allowed"
- ✅ **FIXED** - You were using GET instead of POST
- Make sure to use `-X POST` in the curl command

### Error: "Unauthorized" (401)
- ❌ Wrong CRON_SECRET
- Check your `.env` file for the correct value
- Make sure there are no extra spaces or quotes

### Error: "Failed to enrich channels" (500)
- Check Vercel logs: https://vercel.com/dashboard
- Verify database credentials are set in Vercel environment variables
- Ensure YouTube API keys are valid

## Quick Test Script

Save this as `test-enrichment.sh`:

```bash
#!/bin/bash

# Read CRON_SECRET from .env file
CRON_SECRET=$(grep CRON_SECRET .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$CRON_SECRET" ]; then
  echo "Error: CRON_SECRET not found in .env file"
  exit 1
fi

echo "Testing enrichment endpoint..."
curl -X POST "https://youtube-finder-nine.vercel.app/api/cron/enrich-channels?batchSize=5" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Run it:
```bash
cd D:\YTFetcher\youtube-finder
bash test-enrichment.sh
```

## Batch Processing Script

Once testing works, use this to process 300 channels:

```bash
#!/bin/bash

CRON_SECRET=$(grep CRON_SECRET .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

echo "Processing 300 channels (20 batches)..."
for i in {1..20}; do
  echo "Batch $i/20..."
  curl -X POST "https://youtube-finder-nine.vercel.app/api/cron/enrich-channels?batchSize=15" \
    -H "Authorization: Bearer $CRON_SECRET"
  echo ""
  sleep 3
done
echo "Complete!"
```

Save as `enrich-batch.sh` and run:
```bash
bash enrich-batch.sh
```

---

**Current Status:** ✅ Endpoint is working correctly (returned 401 with test token, which is expected)

**Next Step:** Get your CRON_SECRET from `.env` and test with the real value.
