import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { createClient } from '@libsql/client';

// Mock next-auth before importing handler
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
  getServerSession: jest.fn(),
}));

jest.mock('next-auth/next', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));

const { getServerSession } = require('next-auth');

const handler = require('../../../../pages/api/admin/users/[id]').default;

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

describe('/api/admin/users/[id] - PUT', () => {
  const adminUserId = 'admin-user-update-test';
  const regularUserId = 'regular-user-update-test';
  const targetUserId = 'target-user-update-test';

  beforeAll(async () => {
    // Create admin user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [adminUserId, 'admin@update.test', 'Admin', 'free', 1],
    });

    // Create regular user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [regularUserId, 'regular@update.test', 'Regular', 'free', 0],
    });

    // Create target user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [targetUserId, 'target@update.test', 'Target User', 'free', 0],
    });
  });

  afterAll(async () => {
    await client.execute({
      sql: 'DELETE FROM admin_logs WHERE admin_id = ?',
      args: [adminUserId],
    });

    await client.execute({
      sql: 'DELETE FROM users WHERE id IN (?, ?, ?)',
      args: [adminUserId, regularUserId, targetUserId],
    });
  });

  describe('PUT /api/admin/users/[id]', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: targetUserId },
        body: { tier: 'pro' },
      });

      getServerSession.mockResolvedValue(null);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' });
    });

    it('should return 403 for non-admin users', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: targetUserId },
        body: { tier: 'pro' },
      });

      getServerSession.mockResolvedValue({
        user: { id: regularUserId, email: 'regular@update.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Forbidden: Admin access required' });
    });

    it('should update user tier for admin', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: targetUserId },
        body: { tier: 'pro' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@update.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.message).toBe('User updated successfully');

      // Verify the update
      const result = await client.execute({
        sql: 'SELECT tier FROM users WHERE id = ?',
        args: [targetUserId],
      });
      expect((result.rows[0] as any).tier).toBe('pro');
    });

    it('should update user name for admin', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: targetUserId },
        body: { name: 'Updated Name' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@update.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);

      // Verify the update
      const result = await client.execute({
        sql: 'SELECT name FROM users WHERE id = ?',
        args: [targetUserId],
      });
      expect((result.rows[0] as any).name).toBe('Updated Name');
    });

    it('should return 404 for non-existent user', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'non-existent-user' },
        body: { tier: 'pro' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@update.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({ error: 'User not found' });
    });

    it('should validate tier values', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: targetUserId },
        body: { tier: 'invalid-tier' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@update.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Invalid tier value' });
    });
  });
});
