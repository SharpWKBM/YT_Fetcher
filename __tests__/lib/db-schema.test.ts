import { createClient } from '@libsql/client';

// Mock database client for testing
const mockClient = createClient({
  url: ':memory:',
});

// Setup shared tables once for all tests
beforeAll(async () => {
  // Create users table first (dependency for foreign keys)
  await mockClient.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      tier TEXT DEFAULT 'free',
      is_admin INTEGER DEFAULT 0
    )
  `);
});

// Cleanup after all tests
afterAll(async () => {
  await mockClient.execute('DROP TABLE IF EXISTS admin_audit_log');
  await mockClient.execute('DROP TABLE IF EXISTS subscription_events');
  await mockClient.execute('DROP TABLE IF EXISTS channels');
  await mockClient.execute('DROP TABLE IF EXISTS users');
});

describe('Database Schema - Admin Audit Log', () => {
  beforeAll(async () => {
    // Create admin_audit_log table
    await mockClient.execute(`
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

    await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id)`);
    await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at)`);
  });

  test('should create admin_audit_log table with correct schema', async () => {
    const result = await mockClient.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='admin_audit_log'
    `);
    expect(result.rows.length).toBe(1);
  });

  test('should insert audit log entry', async () => {
    // Insert test admin user
    await mockClient.execute({
      sql: 'INSERT INTO users (id, email, name, is_admin) VALUES (?, ?, ?, ?)',
      args: ['admin_1', 'admin@test.com', 'Admin User', 1],
    });

    // Insert audit log
    const logId = `log_${Date.now()}`;
    await mockClient.execute({
      sql: `INSERT INTO admin_audit_log (id, admin_id, action, resource_type, resource_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [logId, 'admin_1', 'UPDATE_USER', 'user', 'user_123', '{"tier":"pro"}', '127.0.0.1'],
    });

    const result = await mockClient.execute({
      sql: 'SELECT * FROM admin_audit_log WHERE id = ?',
      args: [logId],
    });

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].admin_id).toBe('admin_1');
    expect(result.rows[0].action).toBe('UPDATE_USER');
    expect(result.rows[0].resource_type).toBe('user');
  });

  test('should enforce foreign key constraint on admin_id', async () => {
    const logId = `log_${Date.now()}`;

    await expect(
      mockClient.execute({
        sql: `INSERT INTO admin_audit_log (id, admin_id, action, resource_type)
              VALUES (?, ?, ?, ?)`,
        args: [logId, 'nonexistent_admin', 'TEST_ACTION', 'test'],
      })
    ).rejects.toThrow();
  });

  test('should have indexes on admin_id and created_at', async () => {
    const result = await mockClient.execute(`
      SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='admin_audit_log'
    `);

    const indexNames = result.rows.map(row => row.name);
    expect(indexNames).toContain('idx_audit_admin');
    expect(indexNames).toContain('idx_audit_created');
  });
});

describe('Database Schema - Subscription Events', () => {
  beforeAll(async () => {
    // Create subscription_events table
    await mockClient.execute(`
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

    await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id)`);
    await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type)`);
  });

  test('should create subscription_events table with correct schema', async () => {
    const result = await mockClient.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='subscription_events'
    `);
    expect(result.rows.length).toBe(1);
  });

  test('should insert subscription event', async () => {
    const eventId = `evt_${Date.now()}`;
    await mockClient.execute({
      sql: `INSERT INTO subscription_events (id, user_id, event_type, tier, amount, stripe_event_id, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [eventId, 'admin_1', 'subscription.created', 'pro', 9.99, 'evt_stripe_123', '{"plan":"monthly"}'],
    });

    const result = await mockClient.execute({
      sql: 'SELECT * FROM subscription_events WHERE id = ?',
      args: [eventId],
    });

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].user_id).toBe('admin_1');
    expect(result.rows[0].event_type).toBe('subscription.created');
    expect(result.rows[0].tier).toBe('pro');
    expect(result.rows[0].amount).toBe(9.99);
  });

  test('should have indexes on user_id and event_type', async () => {
    const result = await mockClient.execute(`
      SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='subscription_events'
    `);

    const indexNames = result.rows.map(row => row.name);
    expect(indexNames).toContain('idx_sub_events_user');
    expect(indexNames).toContain('idx_sub_events_type');
  });
});

describe('Database Schema - Channel Status', () => {
  beforeAll(async () => {
    // Create channels table with status field
    await mockClient.execute(`
      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subscribers INTEGER NOT NULL,
        channel_url TEXT NOT NULL,
        status TEXT DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected', 'blacklisted'))
      )
    `);

    await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_channel_status ON channels(status)`);
  });

  test('should create channels table with status field', async () => {
    const result = await mockClient.execute(`
      PRAGMA table_info(channels)
    `);

    const columns = result.rows.map(row => row.name);
    expect(columns).toContain('status');
  });

  test('should insert channel with default status', async () => {
    const channelId = `ch_${Date.now()}`;
    await mockClient.execute({
      sql: 'INSERT INTO channels (id, title, subscribers, channel_url) VALUES (?, ?, ?, ?)',
      args: [channelId, 'Test Channel', 10000, 'https://youtube.com/channel/test'],
    });

    const result = await mockClient.execute({
      sql: 'SELECT * FROM channels WHERE id = ?',
      args: [channelId],
    });

    expect(result.rows[0].status).toBe('approved');
  });

  test('should allow valid status values', async () => {
    const statuses = ['pending', 'approved', 'rejected', 'blacklisted'];

    for (const status of statuses) {
      const channelId = `ch_${Date.now()}_${status}`;
      await mockClient.execute({
        sql: 'INSERT INTO channels (id, title, subscribers, channel_url, status) VALUES (?, ?, ?, ?, ?)',
        args: [channelId, 'Test Channel', 10000, 'https://youtube.com/channel/test', status],
      });

      const result = await mockClient.execute({
        sql: 'SELECT status FROM channels WHERE id = ?',
        args: [channelId],
      });

      expect(result.rows[0].status).toBe(status);
    }
  });

  test('should reject invalid status values', async () => {
    const channelId = `ch_${Date.now()}`;

    await expect(
      mockClient.execute({
        sql: 'INSERT INTO channels (id, title, subscribers, channel_url, status) VALUES (?, ?, ?, ?, ?)',
        args: [channelId, 'Test Channel', 10000, 'https://youtube.com/channel/test', 'invalid_status'],
      })
    ).rejects.toThrow();
  });

  test('should have index on status field', async () => {
    const result = await mockClient.execute(`
      SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='channels'
    `);

    const indexNames = result.rows.map(row => row.name);
    expect(indexNames).toContain('idx_channel_status');
  });
});
