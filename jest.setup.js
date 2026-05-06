// Set up test environment variables
process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'file:test.db';
process.env.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'test-token';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Run database migrations for test database
const { createClient } = require('@libsql/client');

async function setupTestDatabase() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Check if is_admin column exists
  const result = await client.execute('PRAGMA table_info(users)');
  const columns = result.rows.map((row) => row.name);

  if (!columns.includes('is_admin')) {
    await client.execute('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
  }

  if (!columns.includes('stripe_customer_id')) {
    await client.execute('ALTER TABLE users ADD COLUMN stripe_customer_id TEXT');
  }

  if (!columns.includes('stripe_subscription_id')) {
    await client.execute('ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT');
  }

  // Create admin_logs table
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

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC)`);

  // Create system_settings table
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
}

// Run setup before tests
beforeAll(async () => {
  await setupTestDatabase();
});
