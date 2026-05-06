import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function optimizeDatabase() {
  console.log('Running database performance optimization...');

  try {
    // Channels table indexes
    console.log('Creating indexes on channels table...');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channels_subscribers ON channels(subscribers DESC)`);
    console.log('✓ Created index on subscribers');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channels_last_upload ON channels(last_upload_date DESC)`);
    console.log('✓ Created index on last_upload_date');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channels_language ON channels(language)`);
    console.log('✓ Created index on language');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channels_region ON channels(region)`);
    console.log('✓ Created index on region');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channels_niche ON channels(niche)`);
    console.log('✓ Created index on niche');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status)`);
    console.log('✓ Created index on status');

    // Composite indexes for common query patterns
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channels_subs_inactive ON channels(subscribers DESC, last_upload_date)`);
    console.log('✓ Created composite index on subscribers + last_upload_date');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channels_lang_region ON channels(language, region)`);
    console.log('✓ Created composite index on language + region');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channels_status_subs ON channels(status, subscribers DESC)`);
    console.log('✓ Created composite index on status + subscribers');

    // Users table indexes
    console.log('\nCreating indexes on users table...');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    console.log('✓ Created index on email');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier)`);
    console.log('✓ Created index on tier');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)`);
    console.log('✓ Created index on stripe_customer_id');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id)`);
    console.log('✓ Created index on stripe_subscription_id');

    // Favorites table indexes
    console.log('\nCreating indexes on favorites table...');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)`);
    console.log('✓ Created index on user_id');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_favorites_channel ON favorites(channel_id)`);
    console.log('✓ Created index on channel_id');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_favorites_composite ON favorites(user_id, channel_id)`);
    console.log('✓ Created composite index on user_id + channel_id');

    // Saved searches indexes
    console.log('\nCreating indexes on saved_searches table...');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id)`);
    console.log('✓ Created index on user_id');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_saved_searches_created ON saved_searches(created_at DESC)`);
    console.log('✓ Created index on created_at');

    // Channel tags indexes
    console.log('\nCreating indexes on channel_tags table...');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channel_tags_channel ON channel_tags(channel_id)`);
    console.log('✓ Created index on channel_id');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channel_tags_tag ON channel_tags(tag)`);
    console.log('✓ Created index on tag');

    // Subscription events indexes (already created in migration, but ensuring they exist)
    console.log('\nVerifying subscription_events indexes...');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id)`);
    console.log('✓ Verified index on user_id');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type)`);
    console.log('✓ Verified index on event_type');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_sub_events_created ON subscription_events(created_at DESC)`);
    console.log('✓ Created index on created_at');

    // Admin audit log indexes (already created in migration, but ensuring they exist)
    console.log('\nVerifying admin_audit_log indexes...');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id)`);
    console.log('✓ Verified index on admin_id');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC)`);
    console.log('✓ Verified index on created_at');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_resource ON admin_audit_log(resource_type, resource_id)`);
    console.log('✓ Created composite index on resource_type + resource_id');

    // Analyze tables for query optimization
    console.log('\nAnalyzing tables for query optimization...');
    await client.execute(`ANALYZE channels`);
    await client.execute(`ANALYZE users`);
    await client.execute(`ANALYZE favorites`);
    await client.execute(`ANALYZE saved_searches`);
    await client.execute(`ANALYZE channel_tags`);
    await client.execute(`ANALYZE subscription_events`);
    await client.execute(`ANALYZE admin_audit_log`);
    console.log('✓ Table statistics updated');

    console.log('\n✅ Database optimization completed successfully!');
    console.log('\nPerformance improvements:');
    console.log('  - Faster channel filtering by subscribers, language, region, niche');
    console.log('  - Optimized sorting by subscribers and last upload date');
    console.log('  - Improved user lookup and authentication queries');
    console.log('  - Faster favorites and saved searches retrieval');
    console.log('  - Enhanced admin analytics queries');
    console.log('  - Better composite index coverage for common query patterns');

  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

optimizeDatabase();
