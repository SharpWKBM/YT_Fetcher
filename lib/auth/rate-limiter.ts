interface RateLimitEntry {
  count: number;
  lockedUntil?: Date;
  firstAttempt: Date;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const WINDOW_DURATION_MS = 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
  resetAt?: Date;
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = new Date();
  const entry = loginAttempts.get(identifier);

  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      lockedUntil: entry.lockedUntil,
    };
  }

  const windowExpired = now.getTime() - entry.firstAttempt.getTime() > WINDOW_DURATION_MS;
  if (windowExpired) {
    loginAttempts.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
    entry.lockedUntil = lockedUntil;
    loginAttempts.set(identifier, entry);

    return {
      allowed: false,
      lockedUntil,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - entry.count,
    resetAt: new Date(entry.firstAttempt.getTime() + WINDOW_DURATION_MS),
  };
}

export function recordFailedAttempt(identifier: string): void {
  const now = new Date();
  const entry = loginAttempts.get(identifier);

  if (!entry) {
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
    });
    return;
  }

  const windowExpired = now.getTime() - entry.firstAttempt.getTime() > WINDOW_DURATION_MS;
  if (windowExpired) {
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
    });
    return;
  }

  entry.count += 1;
  loginAttempts.set(identifier, entry);
}

export function recordSuccessfulLogin(identifier: string): void {
  loginAttempts.delete(identifier);
}

export function clearRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}

export function getRateLimitStats(identifier: string): RateLimitEntry | null {
  return loginAttempts.get(identifier) || null;
}

setInterval(() => {
  const now = new Date();
  for (const [key, entry] of loginAttempts.entries()) {
    const expired = now.getTime() - entry.firstAttempt.getTime() > WINDOW_DURATION_MS;
    const unlocked = entry.lockedUntil && entry.lockedUntil < now;

    if (expired || unlocked) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);
