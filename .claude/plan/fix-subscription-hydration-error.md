# Implementation Plan: Fix Subscription Page Hydration Error

## Problem Statement

When clicking "Upgrade Plan" button on the subscription page, React throws error #423 (hydration mismatch):
```
Uncaught Error: Minified React error #423
```

This error occurs when server-rendered HTML doesn't match the client-side render.

## Root Cause Analysis

### Issue: Inline style prop causing hydration mismatch

**Problem**: The subscription page uses inline `style={{ animationDelay: '0.1s' }}` props on pricing cards (lines 188, 228, 263).

**Evidence**:
- `pages/subscription.tsx:188` - Pro tier card: `style={{ animationDelay: '0.1s' }}`
- `pages/subscription.tsx:228` - Enterprise tier card: `style={{ animationDelay: '0.2s' }}`
- `pages/subscription.tsx:263` - FAQ section: `style={{ animationDelay: '0.3s' }}`

**Root cause**: React hydration expects server HTML to match client render exactly. Inline styles with animation delays can cause timing issues during hydration, especially when combined with CSS modules and Tailwind classes.

### Additional Issues

1. **Conditional rendering before hydration** - The page conditionally renders based on `loading` and `error` states, which can cause hydration mismatches if server and client states differ
2. **Date formatting** - Line 139 uses `new Date().toLocaleDateString()` which can produce different output on server vs client due to timezone differences
3. **CSS module classes mixed with inline styles** - Combining `className={styles.liquidGlass}` with inline `style` props increases hydration risk

## Technical Solution

### Fix 1: Move animation delays to CSS modules

Instead of inline styles, define animation delay classes in CSS modules:
- Create `.delayShort`, `.delayMedium`, `.delayLong` classes
- Apply via className instead of inline style

### Fix 2: Suppress hydration warnings for date formatting

Use `suppressHydrationWarning` on date elements to prevent mismatch errors.

### Fix 3: Ensure consistent initial state

Make sure `loading` state is handled consistently between server and client.

## Implementation Steps

### Step 1: Create animation delay classes in CSS module

**File**: `styles/effects.module.css`

**Changes**:
```css
/* Add animation delay utilities */
.delayShort {
  animation-delay: 0.1s;
}

.delayMedium {
  animation-delay: 0.2s;
}

.delayLong {
  animation-delay: 0.3s;
}
```

**Expected outcome**: Animation delays defined in CSS instead of inline styles.

### Step 2: Replace inline style props with CSS classes

**File**: `pages/subscription.tsx`

**Changes**:
```typescript
// Line 188: Pro tier card
// REMOVE: style={{ animationDelay: '0.1s' }}
// ADD: className includes styles.delayShort
<div className={`${styles.liquidGlass} ${animations.fadeInUp} ${styles.delayShort} rounded-2xl p-8 ${currentTier === 'pro' ? 'ring-4 ring-indigo-500' : ''} relative`}>

// Line 228: Enterprise tier card
// REMOVE: style={{ animationDelay: '0.2s' }}
// ADD: className includes styles.delayMedium
<div className={`${styles.liquidGlass} ${animations.fadeInUp} ${styles.delayMedium} rounded-2xl p-8 ${currentTier === 'enterprise' ? 'ring-4 ring-indigo-500' : ''}`}>

// Line 263: FAQ section
// REMOVE: style={{ animationDelay: '0.3s' }}
// ADD: className includes styles.delayLong
<div className={`${styles.liquidGlass} ${animations.fadeInUp} ${styles.delayLong} rounded-2xl p-8 mt-12`}>
```

**Expected outcome**: No inline style props, all styling via CSS classes.

### Step 3: Add suppressHydrationWarning to date element

**File**: `pages/subscription.tsx`

**Changes**:
```typescript
// Line 139: Add suppressHydrationWarning
<div className="text-gray-600" suppressHydrationWarning>
  {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
  {new Date(subscription.current_period_end).toLocaleDateString()}
</div>
```

**Expected outcome**: Date formatting differences between server/client won't cause hydration errors.

### Step 4: Ensure consistent loading state

**File**: `pages/subscription.tsx`

**Changes**:
```typescript
// Add useEffect to prevent hydration mismatch
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

// In render, check mounted state
if (!mounted || loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className={animations.shimmer}>Loading subscription...</div>
    </div>
  );
}
```

**Expected outcome**: Consistent rendering between server and client.

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| styles/effects.module.css | Modify | Add animation delay utility classes |
| pages/subscription.tsx:188,228,263 | Modify | Replace inline style props with CSS classes |
| pages/subscription.tsx:139 | Modify | Add suppressHydrationWarning to date element |
| pages/subscription.tsx:17-25 | Modify | Add mounted state to prevent hydration mismatch |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Animation timing changes | Test animations visually after changes |
| Breaking other pages using effects.module.css | Only add new classes, don't modify existing |
| Loading state flicker | Use CSS to hide content until mounted |

## Testing Plan

1. **Test subscription page load**:
   - Navigate to /subscription
   - Verify no console errors
   - Verify animations play correctly

2. **Test upgrade button**:
   - Click "Upgrade to Pro" button
   - Verify redirect to Stripe checkout
   - Verify no React error #423

3. **Test date formatting**:
   - Check subscription renewal date displays correctly
   - Verify no hydration warnings in console

4. **Test across browsers**:
   - Chrome, Firefox, Safari
   - Verify consistent behavior

## Task Type
- [x] Frontend (→ Gemini)

## SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: N/A (wrapper not available)
- GEMINI_SESSION: N/A (wrapper not available)
