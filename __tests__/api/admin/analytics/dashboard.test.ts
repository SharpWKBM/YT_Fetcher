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

const handler = require('../../../../pages/api/admin/analytics/dashboard').default;

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

describe('/api/admin/analytics/dashboard', () => {
  const adminUserId = 'admin-analytics-test';
  const regularUserId = 'regular-analytics-test';

  beforeAll(async () => {
    // Create admin user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [adminUserId, 'admin@analytics.test', 'Admin', 'free', 1],
    });

    // Create regular user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [regularUserId, 'regular@analytics.test', 'Regular', 'free', 0],
    });

    // Create some test users for analytics
    for (let i = 1; i <= 5; i++) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin, stripe_subscription_id) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [`analytics-user-${i}`, `user${i}@analytics.test`, `User ${i}`, i % 2 === 0 ? 'pro' : 'free', 0, i % 2 === 0 ? `sub_${i}` : null],
      });
    }
  });

  afterAll(async () => {
    await client.execute({
      sql: 'DELETE FROM admin_logs WHERE admin_id = ?',
      args: [adminUserId],
    });

    await client.execute({
      sql: 'DELETE FROM users WHERE id LIKE ?',
      args: ['analytics-%'],
    });

    await client.execute({
      sql: 'DELETE FROM users WHERE id IN (?, ?)',
      args: [adminUserId, regularUserId],
    });
  });

  describe('GET /api/admin/analytics/dashboard', () => {
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
        user: { id: regularUserId, email: 'regular@analytics.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Forbidden: Admin access required' });
    });

    it('should return dashboard metrics for admin', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@analytics.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.totalUsers).toBeGreaterThanOrEqual(5);
      expect(data.metrics.activeSubscriptions).toBeGreaterThanOrEqual(2);
      expect(data.metrics.usersByTier).toBeDefined();
      expect(data.metrics.usersByTier.free).toBeGreaterThanOrEqual(3);
      expect(data.metrics.usersByTier.pro).toBeGreaterThanOrEqual(2);
    });
  });
});
