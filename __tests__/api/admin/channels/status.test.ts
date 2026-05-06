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

import handler from '@/pages/api/admin/channels/[id]/status';
import { getServerSession } from 'next-auth';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createClient } from '@libsql/client';

describe('/api/admin/channels/[id]/status', () => {
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
      method: 'PUT',
      query: { id: 'channel_1' },
      body: { status: 'approved' },
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
      method: 'PUT',
      query: { id: 'channel_1' },
      body: { status: 'approved' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
  });

  it('should return 405 for non-PUT requests', async () => {
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
      method: 'GET',
      query: { id: 'channel_1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should return 400 if channel ID is missing', async () => {
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
      method: 'PUT',
      query: {},
      body: { status: 'approved' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Invalid channel ID');
  });

  it('should return 400 if status is invalid', async () => {
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
      method: 'PUT',
      query: { id: 'channel_1' },
      body: { status: 'invalid_status' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Invalid status');
  });

  it('should return 404 if channel not found', async () => {
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

    mockExecute.mockResolvedValueOnce({ rows: [] });

    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: 'channel_1' },
      body: { status: 'approved' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Channel not found');
  });

  it('should successfully update channel status to approved', async () => {
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

    const mockChannel = {
      id: 'channel_1',
      channel_id: 'UC123',
      title: 'Test Channel',
      status: 'pending',
    };

    mockExecute
      .mockResolvedValueOnce({ rows: [mockChannel] })
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: 'channel_1' },
      body: { status: 'approved' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toBe('Channel status updated successfully');
    expect(mockExecute).toHaveBeenCalledWith({
      sql: 'UPDATE channels SET status = ? WHERE id = ?',
      args: ['approved', 'channel_1'],
    });
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin_1',
      'UPDATE_CHANNEL_STATUS',
      'channel',
      'channel_1',
      { old_status: 'pending', new_status: 'approved' },
      undefined
    );
  });

  it('should successfully update channel status to rejected', async () => {
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

    const mockChannel = {
      id: 'channel_1',
      channel_id: 'UC123',
      title: 'Test Channel',
      status: 'pending',
    };

    mockExecute
      .mockResolvedValueOnce({ rows: [mockChannel] })
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: 'channel_1' },
      body: { status: 'rejected' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin_1',
      'UPDATE_CHANNEL_STATUS',
      'channel',
      'channel_1',
      { old_status: 'pending', new_status: 'rejected' },
      undefined
    );
  });

  it('should successfully update channel status to blacklisted', async () => {
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

    const mockChannel = {
      id: 'channel_1',
      channel_id: 'UC123',
      title: 'Test Channel',
      status: 'approved',
    };

    mockExecute
      .mockResolvedValueOnce({ rows: [mockChannel] })
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: 'channel_1' },
      body: { status: 'blacklisted' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin_1',
      'UPDATE_CHANNEL_STATUS',
      'channel',
      'channel_1',
      { old_status: 'approved', new_status: 'blacklisted' },
      undefined
    );
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
      method: 'PUT',
      query: { id: 'channel_1' },
      body: { status: 'approved' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to update channel status');
  });
});
