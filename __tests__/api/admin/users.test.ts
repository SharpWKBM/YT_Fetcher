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

import handler from '../../../pages/api/admin/users/index';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

describe('/api/admin/users', () => {
  const adminUserId = 'admin-api-test';
  const regularUserId = 'regular-api-test';
  const testUserId = 'test-user-1';

  beforeAll(async () => {
    // Create admin user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [adminUserId, 'admin@api.test', 'Admin', 'free', 1],
    });

    // Create regular user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [regularUserId, 'regular@api.test', 'Regular', 'free', 0],
    });

    // Create test user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, tier, is_admin) VALUES (?, ?, ?, ?, ?)`,
      args: [testUserId, 'test@api.test', 'Test User', 'pro', 0],
    });
  });

  afterAll(async () => {
    await client.execute({
      sql: 'DELETE FROM admin_logs WHERE admin_id = ?',
      args: [adminUserId],
    });

    await client.execute({
      sql: 'DELETE FROM users WHERE id IN (?, ?, ?)',
      args: [adminUserId, regularUserId, testUserId],
    });
  });

  describe('GET /api/admin/users', () => {
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
        user: { id: regularUserId, email: 'regular@api.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Forbidden: Admin access required' });
    });

    it('should return list of users for admin', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@api.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users.length).toBeGreaterThan(0);
      expect(data.pagination).toBeDefined();
    });

    it('should support search by email', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { search: 'test@api.test' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@api.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.users.length).toBeGreaterThanOrEqual(1);
      expect(data.users[0].email).toContain('test@api.test');
    });

    it('should support filtering by tier', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tier: 'pro' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@api.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.users.every((u: any) => u.tier === 'pro')).toBe(true);
    });

    it('should support pagination', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '2' },
      });

      getServerSession.mockResolvedValue({
        user: { id: adminUserId, email: 'admin@api.test' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
      expect(data.users.length).toBeLessThanOrEqual(2);
    });
  });
});
