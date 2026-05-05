const { searchRussianChannels } = require('./.next/server/chunks/ssr/lib_youtube_ts.js');

async function test() {
  console.log('Testing improved searchRussianChannels with multi-stage filtering...\n');
  console.log('Target: 10k-1M subs, 6+ months inactive, 2018-2021 videos\n');

  const startTime = Date.now();
  const channels = await searchRussianChannels(50);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n=== RESULTS (${duration}s) ===`);
  console.log(`Total channels returned: ${channels.length}`);

  if (channels.length > 0) {
    // Stats
    const subRanges = {
      '10k-50k': channels.filter(ch => ch.subscribers >= 10000 && ch.subscribers < 50000).length,
      '50k-100k': channels.filter(ch => ch.subscribers >= 50000 && ch.subscribers < 100000).length,
      '100k-500k': channels.filter(ch => ch.subscribers >= 100000 && ch.subscribers < 500000).length,
      '500k-1M': channels.filter(ch => ch.subscribers >= 500000 && ch.subscribers <= 1000000).length,
    };

    console.log('\nSubscriber distribution:');
    Object.entries(subRanges).forEach(([range, count]) => {
      console.log(`  ${range}: ${count}`);
    });

    const withLastUpload = channels.filter(ch => ch.lastUploadDate);
    console.log(`\nChannels with last upload date: ${withLastUpload.length}/${channels.length}`);

    if (withLastUpload.length > 0) {
      const now = new Date();
      const inactivityMonths = withLastUpload.map(ch => {
        const lastUpload = new Date(ch.lastUploadDate);
        return (now.getFullYear() - lastUpload.getFullYear()) * 12 +
               (now.getMonth() - lastUpload.getMonth());
      });

      const avgInactive = Math.round(inactivityMonths.reduce((a, b) => a + b, 0) / inactivityMonths.length);
      const minInactive = Math.min(...inactivityMonths);
      const maxInactive = Math.max(...inactivityMonths);

      console.log(`\nInactivity stats:`);
      console.log(`  Average: ${avgInactive} months`);
      console.log(`  Range: ${minInactive}-${maxInactive} months`);
    }

    console.log('\n=== SAMPLE CHANNELS (first 5) ===');
    channels.slice(0, 5).forEach((ch, i) => {
      const now = new Date();
      const monthsInactive = ch.lastUploadDate
        ? ((now.getFullYear() - new Date(ch.lastUploadDate).getFullYear()) * 12 +
           (now.getMonth() - new Date(ch.lastUploadDate).getMonth()))
        : 'Unknown';

      console.log(`\n${i + 1}. ${ch.title}`);
      console.log(`   Subs: ${ch.subscribers.toLocaleString()}`);
      console.log(`   Last upload: ${ch.lastUploadDate || 'Unknown'} (${monthsInactive} months ago)`);
      console.log(`   URL: ${ch.channelUrl}`);
    });
  } else {
    console.log('\n⚠️  No channels found. This might indicate:');
    console.log('   - API quota exceeded');
    console.log('   - Search queries too specific');
    console.log('   - Date range too restrictive');
  }
}

test().catch(console.error);
