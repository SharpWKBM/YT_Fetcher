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

describe('/api/admin/users/[id]', () => {
  const adminUserId = 'admin-user-detail-test';
  const regularUserId = 'regular-user-detail-test';
  const targetUserId = 'target-user-detail-test';

  beforeAll(async () => {
    // Create admin user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [adminUserId, 'admin@detail.test', 'Admin', 'free', 1],
    });

    // Create regular user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [regularUserId, 'regular@detail.test', 'Regular', 'free', 0],
    });

    // Create target user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin, channels_viewed_this_month) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [targetUserId, 'target@detail.test', 'Target User', 'pro', 0, 15],
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

  describe('GET /api/admin/users/[id]', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: targetUserId },
      });

      getServerSession.mockResolvedValue(null);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' });
    });

    it('should return 403 for non-admin users', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: targetUserId },
      });

      getServerSession.mockResolvedValue({
        user: { id: regularUserId, email: 'regular@detail.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Forbidden: Admin access required' });
    });

    it('should return user details for admin', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: targetUserId },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@detail.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(targetUserId);
      expect(data.user.email).toBe('target@detail.test');
      expect(data.user.tier).toBe('pro');
      expect(data.user.channels_viewed_this_month).toBe(15);
    });

    it('should return 404 for non-existent user', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'non-existent-user' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@detail.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({ error: 'User not found' });
    });
  });
});
