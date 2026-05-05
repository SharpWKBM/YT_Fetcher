# YouTube Channel Discovery - Multi-Query Search Strategy

**Created**: 2026-05-05
**Status**: Planning
**Approach**: Solution 1 - Multi-Query Search Strategy

---

## Overview

Replace the current hardcoded seed channel approach with a comprehensive YouTube API search system that discovers thousands of inactive channels across all regions, languages, and niches.

**Current State**: 36 channels (27 hardcoded seeds)
**Target State**: 5,000-10,000 channels per day

---

## Architecture Design

### Search Dimensions

```typescript
interface SearchDimensions {
  categories: string[];      // 20 niches (Gaming, Tech, Education, etc.)
  languages: string[];        // 50+ languages (en, ru, es, pt, de, fr, ja, ko, etc.)
  regions: string[];          // 100+ country codes (US, RU, BR, IN, etc.)
  keywords: Record<string, string[]>;  // 100+ keywords per category
  timeFilters: {
    publishedBefore: string;  // Find inactive channels
    publishedAfter: string;   // Optional: minimum age
  };
}
```

### Query Generation Strategy

```typescript
// Generate search queries by combining dimensions
for each category in categories:
  for each language in languages:
    for each region in regions:
      for each keyword in keywords[category]:
        query = {
          q: keyword,
          type: 'channel',
          regionCode: region,
          relevanceLanguage: language,
          order: 'viewCount',  // Find established channels
          maxResults: 50
        }
        
        // Execute search
        // Filter by subscriber range (10k-1M)
        // Check last upload date (12+ months inactive)
        // Store in database
```

---

## Implementation Plan

### Phase 1: Create Search Configuration
**File**: `lib/youtube/search-config.ts`

```typescript
export const SEARCH_CONFIG = {
  categories: [
    'Gaming', 'Tech & Science', 'Education', 'Entertainment',
    'Music', 'Sports & Fitness', 'News & Politics', 'Cooking & Food',
    'Travel & Adventure', 'Fashion & Beauty', 'DIY & Crafts',
    'Business & Finance', 'Health & Wellness', 'Comedy', 'Animation',
    'Documentary', 'Vlog', 'Review & Unboxing', 'Kids & Family',
    'Pets & Animals'
  ],
  
  languages: [
    'en', 'ru', 'es', 'pt', 'de', 'fr', 'ja', 'ko', 'zh', 'ar',
    'hi', 'it', 'nl', 'pl', 'tr', 'vi', 'th', 'id', 'sv', 'no',
    'da', 'fi', 'cs', 'hu', 'ro', 'uk', 'el', 'he', 'fa', 'bn'
  ],
  
  regions: [
    'US', 'RU', 'BR', 'IN', 'GB', 'DE', 'FR', 'JP', 'KR', 'CN',
    'MX', 'ES', 'IT', 'CA', 'AU', 'NL', 'PL', 'TR', 'SA', 'AR',
    'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN'
    // ... 70+ more countries
  ],
  
  keywords: {
    'Gaming': [
      'gameplay', 'walkthrough', 'tutorial', 'review', 'lets play',
      'gaming news', 'esports', 'speedrun', 'mod', 'tips'
    ],
    'Tech & Science': [
      'tech review', 'unboxing', 'tutorial', 'how to', 'science',
      'programming', 'coding', 'gadget', 'smartphone', 'laptop'
    ],
    // ... keywords for all 20 categories
  }
};
```

### Phase 2: Create Advanced Search Engine
**File**: `lib/youtube/advanced-search.ts`

