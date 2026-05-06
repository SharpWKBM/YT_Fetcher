# Implementation Plan: Comprehensive Admin Panel

## Problem Statement

Create a full-featured admin panel for managing users, subscriptions, channels, and system analytics. The admin panel should provide:
- Secure admin-only authentication
- User management (view, edit, delete users, change tiers)
- Subscription management (view all subscriptions, revenue analytics, cancel/modify)
- Channel management (approve/reject, blacklist, bulk operations)
- Analytics dashboard (revenue charts, user growth, conversion rates)
- System settings (configure tier limits, pricing, feature flags)
- Activity logs (audit trail for all admin actions)

## Task Type
- [x] Fullstack (→ Parallel: Backend + Frontend)

## Technical Solution

### Architecture Overview

**Backend (Codex focus):**
- Admin authentication middleware with role-based access control (RBAC)
- Admin API endpoints for CRUD operations on users, subscriptions, channels
- Analytics aggregation queries for dashboard metrics
- Activity logging system for audit trail
- Stripe integration for subscription management and refunds

**Frontend (Gemini focus):**
- Modern admin dashboard UI with data tables, charts, and filters
- Real-time statistics and metrics display
- Export functionality (CSV/Excel)
- Responsive design with professional styling
- Secure admin-only routing

### Database Schema Extensions

