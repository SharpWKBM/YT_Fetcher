import { createMocks } from 'node-mocks-http';

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

// Mock database client
jest.mock('@libsql/client', () => ({
  createClient: jest.fn(() => ({
    execute: jest.fn(),
  })),
}));

import handler from '@/pages/api/admin/users/index';
import { getServerSession } from 'next-auth';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createClient } from '@libsql/client';

describe('/api/admin/users', () => {
  let mockExecute: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute = jest.fn();
    (createClient as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
  });

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (requireAdmin as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(requireAdmin).toHaveBeenCalled();
  });

  it('should return 403 if not admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user_1', email: 'user@test.com' },
    });
    (requireAdmin as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
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

  it('should return paginated users with default parameters', async () => {
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

    const mockUsers = [
      { id: 'user_1', email: 'user1@test.com', name: 'User 1', tier: 'free', created_at: '2026-01-01' },
      { id: 'user_2', email: 'user2@test.com', name: 'User 2', tier: 'pro', created_at: '2026-01-02' },
    ];

    mockExecute
      .mockResolvedValueOnce({ rows: [{ total: 50 }] })
      .mockResolvedValueOnce({ rows: mockUsers });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.users).toEqual(mockUsers);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 50,
      totalPages: 1,
    });
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin_1',
      'VIEW_USERS',
      'user',
      null,
      { page: 1, limit: 50 },
      undefined
    );
  });

  it('should return paginated users with custom page and limit', async () => {
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

    const mockUsers = [
      { id: 'user_11', email: 'user11@test.com', name: 'User 11', tier: 'pro', created_at: '2026-01-11' },
    ];

    mockExecute
      .mockResolvedValueOnce({ rows: [{ total: 100 }] })
      .mockResolvedValueOnce({ rows: mockUsers });

    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '2', limit: '10' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.users).toEqual(mockUsers);
    expect(data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 100,
      totalPages: 10,
    });
    expect(mockExecute).toHaveBeenCalledWith({
      sql: expect.stringContaining('LIMIT ? OFFSET ?'),
      args: [10, 10],
    });
  });

  it('should filter users by search query', async () => {
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

    const mockUsers = [
      { id: 'user_1', email: 'john@test.com', name: 'John Doe', tier: 'pro', created_at: '2026-01-01' },
    ];

    mockExecute
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: mockUsers });

    const { req, res } = createMocks({
      method: 'GET',
      query: { search: 'john' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.users).toEqual(mockUsers);
    expect(mockExecute).toHaveBeenCalledWith({
      sql: expect.stringContaining('WHERE (email LIKE ? OR name LIKE ?)'),
      args: expect.arrayContaining(['%john%', '%john%']),
    });
  });

  it('should filter users by tier', async () => {
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

    const mockUsers = [
      { id: 'user_1', email: 'user1@test.com', name: 'User 1', tier: 'pro', created_at: '2026-01-01' },
      { id: 'user_2', email: 'user2@test.com', name: 'User 2', tier: 'pro', created_at: '2026-01-02' },
    ];

    mockExecute
      .mockResolvedValueOnce({ rows: [{ total: 2 }] })
      .mockResolvedValueOnce({ rows: mockUsers });

    const { req, res } = createMocks({
      method: 'GET',
      query: { tier: 'pro' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.users).toEqual(mockUsers);
    expect(mockExecute).toHaveBeenCalledWith({
      sql: expect.stringContaining('WHERE tier = ?'),
      args: expect.arrayContaining(['pro']),
    });
  });

  it('should filter users by both search and tier', async () => {
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

    const mockUsers = [
      { id: 'user_1', email: 'john@test.com', name: 'John Doe', tier: 'pro', created_at: '2026-01-01' },
    ];

    mockExecute
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: mockUsers });

    const { req, res } = createMocks({
      method: 'GET',
      query: { search: 'john', tier: 'pro' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.users).toEqual(mockUsers);
    expect(mockExecute).toHaveBeenCalledWith({
      sql: expect.stringContaining('WHERE (email LIKE ? OR name LIKE ?) AND tier = ?'),
      args: expect.arrayContaining(['%john%', '%john%', 'pro']),
    });
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
    expect(data.error).toBe('Failed to fetch users');
  });
});
