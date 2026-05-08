import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { isAdmin, requireAdmin, logAdminAction, initAdminTables } from '../../lib/admin';
import { getOrCreateUser } from '../../lib/users';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

describe('Admin Authentication', () => {
  const adminUserId = 'admin-test-user';
  const regularUserId = 'regular-test-user';
  const adminEmail = 'admin@test.com';
  const regularEmail = 'regular@test.com';

  beforeAll(async () => {
    await initAdminTables();

    // Create admin user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [adminUserId, adminEmail, 'Admin User', 'free', 1],
    });

    // Create regular user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [regularUserId, regularEmail, 'Regular User', 'free', 0],
    });
  });

  afterAll(async () => {
    // Cleanup test logs first (foreign key constraint)
    await client.execute({
      sql: 'DELETE FROM admin_logs WHERE admin_id IN (?, ?)',
      args: [adminUserId, regularUserId],
    });

    // Cleanup test users
    await client.execute({
      sql: 'DELETE FROM users WHERE id IN (?, ?)',
      args: [adminUserId, regularUserId],
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin users', async () => {
      const result = await isAdmin(adminUserId);
      expect(result).toBe(true);
    });

    it('should return false for non-admin users', async () => {
      const result = await isAdmin(regularUserId);
      expect(result).toBe(false);
    });

    it('should return false for non-existent users', async () => {
      const result = await isAdmin('non-existent-user');
      expect(result).toBe(false);
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users through', async () => {
      const mockReq: any = {
        headers: {},
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock session with admin user
      const mockSession = {
        user: { id: adminUserId, email: adminEmail },
      };

      const user = await requireAdmin(mockReq, mockRes, mockSession);
      expect(user).toBeTruthy();
      expect(user?.id).toBe(adminUserId);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block non-admin users with 403', async () => {
      const mockReq: any = {
        headers: {},
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock session with regular user
      const mockSession = {
        user: { id: regularUserId, email: regularEmail },
      };

      const user = await requireAdmin(mockReq, mockRes, mockSession);
      expect(user).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden: Admin access required' });
    });

    it('should block unauthenticated users with 401', async () => {
      const mockReq: any = {
        headers: {},
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const user = await requireAdmin(mockReq, mockRes, null);
      expect(user).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('logAdminAction', () => {
    it('should create log entry in admin_logs table', async () => {
      const action = 'UPDATE_USER_TIER';
      const targetType = 'user';
      const targetId = regularUserId;
      const details = { oldTier: 'free', newTier: 'pro' };
      const ipAddress = '127.0.0.1';

      const logId = await logAdminAction(adminUserId, action, targetType, targetId, details, ipAddress);
      expect(logId).toBeTruthy();
      expect(logId).toMatch(/^log_/);

      // Verify log was created
      const result = await client.execute({
        sql: 'SELECT * FROM admin_logs WHERE id = ?',
        args: [logId],
      });

      expect(result.rows.length).toBe(1);
      const log = result.rows[0] as any;
      expect(log.admin_id).toBe(adminUserId);
      expect(log.action).toBe(action);
      expect(log.target_type).toBe(targetType);
      expect(log.target_id).toBe(targetId);
      expect(JSON.parse(log.details)).toEqual(details);
      expect(log.ip_address).toBe(ipAddress);
    });

    it('should handle missing optional parameters', async () => {
      const action = 'VIEW_DASHBOARD';
      const targetType = 'system';

      const logId = await logAdminAction(adminUserId, action, targetType);
      expect(logId).toBeTruthy();

      // Verify log was created
      const result = await client.execute({
        sql: 'SELECT * FROM admin_logs WHERE id = ?',
        args: [logId],
      });

      expect(result.rows.length).toBe(1);
      const log = result.rows[0] as any;
      expect(log.admin_id).toBe(adminUserId);
      expect(log.action).toBe(action);
      expect(log.target_type).toBe(targetType);
      expect(log.target_id).toBeNull();
    });
  });
});
