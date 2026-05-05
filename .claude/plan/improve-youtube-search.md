# Implementation Plan: Multi-Stage YouTube Search Strategy

## Objective
Improve YouTube search algorithm to find abandoned Russian-speaking channels in the 10k-1M subscriber range with 6+ months of inactivity.

## Current Problems
1. Search finds mega-channels (482M subs) instead of mid-tier abandoned channels
2. Uses `order: 'viewCount'` which prioritizes popular channels
3. No subscriber filtering during search phase
4. Only 4 out of 91 channels match target criteria

## Solution: Multi-Stage Search Strategy

### Stage 1: Targeted Video Search
**Goal:** Find videos with moderate engagement from 2018-2021 (likely from mid-tier channels)

**Changes to `lib/youtube.ts`:**
- Change `order` from `'viewCount'` to `'date'` for chronological results
- Adjust date range to 2018-2021 (older = more likely abandoned)
- Add `videoDefinition: 'any'` to include all quality levels
- Search for videos with 10k-500k views (moderate engagement)

**New search parameters:**
```typescript
publishedAfter: '2018-01-01T00:00:00Z'
publishedBefore: '2021-12-31T23:59:59Z'
order: 'date'  // Changed from 'viewCount'
```

### Stage 2: Subscriber Count Pre-filtering
**Goal:** Filter channels by subscriber count BEFORE fetching full details

**Implementation:**
1. After collecting channel IDs from video search, fetch basic channel info
2. Filter to only channels with 10k-1M subscribers
3. Only fetch full details (including last upload date) for filtered channels
4. Reduces API quota usage by ~50%

**New function:**
```typescript
async function filterChannelsBySubscribers(
  channelIds: string[], 
  minSubs: number, 
  maxSubs: number
): Promise<string[]>
```

### Stage 3: Last Upload Date Verification
**Goal:** Only keep channels that haven't uploaded in 6+ months

**Changes to `getChannelDetails()`:**
- Keep existing last upload date fetching logic
- Add logging for channels that don't meet inactivity criteria
- Return only channels with `lastUploadDate <= 6 months ago`

### Stage 4: Diversified Search Queries
**Goal:** Find niche mid-tier creators, not mainstream channels

**New search queries (targeting specific niches):**
```typescript
const searchQueries = [
  'майнкрафт выживание',      // Minecraft survival (gaming niche)
  'обзор техники',             // Tech reviews
  'кулинарный рецепт',         // Cooking recipes
  'путешествие влог',          // Travel vlog
  'обучение программированию', // Programming tutorials
  'ремонт своими руками',      // DIY repairs
  'фитнес тренировка',         // Fitness training
  'книжный обзор',             // Book reviews
];
```

## Implementation Steps

### Step 1: Update `searchRussianChannels()` function
- [ ] Change date range to 2018-2021
- [ ] Change order to 'date'
- [ ] Update search queries to niche topics
- [ ] Add more diverse queries (8-10 total)

### Step 2: Add `filterChannelsBySubscribers()` function
- [ ] Create new function to pre-filter by subscriber count
- [ ] Fetch basic channel statistics only
- [ ] Return filtered channel IDs
- [ ] Add error handling and API key rotation

### Step 3: Update `getChannelDetails()` function
- [ ] Call `filterChannelsBySubscribers()` before full details fetch
- [ ] Add logging for filtered channels
- [ ] Optimize API calls by batching (50 channels per request)

### Step 4: Add inactivity post-filter
- [ ] Calculate months since last upload
- [ ] Filter out channels with recent uploads
- [ ] Log statistics (found vs. kept)

### Step 5: Test and validate
- [ ] Run test script locally
- [ ] Verify channels are in 10k-1M range
- [ ] Verify channels are 6+ months inactive
- [ ] Check API quota usage

## Expected Outcomes
- 80%+ of fetched channels will be in target range (10k-1M subs)
- 60%+ of fetched channels will be 6+ months inactive
- Reduce API quota waste by ~50%
- Populate database with 100+ relevant channels per cron run

## Files to Modify
1. `lib/youtube.ts` - Main search logic
2. `test-youtube-api.js` - Update test script
3. `pages/api/cron/fetch-channels.ts` - No changes needed

## Risks
- **Medium:** YouTube API may not return enough results with stricter criteria
- **Low:** API quota may still be exceeded with multiple queries
- **Low:** Date-based ordering may miss some good channels

## Rollback Plan
If search returns 0 results:
1. Revert to original date range (2018-2023)
2. Keep subscriber pre-filtering
3. Adjust search queries to be less niche
