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
  created_at: string;
  updated_at: string;
}

export async function initUsersTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      password_hash TEXT
    )
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_email ON users(email)`);
}

export async function getOrCreateUser(email: string, name: string | null): Promise<User> {
  // Try to get existing user by email
  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  });

  if (result.rows.length > 0) {
    return result.rows[0] as unknown as User;
  }

  // Generate new user ID
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create new user
  await client.execute({
    sql: `
      INSERT INTO users (id, email, name)
      VALUES (?, ?, ?)
    `,
    args: [userId, email, name],
  });

  const newUserResult = await client.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  });

  return newUserResult.rows[0] as unknown as User;
}

export async function getUserTier(userId: string): Promise<'free'> {
  return 'free';
}

// Removed tier-based channel viewing limits - all users have unlimited access

export async function createUserWithPassword(email: string, name: string, passwordHash: string): Promise<string> {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await client.execute({
    sql: `
      INSERT INTO users (id, email, name, password_hash)
      VALUES (?, ?, ?, ?)
    `,
    args: [userId, email, name, passwordHash],
  });

  return userId;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as User;
}

export async function getUserPasswordHash(userId: string): Promise<string | null> {
  const result = await client.execute({
    sql: 'SELECT password_hash FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0 || !result.rows[0].password_hash) {
    return null;
  }

  return result.rows[0].password_hash as string;
}

export async function updateUserName(userId: string, newName: string): Promise<void> {
  await client.execute({
    sql: 'UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [newName, userId],
  });
}

export async function updateUserEmail(userId: string, newEmail: string): Promise<void> {
  await client.execute({
    sql: 'UPDATE users SET email = ?, email_verified = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [newEmail, userId],
  });
}

export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  await client.execute({
    sql: 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [newPasswordHash, userId],
  });
}

export async function setResetToken(email: string, token: string, expires: string): Promise<void> {
  await client.execute({
    sql: 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
    args: [token, expires, email],
  });
}

export async function getUserByResetToken(token: string): Promise<User | null> {
  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?',
    args: [token, new Date().toISOString()],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as User;
}

export async function clearResetToken(userId: string): Promise<void> {
  await client.execute({
    sql: 'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
    args: [userId],
  });
}
