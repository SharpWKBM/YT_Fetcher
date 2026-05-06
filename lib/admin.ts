import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@libsql/client';
import { Session } from 'next-auth';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export interface User {
  id: string;
  email: string;
  name: string | null;
  tier: 'free' | 'pro' | 'enterprise';
  is_admin: number;
}

export async function initAdminTables() {
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

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const result = await client.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [userId],
    });

    if (result.rows.length === 0) {
      return false;
    }

    const user = result.rows[0] as any;
    return user.is_admin === 1;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session | null
): Promise<User | null> {
  if (!session || !session.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const userId = session.user.id;
  const adminStatus = await isAdmin(userId);

  if (!adminStatus) {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return null;
  }

  const result = await client.execute({
    sql: 'SELECT id, email, name, tier, is_admin FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return null;
  }

  return result.rows[0] as unknown as User;
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string | null,
  details?: any,
  ipAddress?: string | null
): Promise<string> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await client.execute({
    sql: `
      INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      logId,
      adminId,
      action,
      targetType,
      targetId || null,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
    ],
  });

  return logId;
}

export async function getAdminLogs(filters?: {
  adminId?: string;
  targetType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  let sql = 'SELECT * FROM admin_logs WHERE 1=1';
  const args: any[] = [];

  if (filters?.adminId) {
    sql += ' AND admin_id = ?';
    args.push(filters.adminId);
  }

  if (filters?.targetType) {
    sql += ' AND target_type = ?';
    args.push(filters.targetType);
  }

  if (filters?.action) {
    sql += ' AND action = ?';
    args.push(filters.action);
  }

  if (filters?.startDate) {
    sql += ' AND created_at >= ?';
    args.push(filters.startDate);
  }

  if (filters?.endDate) {
    sql += ' AND created_at <= ?';
    args.push(filters.endDate);
  }

  sql += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    sql += ' LIMIT ?';
    args.push(filters.limit);
  }

  if (filters?.offset) {
    sql += ' OFFSET ?';
    args.push(filters.offset);
  }

  const result = await client.execute({ sql, args });
  return result.rows;
}
