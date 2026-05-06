import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getClient } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow specific admin email to run migrations
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'abdullahtutaev@gmail.com';
  if (session.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden: Only super admin can run migrations' });
  }

  const client = getClient();
  const results: string[] = [];

  try {
    // Check if is_admin column exists
    try {
      const userTableInfo = await client.execute('PRAGMA table_info(users)');
      const userColumns = userTableInfo.rows.map((row: any) => row.name);

      if (!userColumns.includes('is_admin')) {
        await client.execute('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
        results.push('✓ Added is_admin column to users table');
      } else {
        results.push('✓ is_admin column already exists');
      }
    } catch (error) {
      results.push(`⚠ Could not check/add is_admin column: ${error}`);
    }

    // Check if channels.status column exists
    try {
      const channelTableInfo = await client.execute('PRAGMA table_info(channels)');
      const channelColumns = channelTableInfo.rows.map((row: any) => row.name);

      if (!channelColumns.includes('status')) {
        await client.execute(`
          ALTER TABLE channels ADD COLUMN status TEXT DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected', 'blacklisted'))
        `);
        results.push('✓ Added status column to channels table');
      } else {
        results.push('✓ status column already exists in channels');
      }

      await client.execute(`CREATE INDEX IF NOT EXISTS idx_channel_status ON channels(status)`);
      results.push('✓ Created index on channels.status');
    } catch (error) {
      results.push(`⚠ Could not check/add status column: ${error}`);
    }

    // Create admin_audit_log table
    try {
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
      results.push('✓ Created admin_audit_log table');

      await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at)`);
      results.push('✓ Created admin_audit_log indexes');
    } catch (error) {
      results.push(`⚠ Could not create admin_audit_log: ${error}`);
    }

    // Create subscription_events table
    try {
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
      results.push('✓ Created subscription_events table');

      await client.execute(`CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type)`);
      results.push('✓ Created subscription_events indexes');
    } catch (error) {
      results.push(`⚠ Could not create subscription_events: ${error}`);
    }

    // Create system_settings table
    try {
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
      results.push('✓ Created system_settings table');
    } catch (error) {
      results.push(`⚠ Could not create system_settings: ${error}`);
    }

    // Set admin flag for the admin email
    try {
      await client.execute({
        sql: 'UPDATE users SET is_admin = 1 WHERE email = ?',
        args: [ADMIN_EMAIL],
      });
      results.push(`✓ Set admin flag for ${ADMIN_EMAIL}`);
    } catch (error) {
      results.push(`⚠ Could not set admin flag: ${error}`);
    }

    res.status(200).json({
      success: true,
      message: 'Migration completed',
      results,
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      results,
    });
  }
}
