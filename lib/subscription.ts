import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'abdullahtutaev@gmail.com';

export interface SubscriptionStatus {
  isActive: boolean;
  isAdmin: boolean;
  isTrial: boolean;
  status: string | null;
  tier: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const result = await client.execute({
    sql: 'SELECT is_admin, email FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) return false;

  const user = result.rows[0];
  return user.is_admin === 1 || user.email === ADMIN_EMAIL;
}

export async function setAdminUser(email: string): Promise<void> {
  await client.execute({
    sql: 'UPDATE users SET is_admin = 1 WHERE email = ?',
    args: [email],
  });
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  if (await isAdmin(userId)) return true;

  const result = await client.execute({
    sql: `SELECT subscription_status, stripe_current_period_end, trial_ends_at 
          FROM users WHERE id = ?`,
    args: [userId],
  });

  if (result.rows.length === 0) return false;

  const user = result.rows[0];

  if (user.subscription_status === 'active') {
    if (user.stripe_current_period_end) {
      const periodEnd = new Date(user.stripe_current_period_end as string);
      if (periodEnd > new Date()) return true;
    }
  }

  if (user.subscription_status === 'trialing' && user.trial_ends_at) {
    const trialEnd = new Date(user.trial_ends_at as string);
    if (trialEnd > new Date()) return true;
  }

  return false;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const result = await client.execute({
    sql: `SELECT tier, subscription_status, trial_ends_at, 
          stripe_current_period_end, is_admin, email 
          FROM users WHERE id = ?`,
    args: [userId],
  });

  if (result.rows.length === 0) {
    return {
      isActive: false,
      isAdmin: false,
      isTrial: false,
      status: null,
      tier: 'free',
      trialEndsAt: null,
      currentPeriodEnd: null,
    };
  }

  const user = result.rows[0];
  const adminStatus = user.is_admin === 1 || user.email === ADMIN_EMAIL;
  const hasActive = await hasActiveSubscription(userId);

  return {
    isActive: hasActive,
    isAdmin: adminStatus,
    isTrial: user.subscription_status === 'trialing',
    status: user.subscription_status as string | null,
    tier: user.tier as string,
    trialEndsAt: user.trial_ends_at as string | null,
    currentPeriodEnd: user.stripe_current_period_end as string | null,
  };
}

export async function requiresSubscription(userId: string): Promise<boolean> {
  return !(await hasActiveSubscription(userId));
}

export enum Feature {
  CHANNEL_VIEWING = 'channel_viewing',
  EXPORT_DATA = 'export_data',
  ADVANCED_FILTERS = 'advanced_filters',
  API_ACCESS = 'api_access',
  BULK_OPERATIONS = 'bulk_operations',
}

const FEATURE_REQUIREMENTS: Record<Feature, string[]> = {
  [Feature.CHANNEL_VIEWING]: ['free', 'pro', 'enterprise'],
  [Feature.EXPORT_DATA]: ['pro', 'enterprise'],
  [Feature.ADVANCED_FILTERS]: ['pro', 'enterprise'],
  [Feature.API_ACCESS]: ['enterprise'],
  [Feature.BULK_OPERATIONS]: ['enterprise'],
};

export async function canAccessFeature(userId: string, feature: Feature): Promise<boolean> {
  if (await isAdmin(userId)) return true;

  const status = await getSubscriptionStatus(userId);

  if (!status.isActive) return false;

  const requiredTiers = FEATURE_REQUIREMENTS[feature];
  return requiredTiers.includes(status.tier);
}

export async function createTrial(userId: string, days: number = 7): Promise<void> {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + days);

  await client.execute({
    sql: `UPDATE users 
          SET subscription_status = 'trialing', 
              trial_ends_at = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [trialEnd.toISOString(), userId],
  });
}

export async function isTrialActive(userId: string): Promise<boolean> {
  const result = await client.execute({
    sql: 'SELECT subscription_status, trial_ends_at FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) return false;

  const user = result.rows[0];

  if (user.subscription_status !== 'trialing') return false;

  if (user.trial_ends_at) {
    const trialEnd = new Date(user.trial_ends_at as string);
    return trialEnd > new Date();
  }

  return false;
}

export async function getTrialDaysRemaining(userId: string): Promise<number> {
  const result = await client.execute({
    sql: 'SELECT trial_ends_at FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0 || !result.rows[0].trial_ends_at) return 0;

  const trialEnd = new Date(result.rows[0].trial_ends_at as string);
  const now = new Date();

  if (trialEnd <= now) return 0;

  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}
