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

const handler = require('../../../pages/api/admin/subscriptions/index').default;

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

describe('/api/admin/subscriptions', () => {
  const adminUserId = 'admin-sub-test';
  const regularUserId = 'regular-sub-test';
  const testUserId1 = 'test-user-sub-1';
  const testUserId2 = 'test-user-sub-2';

  beforeAll(async () => {
    // Create admin user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [adminUserId, 'admin@sub.test', 'Admin', 'free', 1],
    });

    // Create regular user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [regularUserId, 'regular@sub.test', 'Regular', 'free', 0],
    });

    // Create test users with subscriptions
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin, stripe_customer_id, stripe_subscription_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId1, 'user1@sub.test', 'User 1', 'pro', 0, 'cus_test1', 'sub_test1'],
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin, stripe_customer_id, stripe_subscription_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId2, 'user2@sub.test', 'User 2', 'enterprise', 0, 'cus_test2', 'sub_test2'],
    });
  });

  afterAll(async () => {
    await client.execute({
      sql: 'DELETE FROM admin_logs WHERE admin_id = ?',
      args: [adminUserId],
    });

    await client.execute({
      sql: 'DELETE FROM users WHERE id IN (?, ?, ?, ?)',
      args: [adminUserId, regularUserId, testUserId1, testUserId2],
    });
  });

  describe('GET /api/admin/subscriptions', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      getServerSession.mockResolvedValue(null);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' });
    });

    it('should return 403 for non-admin users', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      getServerSession.mockResolvedValue({
        user: { id: regularUserId, email: 'regular@sub.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Forbidden: Admin access required' });
    });

    it('should return list of subscriptions for admin', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@sub.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(Array.isArray(data.subscriptions)).toBe(true);
      expect(data.subscriptions.length).toBeGreaterThanOrEqual(2);
      expect(data.pagination).toBeDefined();
    });

    it('should support filtering by tier', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tier: 'pro' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@sub.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.subscriptions.every((s: any) => s.tier === 'pro')).toBe(true);
    });

    it('should support pagination', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '1' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@sub.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(1);
      expect(data.subscriptions.length).toBeLessThanOrEqual(1);
    });
  });
});
