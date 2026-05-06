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
      retrieve: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
  }));
});

import handler from '@/pages/api/admin/subscriptions/[id]/refund';
import { getServerSession } from 'next-auth';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createClient } from '@libsql/client';
import Stripe from 'stripe';

describe('/api/admin/subscriptions/[id]/refund', () => {
  let mockExecute: jest.Mock;
  let mockStripeRetrieve: jest.Mock;
  let mockStripeRefund: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute = jest.fn();
    (createClient as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });

    mockStripeRetrieve = jest.fn();
    mockStripeRefund = jest.fn();
    (Stripe as unknown as jest.Mock).mockImplementation(() => ({
      subscriptions: {
        retrieve: mockStripeRetrieve,
      },
      refunds: {
        create: mockStripeRefund,
      },
    }));
  });

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (requireAdmin as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'user_1' },
      body: { amount: 10.00, reason: 'Test refund' },
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
      body: { amount: 10.00, reason: 'Test refund' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Invalid user ID');
  });

  it('should return 400 if amount is missing or invalid', async () => {
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
      query: { id: 'user_1' },
      body: { reason: 'Test refund' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Invalid refund amount');
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
      body: { amount: 10.00, reason: 'Test refund' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('User not found');
  });

  it('should return 400 if user has no subscription', async () => {
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
      rows: [{ id: 'user_1', email: 'user@test.com', stripe_subscription_id: null }],
    });

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'user_1' },
      body: { amount: 10.00, reason: 'Test refund' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('User has no subscription');
  });

  it('should return 400 if no payment found', async () => {
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
    };

    mockExecute.mockResolvedValueOnce({ rows: [mockUser] });
    mockStripeRetrieve.mockResolvedValue({
      id: 'sub_123',
      latest_invoice: null,
    });

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'user_1' },
      body: { amount: 10.00, reason: 'Test refund' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('No payment found for this subscription');
  });

  it('should successfully process refund', async () => {
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
    };

    mockExecute
      .mockResolvedValueOnce({ rows: [mockUser] })
      .mockResolvedValueOnce({ rows: [] });

    mockStripeRetrieve.mockResolvedValue({
      id: 'sub_123',
      latest_invoice: {
        payment_intent: 'pi_123',
      },
    });

    mockStripeRefund.mockResolvedValue({
      id: 're_123',
      amount: 1000,
      status: 'succeeded',
    });

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'user_1' },
      body: { amount: 10.00, reason: 'Customer requested refund' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toBe('Refund processed successfully');
    expect(mockStripeRefund).toHaveBeenCalledWith({
      payment_intent: 'pi_123',
      amount: 1000,
      reason: 'requested_by_customer',
    });
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin_1',
      'REFUND_SUBSCRIPTION',
      'subscription',
      'user_1',
      { reason: 'Customer requested refund', amount: 10.00, refund_id: 're_123' },
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
    };

    mockExecute.mockResolvedValueOnce({ rows: [mockUser] });
    mockStripeRetrieve.mockRejectedValue(new Error('Stripe API error'));

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'user_1' },
      body: { amount: 10.00, reason: 'Test refund' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to process refund');
  });
});
