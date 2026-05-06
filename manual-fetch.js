const { google } = require('googleapis');
const { initDatabase, insertChannel } = require('./.next/server/chunks/lib_db_ts');
const { discoverChannelsMultiQuery } = require('./.next/server/chunks/lib_youtube_advanced-search_ts');

// Force use only Key 1 which has quota
process.env.YOUTUBE_API_KEY_2 = '';
process.env.YOUTUBE_API_KEY_3 = '';
process.env.YOUTUBE_API_KEY_4 = '';
process.env.YOUTUBE_API_KEY_5 = '';

async function manualFetch() {
  console.log('=== Manual Channel Fetch Using Key 1 ===\n');

  try {
    // Initialize database
    await initDatabase();
    console.log('✅ Database initialized\n');

    // Fetch channels with optimized search
    console.log('Starting channel discovery...');
    const channels = await discoverChannelsMultiQuery({
      minSubscribers: 10000,
      maxSubscribers: 1000000,
      inactiveMonths: 12
    }, 20);

    console.log(`\n✅ Discovered ${channels.length} channels\n`);

    // Store in database
    let inserted = 0;
    for (const channel of channels) {
      try {
        await insertChannel({
          id: channel.id,
          title: channel.title,
          subscribers: channel.subscribers,
          language: channel.language,
          region: channel.region,
          last_upload_date: channel.lastUploadDate,
          channel_url: channel.channelUrl,
          thumbnail_url: channel.thumbnailUrl,
          social_links: channel.socialLinks,
          video_count: channel.videoCount,
          avg_views: channel.avgViews,
          engagement_rate: channel.engagementRate,
        });
        inserted++;
        console.log(`✅ Inserted: ${channel.title} (${channel.subscribers.toLocaleString()} subs)`);
      } catch (error) {
        console.error(`❌ Failed to insert ${channel.id}:`, error.message);
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Fetched: ${channels.length} channels`);
    console.log(`Inserted: ${inserted} channels`);
    console.log(`Failed: ${channels.length - inserted} channels`);

  } catch (error) {
    console.error('❌ Error during manual fetch:', error);
    process.exit(1);
  }
}

manualFetch();
