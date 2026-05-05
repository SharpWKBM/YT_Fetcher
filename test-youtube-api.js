const { google } = require('googleapis');
const fs = require('fs');

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const value = match[2].trim().replace(/^[\"']|[\"']$/g, '');
    env[match[1].trim()] = value;
  }
});

const API_KEYS = [
  env.YOUTUBE_API_KEY,
  env.YOUTUBE_API_KEY_2,
  env.YOUTUBE_API_KEY_3,
  env.YOUTUBE_API_KEY_4,
  env.YOUTUBE_API_KEY_5,
].filter(Boolean);

console.log(`Found ${API_KEYS.length} API keys`);

const youtube = google.youtube({
  version: 'v3',
  auth: API_KEYS[0],
});

async function testSearch() {
  try {
    console.log('\nTesting YouTube search...');
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      type: ['video'],
      q: 'влог',
      regionCode: 'RU',
      relevanceLanguage: 'ru',
      maxResults: 5,
      publishedAfter: '2018-01-01T00:00:00Z',
      publishedBefore: '2023-12-31T23:59:59Z',
      order: 'viewCount',
    });

    console.log(`Found ${searchResponse.data.items?.length || 0} videos`);

    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      const channelIds = searchResponse.data.items
        .map(item => item.snippet?.channelId)
        .filter(Boolean);

      console.log(`Unique channel IDs: ${[...new Set(channelIds)].length}`);

      // Test channel details
      const channelsResponse = await youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: channelIds.slice(0, 2),
      });

      console.log(`\nChannel details:`);
      channelsResponse.data.items?.forEach(channel => {
        console.log(`- ${channel.snippet?.title}: ${channel.statistics?.subscriberCount} subs`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSearch();
