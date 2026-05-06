import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  console.log('Running database migration: Add is_admin column to users table');

  try {
    // Check if column exists
    const result = await client.execute('PRAGMA table_info(users)');
    const columns = result.rows.map((row: any) => row.name);

    if (!columns.includes('is_admin')) {
      console.log('Adding is_admin column...');
      await client.execute('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
      console.log('✓ Added is_admin column');
    } else {
      console.log('✓ is_admin column already exists');
    }

    // Create admin_logs table
    console.log('Creating admin_logs table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )
    `);
    console.log('✓ Created admin_logs table');

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC)`);
    console.log('✓ Created admin_logs indexes');

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
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
