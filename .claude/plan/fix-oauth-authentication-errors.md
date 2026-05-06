# Implementation Plan: Fix OAuth Authentication Errors

## Problem Statement

After Google/GitHub OAuth login, users encounter two persistent errors:
1. **"Failed to fetch channels"** - 402 error from `/api/channels`
2. **"Application error" on subscription upgrade** - occurs regardless of login state

Despite schema fixes that added `subscription_status` and `trial_ends_at` columns, the errors persist in production.

## Root Cause Analysis

### Issue 1: Missing session.user.id for OAuth users

**Problem**: NextAuth's `session` callback sets `session.user.id = token.sub`, but for OAuth providers, `token.sub` may not be set correctly on first login.

**Evidence**:
- `pages/api/auth/[...nextauth].ts:56` - `session.user.id = token.sub!`
- `pages/api/channels/index.ts:24` - calls `getOrCreateUser(session.user.id, ...)`
- If `session.user.id` is undefined/null, database operations fail silently

**Root cause**: NextAuth's JWT callback doesn't populate `token.sub` with the user's database ID for OAuth users. The `user` object in the JWT callback contains the OAuth profile, not the database user record.

### Issue 2: User creation happens AFTER subscription check

**Problem**: The flow is:
1. User logs in via OAuth
2. NextAuth creates session with `token.sub` (OAuth provider ID, not database ID)
3. `/api/channels` calls `getOrCreateUser()` - creates user in database
4. Immediately calls `getSubscriptionStatus()` - but user might not be fully committed to database yet
5. Returns 402 error

**Root cause**: Race condition between user creation and subscription check. Even if user is created with trial, the subscription check might read stale data.

### Issue 3: Database schema mismatch in production

**Problem**: The `initUsersTable()` function in `lib/users.ts` was updated, but Turso production database might still have the old schema without `subscription_status` and `trial_ends_at` columns.

**Evidence**:
- `lib/users.ts:19-34` defines schema with new columns
- `lib/db.ts:54-82` has a different schema definition with all columns
- Production database uses `lib/db.ts` schema, not `lib/users.ts`

**Root cause**: Schema mismatch - `lib/users.ts` tries to INSERT into columns that don't exist in production.

### Issue 4: Stripe checkout session error

**Problem**: Subscription upgrade button fails even when not logged in.

**Evidence**:
- `pages/subscription.tsx:56` calls `/api/stripe/create-checkout-session`
- `pages/api/stripe/create-checkout-session.ts:12` calls `getServerSession(req, res, {})`
- Empty `authOptions` object passed - should be `authOptions` from `[...nextauth].ts`

**Root cause**: `getServerSession()` called with empty config object instead of `authOptions`, so session is never found.

## Technical Solution

### Fix 1: Populate session.user.id correctly in NextAuth callbacks

Update the JWT and session callbacks to:
1. Store the user's email in the token
2. Call `getOrCreateUser()` in the JWT callback (runs on login)
3. Store the database user ID in the token
4. Pass the database user ID to the session

### Fix 2: Remove subscription check from /api/channels

The subscription check is too aggressive - it blocks all authenticated users. Instead:
1. Remove the 402 subscription check from `/api/channels/index.ts`
2. Let users with active trials access channels
3. Only enforce limits based on tier (free=10, pro=100, enterprise=unlimited)

### Fix 3: Use single source of truth for database schema

Stop using `lib/users.ts` `initUsersTable()` - it's redundant and causes schema drift. Use only `lib/db.ts` `initDatabase()`.

### Fix 4: Fix Stripe checkout session authentication

Pass `authOptions` to `getServerSession()` in `create-checkout-session.ts`.

## Implementation Steps

### Step 1: Fix NextAuth callbacks to populate session.user.id

**File**: `pages/api/auth/[...nextauth].ts`

**Changes**:
```typescript
callbacks: {
  async jwt({ token, user, account }) {
    // On sign in (when user object exists)
    if (user && account) {
      // Get or create user in database
      const dbUser = await getOrCreateUser(
        user.email!,
        user.email!,
        user.name || null
      );
      
      // Store database user ID in token
      token.sub = dbUser.id;
      token.tier = dbUser.tier;
    }
    
    return token;
  },
  
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.sub!;
      session.user.tier = (token.tier as string) || 'free';
    }
    return session;
  },
},
```

**Expected outcome**: `session.user.id` contains the database user ID, not the OAuth provider ID.

### Step 2: Remove aggressive subscription check from /api/channels

**File**: `pages/api/channels/index.ts`

**Changes**:
```typescript
// REMOVE lines 32-41 (subscription check that returns 402)
// Keep only tier-based limits

if (session?.user) {
  const user = await getOrCreateUser(
    session.user.id,
    session.user.email!,
    session.user.name || null
  );

  userTier = user.tier;
  channelsViewedThisMonth = await getChannelsViewedThisMonth(session.user.id);
  
  // Check tier limits, not subscription status
  canView = canViewMoreChannels(userTier, channelsViewedThisMonth);

  if (canView) {
    await incrementChannelsViewed(session.user.id);
    channelsViewedThisMonth += 1;
  }
}
```

**Expected outcome**: Users with trials can access channels. Only tier limits are enforced.

### Step 3: Fix Stripe checkout session authentication

**File**: `pages/api/stripe/create-checkout-session.ts`

**Changes**:
```typescript
import { authOptions } from '../auth/[...nextauth]';

// Line 12: Change from
const session = await getServerSession(req, res, {});

// To:
const session = await getServerSession(req, res, authOptions);
```

**Expected outcome**: Authenticated users can create Stripe checkout sessions.

### Step 4: Update getOrCreateUser signature

**File**: `lib/users.ts`

**Changes**:
```typescript
// Change signature from:
export async function getOrCreateUser(userId: string, email: string, name: string | null): Promise<User>

// To:
export async function getOrCreateUser(email: string, name: string | null): Promise<User>

// Generate userId inside the function:
const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

**Expected outcome**: User ID is generated internally, not passed from OAuth provider ID.

### Step 5: Add import for getOrCreateUser in NextAuth

**File**: `pages/api/auth/[...nextauth].ts`

**Changes**:
```typescript
import { getOrCreateUser } from '@/lib/users';
```

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| pages/api/auth/[...nextauth].ts:53-67 | Modify | Fix JWT and session callbacks to populate session.user.id correctly |
| pages/api/channels/index.ts:32-41 | Remove | Remove aggressive subscription check that blocks all users |
| pages/api/stripe/create-checkout-session.ts:1,12 | Modify | Import and use authOptions for session authentication |
| lib/users.ts:36 | Modify | Change getOrCreateUser signature to not require userId parameter |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing users | Test with existing OAuth users before deploying |
| Database write failures | Add error logging in getOrCreateUser() |
| Session token size | JWT tokens are limited to 4KB - storing user data should be fine |
| Race conditions | getOrCreateUser() is called in JWT callback which runs synchronously |

## Testing Plan

1. **Test OAuth login flow**:
   - Sign in with Google
   - Verify session.user.id is populated
   - Verify user is created in database with trial
   - Verify channels load without 402 error

2. **Test subscription upgrade**:
   - Click "Upgrade Plan" button while logged in
   - Verify redirect to Stripe checkout
   - Verify no application error

3. **Test tier limits**:
   - Create free tier user
   - View 10 channels
   - Verify 11th channel is blocked

## Task Type
- [x] Fullstack (→ Parallel)

## SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: N/A (wrapper not available)
- GEMINI_SESSION: N/A (wrapper not available)
