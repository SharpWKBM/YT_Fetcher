# YouTube API Quota Optimization

## Problem

The background channel parsing was returning 0 channels because all 5 YouTube API keys exhausted their daily quota limits.

### Root Cause

The original search strategy generated **980 search queries**:
- 4 categories × 7 languages × 7 regions × 5 keywords = 980 queries
- Each YouTube API search costs **100 quota units**
- Total cost: 980 × 100 = **98,000 units**
- Daily limit per key: **10,000 units**
- Even with 5 keys (50,000 units total), this exhausted all keys in minutes

### Symptoms

Logs showed:
```
[Multi-Query Search] Quota exceeded, rotating key...
[YouTube API] Rotated to key 3/5
[Multi-Query Search] Quota exceeded, rotating key...
[YouTube API] Rotated to key 4/5
...
```

The system cycled through all 5 keys repeatedly, hitting quota limits on each one.

## Solution

### 1. Drastically Reduced Query Count (97% reduction)

**Before:**
- 4 categories, 7 languages, 7 regions, 5 keywords = 980 queries
- Cost: 98,000 units (exceeds all 5 keys combined)

**After:**
- 2 categories, 3 languages, 3 regions, 2 keywords = 36 queries
- Cost: 3,600 units (fits in 1 key's daily quota)

### 2. Added Quota Exhaustion Detection

```typescript
let consecutiveQuotaErrors = 0;
const MAX_CONSECUTIVE_QUOTA_ERRORS = 5;

// Stop if we've hit quota limits on all keys
if (consecutiveQuotaErrors >= MAX_CONSECUTIVE_QUOTA_ERRORS) {
  console.log(`[Multi-Query Search] All API keys exhausted. Stopping search.`);
  break;
}
```

This prevents infinite loops when all keys are exhausted.

### 3. Enhanced Logging

Added detailed logging at each step:
- Query being executed
- Number of channels found
- Number after subscriber filter
- Number after inactivity filter

## Current Status

✅ **Optimization deployed** (commit b4cc8f2)
⏳ **Waiting for quota reset** - YouTube API quotas reset at midnight Pacific Time

## Expected Results After Quota Reset

With the optimized search:
- 36 queries × 100 units = 3,600 units per run
- Daily limit: 10,000 units per key
- Can run ~2.7 times per day per key
- With 5 keys: ~13 runs per day
- Target: 20 channels per run
- Expected: ~260 channels per day

## Quota Cost Breakdown

| Operation | Cost per call | Notes |
|-----------|--------------|-------|
| search.list | 100 units | Most expensive |
| channels.list | 1 unit | Cheap |
| playlistItems.list | 1 unit | Cheap |

## Recommendations

1. **Wait for quota reset** (midnight PST/PDT)
2. **Monitor first run** after reset to verify channels are found
3. **Consider increasing cron frequency** from hourly to every 2-3 hours
4. **Add more API keys** if higher throughput needed

## Testing After Quota Reset

```bash
curl -X POST "https://youtube-finder-nine.vercel.app/api/cron/fetch-channels" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Fetched and stored 20 channels",
  "fetched": 20,
  "inserted": 20
}
```

## Future Optimizations

If more channels needed:
1. Add more YouTube API keys (each adds 10,000 units/day)
2. Gradually expand search parameters (more languages/regions)
3. Implement smart caching to avoid re-searching same channels
4. Use YouTube Data API v3 quotas more efficiently with batch operations
