import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  console.log('=== Database Migration ===\n');

  try {
    // Add new columns to channels table
    console.log('Adding social_links column...');
    await client.execute(`
      ALTER TABLE channels ADD COLUMN social_links TEXT
    `);
    console.log('✅ Added social_links column');

    console.log('Adding video_count column...');
    await client.execute(`
      ALTER TABLE channels ADD COLUMN video_count INTEGER
    `);
    console.log('✅ Added video_count column');

    console.log('Adding avg_views column...');
    await client.execute(`
      ALTER TABLE channels ADD COLUMN avg_views INTEGER
    `);
    console.log('✅ Added avg_views column');

    console.log('Adding engagement_rate column...');
    await client.execute(`
      ALTER TABLE channels ADD COLUMN engagement_rate REAL
    `);
    console.log('✅ Added engagement_rate column');

    console.log('\n✅ Migration completed successfully!');
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('⚠️  Columns already exist, skipping migration');
    } else {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }
}

migrate();
