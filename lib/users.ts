import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export interface User {
  id: string;
  email: string;
  name: string | null;
  tier: 'free' | 'pro' | 'enterprise';
  channels_viewed_this_month: number;
  created_at: string;
  updated_at: string;
}

export async function initUsersTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'pro', 'enterprise')),
      channels_viewed_this_month INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_email ON users(email)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_tier ON users(tier)`);
}

export async function getOrCreateUser(userId: string, email: string, name: string | null): Promise<User> {
  // Try to get existing user
  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length > 0) {
    return result.rows[0] as unknown as User;
  }

  // Create new user
  await client.execute({
    sql: `
      INSERT INTO users (id, email, name, tier, channels_viewed_this_month)
      VALUES (?, ?, ?, 'free', 0)
    `,
    args: [userId, email, name],
  });

  const newUserResult = await client.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  });

  return newUserResult.rows[0] as unknown as User;
}

export async function getUserTier(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
  const result = await client.execute({
    sql: 'SELECT tier FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) {
    return 'free';
  }

  return result.rows[0].tier as 'free' | 'pro' | 'enterprise';
}

export async function incrementChannelsViewed(userId: string): Promise<void> {
  await client.execute({
    sql: `
      UPDATE users
      SET channels_viewed_this_month = channels_viewed_this_month + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [userId],
  });
}

export async function getChannelsViewedThisMonth(userId: string): Promise<number> {
  const result = await client.execute({
    sql: 'SELECT channels_viewed_this_month FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) {
    return 0;
  }

  return Number(result.rows[0].channels_viewed_this_month);
}

export async function resetMonthlyUsage(): Promise<void> {
  await client.execute('UPDATE users SET channels_viewed_this_month = 0');
}

export const TIER_LIMITS = {
  free: 10,
  pro: 100,
  enterprise: Infinity,
};

export function canViewMoreChannels(tier: 'free' | 'pro' | 'enterprise', viewedCount: number): boolean {
  return viewedCount < TIER_LIMITS[tier];
}
