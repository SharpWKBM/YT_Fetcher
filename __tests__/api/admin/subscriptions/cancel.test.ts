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

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    subscriptions: {
      cancel: jest.fn(),
    },
  }));
});

import handler from '@/pages/api/admin/subscriptions/[id]/cancel';
import { getServerSession } from 'next-auth';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createClient } from '@libsql/client';
import Stripe from 'stripe';

describe('/api/admin/subscriptions/[id]/cancel', () => {
  let mockExecute: jest.Mock;
  let mockStripeCancel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute = jest.fn();
    (createClient as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });

    mockStripeCancel = jest.fn();
    (Stripe as unknown as jest.Mock).mockImplementation(() => ({
      subscriptions: {
        cancel: mockStripeCancel,
      },
    }));
  });

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (requireAdmin as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'user_1' },
      body: { reason: 'Test cancellation' },
    });

    await handler(req, res);

    expect(requireAdmin).toHaveBeenCalled();
  });

  it('should return 405 for non-POST requests', async () => {
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
      query: { id: 'user_1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should return 400 if user ID is missing', async () => {
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
      query: {},
      body: { reason: 'Test cancellation' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Invalid user ID');
  });

  it('should return 404 if user not found', async () => {
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
      method: 'POST',
      query: { id: 'user_1' },
      body: { reason: 'Test cancellation' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('User not found');
  });

  it('should return 400 if user has no active subscription', async () => {
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

    mockExecute.mockResolvedValueOnce({
      rows: [{ id: 'user_1', email: 'user@test.com', stripe_subscription_id: null, tier: 'free' }],
    });

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'user_1' },
      body: { reason: 'Test cancellation' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('User has no active subscription');
  });

  it('should successfully cancel subscription', async () => {
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

    const mockUser = {
      id: 'user_1',
      email: 'user@test.com',
      stripe_subscription_id: 'sub_123',
      tier: 'pro',
    };

    mockExecute
      .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
      .mockResolvedValueOnce({ rows: [] }) // Update user tier
      .mockResolvedValueOnce({ rows: [] }); // Log subscription event

    mockStripeCancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' });

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'user_1' },
      body: { reason: 'User requested cancellation' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toBe('Subscription cancelled successfully');
    expect(mockStripeCancel).toHaveBeenCalledWith('sub_123');
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin_1',
      'CANCEL_SUBSCRIPTION',
      'subscription',
      'user_1',
      { reason: 'User requested cancellation', stripe_subscription_id: 'sub_123' },
      undefined
    );
  });

  it('should handle Stripe errors gracefully', async () => {
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

    const mockUser = {
      id: 'user_1',
      email: 'user@test.com',
      stripe_subscription_id: 'sub_123',
      tier: 'pro',
    };

    mockExecute.mockResolvedValueOnce({ rows: [mockUser] });
    mockStripeCancel.mockRejectedValue(new Error('Stripe API error'));

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'user_1' },
      body: { reason: 'Test cancellation' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to cancel subscription');
  });
});
