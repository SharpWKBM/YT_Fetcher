const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

// Configuration
const CHECKPOINT_FILE = path.join(__dirname, '.bulk-import-checkpoint.json');
const BATCH_SIZE = 50;
const CHECKPOINT_INTERVAL = 50;

// Initialize database client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Progress tracking
let totalFetched = 0;
let totalInserted = 0;
let startTime = Date.now();
let errors = [];

// Load checkpoint if exists
function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    const data = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
    return JSON.parse(data);
  }
  return null;
}

// Save checkpoint
function saveCheckpoint() {
  const checkpoint = {
    totalFetched,
    totalInserted,
    startTime,
    lastCheckpoint: Date.now(),
    errors: errors.slice(-10), // Keep last 10 errors
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

// Calculate ETA
function calculateETA(current, total) {
  const elapsed = Date.now() - startTime;
  const rate = current / elapsed;
  const remaining = total - current;
  const eta = remaining / rate;
  return Math.round(eta / 1000 / 60); // minutes
}

// Progress bar
function showProgress(current, total) {
  const percentage = Math.round((current / total) * 100);
  const eta = calculateETA(current, total);
  const bar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
  process.stdout.write(`\r[${bar}] ${percentage}% | ${current}/${total} | ETA: ${eta}m | Inserted: ${totalInserted} | Errors: ${errors.length}`);
}

// Insert channel into database
async function insertChannel(channel) {
  try {
    await client.execute({
      sql: `
        INSERT INTO channels (id, title, subscribers, language, region, last_upload_date, channel_url, thumbnail_url, social_links, video_count, avg_views, engagement_rate, niche)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          title = excluded.title,
          subscribers = excluded.subscribers,
          language = excluded.language,
          region = excluded.region,
          last_upload_date = excluded.last_upload_date,
          thumbnail_url = excluded.thumbnail_url,
          social_links = excluded.social_links,
          video_count = excluded.video_count,
          avg_views = excluded.avg_views,
          engagement_rate = excluded.engagement_rate,
          niche = excluded.niche,
          fetched_at = CURRENT_TIMESTAMP
      `,
      args: [
        channel.id,
        channel.title,
        channel.subscribers,
        channel.language || null,
        channel.region || null,
        channel.last_upload_date || null,
        channel.channel_url,
        channel.thumbnail_url || null,
        channel.social_links || null,
        channel.video_count || null,
        channel.avg_views || null,
        channel.engagement_rate || null,
        channel.niche || null,
      ],
    });
    totalInserted++;
  } catch (error) {
    errors.push({
      channelId: channel.id,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Process batch of channels
async function processBatch(channels) {
  for (const channel of channels) {
    await insertChannel(channel);
    totalFetched++;

    if (totalFetched % CHECKPOINT_INTERVAL === 0) {
      saveCheckpoint();
    }
  }
}

// Main import function
async function bulkImport(targetCount, resume = false) {
  console.log('🚀 Starting bulk channel import...\n');

  // Load checkpoint if resuming
  if (resume) {
    const checkpoint = loadCheckpoint();
    if (checkpoint) {
      totalFetched = checkpoint.totalFetched;
      totalInserted = checkpoint.totalInserted;
      startTime = checkpoint.startTime;
      errors = checkpoint.errors || [];
      console.log(`📂 Resuming from checkpoint: ${totalFetched}/${targetCount} channels processed\n`);
    } else {
      console.log('⚠️  No checkpoint found, starting fresh\n');
    }
  }

  // Import channels in batches
  while (totalFetched < targetCount) {
    const remaining = targetCount - totalFetched;
    const batchSize = Math.min(BATCH_SIZE, remaining);

    try {
      // Fetch batch of channels using the existing API
      const response = await fetch(`http://localhost:3000/api/cron/fetch-channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.fetched > 0) {
        showProgress(totalFetched, targetCount);
      } else {
        console.log('\n⚠️  No more channels available from API');
        break;
      }

      // Small delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`\n❌ Batch error: ${error.message}`);
      errors.push({
        batch: Math.floor(totalFetched / BATCH_SIZE),
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      saveCheckpoint();

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Final summary
  console.log('\n\n✅ Import completed!\n');
  console.log(`📊 Summary:`);
  console.log(`   Total fetched: ${totalFetched}`);
  console.log(`   Total inserted: ${totalInserted}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Duration: ${Math.round((Date.now() - startTime) / 1000 / 60)} minutes`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors logged to checkpoint file`);
  }

  // Clean up checkpoint file on success
  if (totalFetched >= targetCount && errors.length === 0) {
    fs.unlinkSync(CHECKPOINT_FILE);
    console.log('\n🧹 Checkpoint file cleaned up');
  }
}

// CLI interface
const args = process.argv.slice(2);
const targetIndex = args.indexOf('--target');
const resumeFlag = args.includes('--resume');

if (targetIndex === -1 || !args[targetIndex + 1]) {
  console.log('Usage: node bulk-import-channels.js --target <number> [--resume]');
  console.log('Example: node bulk-import-channels.js --target 1000 --resume');
  process.exit(1);
}

const targetCount = parseInt(args[targetIndex + 1]);

if (isNaN(targetCount) || targetCount <= 0) {
  console.error('❌ Target must be a positive number');
  process.exit(1);
}

// Run import
bulkImport(targetCount, resumeFlag)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    saveCheckpoint();
    process.exit(1);
  });
