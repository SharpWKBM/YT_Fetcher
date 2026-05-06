const { google } = require('googleapis');

// Test each API key to see which ones have quota
const API_KEYS = [
  process.env.YOUTUBE_API_KEY,
  process.env.YOUTUBE_API_KEY_2,
  process.env.YOUTUBE_API_KEY_3,
  process.env.YOUTUBE_API_KEY_4,
  process.env.YOUTUBE_API_KEY_5,
].filter(Boolean);

async function testApiKey(apiKey, index) {
  const youtube = google.youtube({
    version: 'v3',
    auth: apiKey,
  });

  try {
    // Simple search that costs 100 units
    const response = await youtube.search.list({
      part: ['snippet'],
      type: ['channel'],
      q: 'gaming',
      maxResults: 1,
    });

    console.log(`✅ Key ${index + 1}: HAS QUOTA (found ${response.data.items?.length || 0} results)`);
    return { index, hasQuota: true, key: apiKey };
  } catch (error) {
    if (error?.code === 403 && error?.message?.includes('quota')) {
      console.log(`❌ Key ${index + 1}: QUOTA EXHAUSTED`);
      return { index, hasQuota: false, key: apiKey };
    } else {
      console.log(`⚠️  Key ${index + 1}: ERROR - ${error.message}`);
      return { index, hasQuota: false, key: apiKey, error: error.message };
    }
  }
}

async function main() {
  console.log(`Testing ${API_KEYS.length} YouTube API keys...\n`);

  const results = [];
  for (let i = 0; i < API_KEYS.length; i++) {
    const result = await testApiKey(API_KEYS[i], i);
    results.push(result);

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n=== SUMMARY ===');
  const availableKeys = results.filter(r => r.hasQuota);
  console.log(`Available keys: ${availableKeys.length}/${API_KEYS.length}`);

  if (availableKeys.length > 0) {
    console.log('\nKeys with quota:');
    availableKeys.forEach(k => console.log(`  - Key ${k.index + 1}`));
  } else {
    console.log('\n⚠️  All keys exhausted. Quotas reset at midnight Pacific Time.');
  }
}

main().catch(console.error);