```typescript
import { SEARCH_CONFIG } from './search-config';
import { getYouTubeClient, rotateApiKey } from '../youtube';

interface SearchFilters {
  minSubscribers: number;
  maxSubscribers: number;
  inactiveMonths: number;
}

export async function discoverChannelsMultiQuery(
  filters: SearchFilters,
  maxChannels: number = 1000
): Promise<YouTubeChannel[]> {
  const discoveredChannels = new Set<string>(); // Channel IDs
  const allChannels: YouTubeChannel[] = [];
  
  // Calculate publishedBefore date (12+ months ago)
  const inactiveDate = new Date();
  inactiveDate.setMonth(inactiveDate.getMonth() - filters.inactiveMonths);
  const publishedBefore = inactiveDate.toISOString();
  
  // Generate query combinations
  const queries = generateSearchQueries(publishedBefore);
  
  console.log(`[Multi-Query Search] Generated ${queries.length} search queries`);
  
  for (const query of queries) {
    if (discoveredChannels.size >= maxChannels) break;
    
    try {
      // Execute search
      const channelIds = await executeSearch(query);
      
      // Filter by subscriber range
      const filteredIds = await filterBySubscribers(
        channelIds,
        filters.minSubscribers,
        filters.maxSubscribers
      );
      
      // Get full channel details
      const channels = await getChannelDetails(filteredIds);
      
      // Filter by last upload date
      const inactiveChannels = channels.filter(ch => {
        if (!ch.lastUploadDate) return false;
        const lastUpload = new Date(ch.lastUploadDate);
        return lastUpload < inactiveDate;
      });
      
      // Add to results
      for (const channel of inactiveChannels) {
        if (!discoveredChannels.has(channel.id)) {
          discoveredChannels.add(channel.id);
          allChannels.push(channel);
        }
      }
      
      console.log(`[Multi-Query Search] Progress: ${discoveredChannels.size}/${maxChannels} channels`);
      
      // Rate limiting
      await sleep(100);
      
    } catch (error: any) {
      if (error?.code === 403 && error?.message?.includes('quota')) {
        console.log('[Multi-Query Search] Quota exceeded, rotating key...');
        rotateApiKey();
      } else {
        console.error('[Multi-Query Search] Error:', error);
      }
    }
  }
  
  console.log(`[Multi-Query Search] Discovered ${allChannels.length} channels`);
  return allChannels;
}

function generateSearchQueries(publishedBefore: string): SearchQuery[] {
  const queries: SearchQuery[] = [];
  
  // Strategy: Prioritize high-yield combinations
  // 1. Popular categories + major languages + top regions
  const priorityCategories = ['Gaming', 'Tech & Science', 'Education', 'Vlog'];
  const priorityLanguages = ['en', 'ru', 'es', 'pt', 'de', 'fr', 'ja'];
  const priorityRegions = ['US', 'RU', 'BR', 'IN', 'GB', 'DE', 'JP'];
  
  for (const category of priorityCategories) {
    const keywords = SEARCH_CONFIG.keywords[category] || [];
    
    for (const language of priorityLanguages) {
      for (const region of priorityRegions) {
        for (const keyword of keywords.slice(0, 5)) { // Top 5 keywords per category
          queries.push({
            q: keyword,
            type: 'channel',
            regionCode: region,
            relevanceLanguage: language,
            publishedBefore,
            order: 'viewCount',
            maxResults: 50
          });
        }
      }
    }
  }
  
  return queries;
}
```

### Phase 3: Update Cron Job
**File**: `pages/api/cron/fetch-channels.ts`

```typescript
import { discoverChannelsMultiQuery } from '@/lib/youtube/advanced-search';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ... auth check
  
  try {
    await initDatabase();
    
    // Use new multi-query search
    const channels = await discoverChannelsMultiQuery({
      minSubscribers: 10000,
      maxSubscribers: 1000000,
      inactiveMonths: 12
    }, 1000); // Discover 1000 channels per run
    
    // Store in database
    let inserted = 0;
    for (const channel of channels) {
      try {
        await insertChannel(channel);
        inserted++;
      } catch (error) {
        console.error(`Failed to insert channel ${channel.id}:`, error);
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Discovered and stored ${inserted} channels`,
      discovered: channels.length,
      inserted
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    res.status(500).json({ success: false, error: 'Failed to discover channels' });
  }
}
```

---

## API Quota Calculation

**Per Search Query:**
- search.list: 100 units
- channels.list (batch of 50): 1 unit
- playlistItems.list (per channel): 1 unit

**Example Run (1000 channels):**
- 200 search queries × 100 = 20,000 units
- 20 channel batches × 1 = 20 units
- 1000 playlist checks × 1 = 1,000 units
- **Total: ~21,000 units**

**With 5 API keys (50,000 units/day):**
- Can discover ~2,300 channels per day
- Run cron job 2-3 times per day

---

## Files to Create/Modify

### New Files
1. `lib/youtube/search-config.ts` - Search dimensions configuration
2. `lib/youtube/advanced-search.ts` - Multi-query search engine

### Modified Files
1. `pages/api/cron/fetch-channels.ts` - Use new search system
2. `lib/youtube.ts` - Export helper functions

### Deprecated Files
1. `lib/scrapers/channel-discovery.ts` - Replace with advanced-search.ts

---

## Success Metrics

- **Channels discovered**: 1,000+ per cron run
- **Unique channels**: 95%+ (low duplication)
- **Filter accuracy**: 90%+ match criteria (10k-1M subs, 12+ months inactive)
- **API quota usage**: <50% of daily limit
- **Execution time**: <5 minutes per run

---

**Estimated Implementation Time**: 3-4 hours
**Expected Results**: 5,000-10,000 channels per day
