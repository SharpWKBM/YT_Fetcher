# Vercel Free Tier Workaround

## Issue

Vercel's Hobby (free) plan only allows **daily cron jobs**, not every 10 minutes as originally planned.

## Solution Options

### Option 1: Daily Cron + Larger Batches (Recommended for Free Tier)

**Configuration:**
- Cron: Once per day at 2 AM UTC
- Batch size: 75 channels per run
- Daily throughput: 75 channels
- Time to complete 27K: ~360 days

**Update `vercel.json`:**
```json
{
  "path": "/api/cron/enrich-channels",
  "schedule": "0 2 * * *"
}
```

**Pros:**
- ✅ Free
- ✅ No manual intervention needed
- ✅ Stays within API quota

**Cons:**
- ⏱️ Very slow (1 year to complete)

---

### Option 2: Manual Triggering (Fast & Free)

**No cron job needed** - manually trigger the endpoint multiple times:

```bash
# Run this script to process 300 channels (20 batches)
for i in {1..20}; do
  curl -X POST "https://your-app.vercel.app/api/cron/enrich-channels?batchSize=15" \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  sleep 3
done
```

**Schedule:**
- Run this script 2-3 times per day
- Each run: 300 channels (~5 minutes)
- Daily throughput: 600-900 channels
- Time to complete 27K: ~30-45 days

**Pros:**
- ✅ Free
- ✅ Fast completion
- ✅ Full control over timing

**Cons:**
- ⚠️ Requires manual execution

---

### Option 3: Upgrade to Vercel Pro ($20/month)

**Configuration:**
- Cron: Every 10 minutes (as originally designed)
- Batch size: 15 channels
- Daily throughput: 2,160 channels
- Time to complete 27K: ~12.5 days

**Pros:**
- ✅ Fully automated
- ✅ Fast completion
- ✅ No manual work

**Cons:**
- 💰 $20/month cost

---

### Option 4: GitHub Actions (Free Alternative)

Create `.github/workflows/enrich-channels.yml`:

```yaml
name: Enrich Channels
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  enrich:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Enrichment
        run: |
          curl -X POST "${{ secrets.VERCEL_URL }}/api/cron/enrich-channels?batchSize=15" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Setup:**
1. Add secrets in GitHub repo settings:
   - `VERCEL_URL`: Your Vercel deployment URL
   - `CRON_SECRET`: Your cron secret
2. Commit workflow file
3. GitHub Actions runs every 10 minutes for free

**Pros:**
- ✅ Free
- ✅ Automated (every 10 minutes)
- ✅ Fast completion (~12.5 days)

**Cons:**
- ⚠️ Requires GitHub repository
- ⚠️ Slightly more complex setup

---

## Recommended Approach

**For Free Tier:** Use **Option 2 (Manual Triggering)** or **Option 4 (GitHub Actions)**

**For Best Experience:** Upgrade to **Option 3 (Vercel Pro)** if budget allows

---

## Current Deployment Status

The code is deployed with **daily cron** (Option 1). You can:
1. Keep it as-is for slow but automated enrichment
2. Manually trigger for faster completion
3. Set up GitHub Actions for free automation
4. Upgrade to Pro for the original 10-minute schedule

The API endpoint works perfectly - only the cron frequency is limited by the free tier.
