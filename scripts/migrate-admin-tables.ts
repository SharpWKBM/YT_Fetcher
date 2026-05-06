import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log('Running database migration: Admin panel enhancements');

  try {
    // Check if is_admin column exists
    const userTableInfo = await client.execute('PRAGMA table_info(users)');
    const userColumns = userTableInfo.rows.map((row: any) => row.name);

    if (!userColumns.includes('is_admin')) {
      console.log('Adding is_admin column...');
      await client.execute('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
      console.log('✓ Added is_admin column');
    } else {
      console.log('✓ is_admin column already exists');
    }

    // Check if channels.status column exists
    const channelTableInfo = await client.execute('PRAGMA table_info(channels)');
    const channelColumns = channelTableInfo.rows.map((row: any) => row.name);

    if (!channelColumns.includes('status')) {
      console.log('Adding status column to channels table...');
      await client.execute(`
        ALTER TABLE channels ADD COLUMN status TEXT DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected', 'blacklisted'))
      `);
      console.log('✓ Added status column to channels');
    } else {
      console.log('✓ status column already exists in channels');
    }

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_channel_status ON channels(status)`);
    console.log('✓ Created index on channels.status');

    // Create admin_audit_log table (renamed from admin_logs for consistency)
    console.log('Creating admin_audit_log table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )
    `);
    console.log('✓ Created admin_audit_log table');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at)`);
    console.log('✓ Created admin_audit_log indexes');

    // Create subscription_events table
    console.log('Creating subscription_events table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subscription_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        tier TEXT NOT NULL,
        amount REAL,
        stripe_event_id TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✓ Created subscription_events table');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type)`);
    console.log('✓ Created subscription_events indexes');

    // Create system_settings table
    console.log('Creating system_settings table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);
    console.log('✓ Created system_settings table');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNew tables added:');
    console.log('  - admin_audit_log (for tracking admin actions)');
    console.log('  - subscription_events (for subscription history)');
    console.log('  - system_settings (for application settings)');
    console.log('\nNew fields added:');
    console.log('  - users.is_admin (admin flag)');
    console.log('  - channels.status (approval workflow)');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