Add admin-related tables:
```sql
-- Admin activity logs
CREATE TABLE admin_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'subscription', 'channel', 'system'
  target_id TEXT,
  details TEXT, -- JSON
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- System settings
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

### Security Model

1. **Admin Role Check**: `is_admin = 1` in users table
2. **Middleware**: Verify admin status on all `/api/admin/*` endpoints
3. **Session Validation**: Use NextAuth session with admin role check
4. **Activity Logging**: Log all admin actions for audit trail

## Implementation Steps

### Phase 1: Backend - Admin Authentication & Middleware

**File**: `lib/admin.ts` (Create)

**Changes**:
```typescript
// Admin authentication and authorization utilities
export async function isAdmin(userId: string): Promise<boolean>
export async function requireAdmin(req, res): Promise<User | null>
export async function logAdminAction(adminId, action, targetType, targetId, details)
```

**Expected outcome**: Admin authentication utilities ready for use in API routes.

---

### Phase 2: Backend - Admin API Endpoints

**Files to create**:
- `pages/api/admin/users/index.ts` - List all users, search, filter
- `pages/api/admin/users/[id].ts` - Get, update, delete user
- `pages/api/admin/users/[id]/tier.ts` - Change user tier
- `pages/api/admin/subscriptions/index.ts` - List all subscriptions
- `pages/api/admin/subscriptions/[id].ts` - View, cancel, refund subscription
- `pages/api/admin/channels/index.ts` - List all channels with filters
- `pages/api/admin/channels/[id]/blacklist.ts` - Blacklist/unblacklist channel
- `pages/api/admin/channels/bulk.ts` - Bulk operations (approve, reject, delete)
- `pages/api/admin/analytics/dashboard.ts` - Dashboard metrics
- `pages/api/admin/analytics/revenue.ts` - Revenue analytics
- `pages/api/admin/analytics/users.ts` - User growth metrics
- `pages/api/admin/settings/index.ts` - Get/update system settings
- `pages/api/admin/logs/index.ts` - Activity logs

**Expected outcome**: Complete REST API for admin operations.

---

### Phase 3: Backend - Analytics Aggregation

**File**: `lib/analytics.ts` (Create)

**Changes**:
```typescript
// Analytics aggregation functions
export async function getDashboardMetrics(): Promise<DashboardMetrics>
export async function getRevenueAnalytics(startDate, endDate): Promise<RevenueData>
export async function getUserGrowthMetrics(period): Promise<GrowthData>
export async function getSubscriptionConversionRates(): Promise<ConversionData>
export async function getChannelStatistics(): Promise<ChannelStats>
```

**Expected outcome**: Analytics data ready for dashboard display.

---

### Phase 4: Frontend - Admin Layout & Navigation

**Files to create**:
- `pages/admin/index.tsx` - Admin dashboard home
- `components/admin/AdminLayout.tsx` - Admin layout with sidebar navigation
- `components/admin/AdminNav.tsx` - Admin navigation menu
- `styles/Admin.module.css` - Admin-specific styles

**Expected outcome**: Admin layout structure with navigation.

---

### Phase 5: Frontend - User Management Dashboard

**Files to create**:
- `pages/admin/users/index.tsx` - User list with search/filter
- `pages/admin/users/[id].tsx` - User detail view
- `components/admin/UserTable.tsx` - Data table for users
- `components/admin/UserFilters.tsx` - Search and filter controls
- `components/admin/UserEditModal.tsx` - Edit user modal

**Expected outcome**: Complete user management interface.

---

### Phase 6: Frontend - Subscription Management

**Files to create**:
- `pages/admin/subscriptions/index.tsx` - Subscription list
- `pages/admin/subscriptions/[id].tsx` - Subscription detail
- `components/admin/SubscriptionTable.tsx` - Data table for subscriptions
- `components/admin/SubscriptionActions.tsx` - Cancel/refund actions

**Expected outcome**: Subscription management interface.

---

### Phase 7: Frontend - Channel Management

**Files to create**:
- `pages/admin/channels/index.tsx` - Channel list with bulk actions
- `pages/admin/channels/[id].tsx` - Channel detail view
- `components/admin/ChannelTable.tsx` - Data table for channels
- `components/admin/ChannelBulkActions.tsx` - Bulk operation controls
- `components/admin/BlacklistModal.tsx` - Blacklist reason modal

**Expected outcome**: Channel management interface with bulk operations.

---

### Phase 8: Frontend - Analytics Dashboard

**Files to create**:
- `pages/admin/analytics/index.tsx` - Analytics dashboard
- `components/admin/RevenueChart.tsx` - Revenue chart (line/bar)
- `components/admin/UserGrowthChart.tsx` - User growth chart
- `components/admin/ConversionFunnel.tsx` - Conversion funnel visualization
- `components/admin/MetricsCards.tsx` - Key metrics cards (MRR, users, channels)

**Charts library**: Use `recharts` for data visualization

**Expected outcome**: Visual analytics dashboard with charts.

---

### Phase 9: Frontend - System Settings

**Files to create**:
- `pages/admin/settings/index.tsx` - System settings page
- `components/admin/SettingsForm.tsx` - Settings form
- `components/admin/TierLimitsConfig.tsx` - Configure tier limits
- `components/admin/PricingConfig.tsx` - Configure pricing

**Expected outcome**: System configuration interface.

---

### Phase 10: Frontend - Activity Logs

**Files to create**:
- `pages/admin/logs/index.tsx` - Activity logs page
- `components/admin/LogsTable.tsx` - Activity logs table
- `components/admin/LogsFilters.tsx` - Filter logs by admin, action, date

**Expected outcome**: Audit trail interface.

---

### Phase 11: Frontend - Export Functionality

**File**: `lib/export.ts` (Create)

**Changes**:
```typescript
// Export utilities
export function exportToCSV(data: any[], filename: string)
export function exportToExcel(data: any[], filename: string)
```

**Expected outcome**: Export functionality for all data tables.

---

### Phase 12: Integration & Testing

**Tasks**:
1. Test admin authentication flow
2. Test all CRUD operations
3. Test analytics data accuracy
4. Test export functionality
5. Test responsive design on mobile/tablet
6. Test activity logging
7. Security audit (admin-only access, SQL injection prevention)

**Expected outcome**: Fully functional and secure admin panel.

---

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| lib/admin.ts | Create | Admin authentication and authorization utilities |
| lib/analytics.ts | Create | Analytics aggregation functions |
| lib/export.ts | Create | CSV/Excel export utilities |
| pages/api/admin/users/index.ts | Create | User management API |
| pages/api/admin/subscriptions/index.ts | Create | Subscription management API |
| pages/api/admin/channels/index.ts | Create | Channel management API |
| pages/api/admin/analytics/dashboard.ts | Create | Dashboard metrics API |
| pages/api/admin/settings/index.ts | Create | System settings API |
| pages/api/admin/logs/index.ts | Create | Activity logs API |
| pages/admin/index.tsx | Create | Admin dashboard home |
| components/admin/AdminLayout.tsx | Create | Admin layout component |
| components/admin/UserTable.tsx | Create | User data table |
| components/admin/SubscriptionTable.tsx | Create | Subscription data table |
| components/admin/ChannelTable.tsx | Create | Channel data table |
| components/admin/RevenueChart.tsx | Create | Revenue chart component |
| components/admin/MetricsCards.tsx | Create | Key metrics cards |
| lib/db.ts | Modify | Add admin_logs and system_settings tables |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Unauthorized access to admin panel | Implement strict middleware checks on all admin routes, verify is_admin flag |
| SQL injection in admin queries | Use parameterized queries, validate all inputs |
| Performance issues with large datasets | Implement pagination, lazy loading, database indexes |
| Accidental data deletion | Add confirmation modals, implement soft deletes, log all actions |
| Stripe API rate limits | Implement rate limiting, caching for subscription data |
| Export file size limits | Limit export to 10,000 rows, add pagination for large exports |

## Testing Plan

1. **Admin Authentication**:
   - Verify non-admin users cannot access admin routes
   - Test admin login flow
   - Test session expiration

2. **User Management**:
   - Create, read, update, delete users
   - Change user tiers
   - Search and filter users

3. **Subscription Management**:
   - View all subscriptions
   - Cancel subscriptions
   - Process refunds
   - View revenue analytics

4. **Channel Management**:
   - Blacklist/unblacklist channels
   - Bulk approve/reject channels
   - Search and filter channels

5. **Analytics Dashboard**:
   - Verify metrics accuracy
   - Test chart rendering
   - Test date range filters

6. **Activity Logs**:
   - Verify all admin actions are logged
   - Test log filtering
   - Test log export

7. **Export Functionality**:
   - Export users to CSV
   - Export subscriptions to Excel
   - Verify data integrity

8. **Security**:
   - Attempt unauthorized access
   - Test SQL injection prevention
   - Test XSS prevention

## Dependencies

- `recharts` - Charts library for analytics dashboard
- `xlsx` - Excel export functionality
- `papaparse` - CSV parsing and generation
- `date-fns` - Date manipulation for analytics

## SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: N/A (will be generated during execution)
- GEMINI_SESSION: N/A (will be generated during execution)
