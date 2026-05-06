import { createMocks } from 'node-mocks-http';

// Create mock execute function at module level
const mockExecute = jest.fn();

// Mock next-auth BEFORE importing handler
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));

// Mock next-auth/next
jest.mock('next-auth/next', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));

// Mock admin helper
jest.mock('@/lib/admin', () => ({
  requireAdmin: jest.fn(),
  logAdminAction: jest.fn(),
}));

// Mock database client - return same instance every time
jest.mock('@libsql/client', () => ({
  createClient: jest.fn(() => ({
    execute: mockExecute,
  })),
}));

import handler from '@/pages/api/admin/analytics/index';
import { getServerSession } from 'next-auth';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createClient } from '@libsql/client';

describe('/api/admin/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute.mockReset();
  });

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (requireAdmin as jest.Mock).mockImplementation(async (req, res, session) => {
      if (!session) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
      }
      return null;
    });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(requireAdmin).toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(401);
  });

  it('should return 403 if not admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user_1', email: 'user@test.com' },
    });
    (requireAdmin as jest.Mock).mockImplementation(async (req, res, session) => {
      if (session) {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return null;
      }
      return null;
    });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
  });

  it('should return analytics data for admin', async () => {
    const mockAdmin = {
      id: 'admin_1',
      email: 'admin@test.com',
      name: 'Admin User',
      tier: 'enterprise',
      is_admin: 1,
    };

    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin_1', email: 'admin@test.com' },
    });
    (requireAdmin as jest.Mock).mockResolvedValue(mockAdmin);
    (logAdminAction as jest.Mock).mockResolvedValue(undefined);

    // Mock database responses
    mockExecute
      .mockResolvedValueOnce({
        rows: [{ total_users: 100, free_users: 80, pro_users: 15, enterprise_users: 5 }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_channels: 1000, pending_channels: 50, approved_channels: 900, rejected_channels: 30, blacklisted_channels: 20 }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_events: 50, total_revenue: 1500, avg_transaction: 30 }],
      })
      .mockResolvedValueOnce({
        rows: [
          { date: '2026-05-06', event_count: 10, daily_revenue: 300 },
          { date: '2026-05-05', event_count: 8, daily_revenue: 240 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { niche: 'Gaming', channel_count: 250 },
          { niche: 'Tech', channel_count: 200 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { action: 'UPDATE_USER', resource_type: 'user', created_at: '2026-05-06T10:00:00Z', admin_email: 'admin@test.com' },
        ],
      });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.analytics.users.total_users).toBe(100);
    expect(data.analytics.channels.total_channels).toBe(1000);
    expect(data.analytics.revenue.total_revenue).toBe(1500);
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin_1',
      'VIEW_ANALYTICS',
      'analytics',
      null,
      {},
      undefined
    );
  });

  it('should return 405 for non-GET requests', async () => {
    const mockAdmin = {
      id: 'admin_1',
      email: 'admin@test.com',
      name: 'Admin User',
      tier: 'enterprise',
      is_admin: 1,
    };

    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin_1', email: 'admin@test.com' },
    });
    (requireAdmin as jest.Mock).mockResolvedValue(mockAdmin);

    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should handle database errors gracefully', async () => {
    const mockAdmin = {
      id: 'admin_1',
      email: 'admin@test.com',
      name: 'Admin User',
      tier: 'enterprise',
      is_admin: 1,
    };

    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin_1', email: 'admin@test.com' },
    });
    (requireAdmin as jest.Mock).mockResolvedValue(mockAdmin);

    mockExecute.mockRejectedValue(new Error('Database error'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to fetch analytics');
  });
});
