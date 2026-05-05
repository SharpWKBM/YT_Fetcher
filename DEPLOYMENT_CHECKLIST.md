# Production Deployment Checklist

Use this checklist to ensure all steps are completed before deploying to production.

## Pre-Deployment

### API Keys and Services

- [ ] **YouTube API Keys** (5 keys created and tested)
  - [ ] Key 1: Created and restricted to YouTube Data API v3
  - [ ] Key 2: Created and restricted to YouTube Data API v3
  - [ ] Key 3: Created and restricted to YouTube Data API v3
  - [ ] Key 4: Created and restricted to YouTube Data API v3
  - [ ] Key 5: Created and restricted to YouTube Data API v3
  - [ ] All keys tested with sample API calls

- [ ] **Google OAuth**
  - [ ] OAuth 2.0 Client ID created
  - [ ] Authorized redirect URIs configured
  - [ ] Client ID and Secret copied
  - [ ] Test login working

- [ ] **GitHub OAuth**
  - [ ] OAuth App created
  - [ ] Authorization callback URL configured
  - [ ] Client ID and Secret copied
  - [ ] Test login working

- [ ] **Stripe**
  - [ ] Live API keys obtained (not test keys)
  - [ ] Pro plan product created ($9.99/month)
  - [ ] Enterprise plan product created ($29.99/month)
  - [ ] Price IDs copied
  - [ ] Webhook endpoint configured
  - [ ] Webhook signing secret copied
  - [ ] Test checkout flow completed

- [ ] **Turso Database**
  - [ ] Production database created
  - [ ] Database URL copied
  - [ ] Auth token generated
  - [ ] Connection tested

### Environment Variables

- [ ] All environment variables documented in `.env.example`
- [ ] Production `.env.production` file created
- [ ] All secrets generated with sufficient entropy (min 32 chars)
- [ ] `NEXTAUTH_SECRET` generated: `openssl rand -base64 32`
- [ ] `CRON_SECRET` generated: `openssl rand -hex 32`
- [ ] No test/development keys in production config
- [ ] Environment variables added to Vercel dashboard

### Code Quality

- [ ] All TypeScript errors resolved: `npm run type-check`
- [ ] Build succeeds locally: `npm run build`
- [ ] All tests passing: `npm test`
- [ ] No console.log statements in production code
- [ ] No hardcoded secrets or API keys
- [ ] Error handling implemented for all API routes
- [ ] Rate limiting configured on all endpoints

### Security

- [ ] Password validation enforces strong passwords (12+ chars, complexity)
- [ ] Temporary email domains blocked
- [ ] 2FA implementation tested
- [ ] Stripe webhook signature verification enabled
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized inputs)
- [ ] CSRF protection enabled (NextAuth default)
- [ ] HTTPS enforced (Vercel default)
- [ ] Security headers configured

### Database

- [ ] Schema created in production database
- [ ] Indexes created for performance
- [ ] Initial data migration plan ready
- [ ] Backup strategy defined
- [ ] Connection pooling configured

## Deployment

### Vercel Setup

- [ ] Vercel account created/logged in
- [ ] GitHub repository connected
- [ ] Project created in Vercel
- [ ] Framework preset: Next.js
- [ ] Node.js version: 18.x or higher
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`

### Environment Configuration

- [ ] All environment variables added to Vercel
- [ ] Variables set for "Production" environment
- [ ] Sensitive variables marked as sensitive
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] OAuth redirect URIs updated with production domain
- [ ] Stripe webhook endpoint updated with production domain

### Initial Deployment

- [ ] Code pushed to main branch
- [ ] Vercel deployment triggered
- [ ] Build completed successfully
- [ ] No build errors or warnings
- [ ] Deployment URL accessible

### Database Initialization

- [ ] Connected to production database
- [ ] Schema creation SQL executed
- [ ] Indexes created
- [ ] Initial admin user created (if applicable)
- [ ] Database connection verified from deployed app

### Cron Job Setup

- [ ] `vercel.json` cron configuration verified
- [ ] Cron job manually triggered to test
- [ ] Initial channel data populated
- [ ] Cron execution logs reviewed
- [ ] Weekly schedule confirmed (Sunday 2 AM UTC)

## Post-Deployment Testing

### Functional Testing

- [ ] **Homepage**
  - [ ] Loads without errors
  - [ ] Liquid-glass effects render correctly
  - [ ] Animations smooth (60fps)
  - [ ] Responsive on mobile/tablet/desktop

- [ ] **Authentication**
  - [ ] Email/password registration works
  - [ ] Email validation prevents temporary emails
  - [ ] Password strength validation works
  - [ ] Google OAuth login works
  - [ ] GitHub OAuth login works
  - [ ] Session persists across page reloads
  - [ ] Logout works correctly

- [ ] **2FA (Two-Factor Authentication)**
  - [ ] QR code generates correctly
  - [ ] TOTP codes verify successfully
  - [ ] 2FA can be enabled/disabled
  - [ ] Login requires 2FA when enabled
  - [ ] Backup codes provided

- [ ] **Profile Management**
  - [ ] Profile page displays user info
  - [ ] Profile editing works
  - [ ] Avatar upload works (max 5MB)
  - [ ] Bio update works
  - [ ] Password change works
  - [ ] Password change validates current password
  - [ ] Preferences save correctly

- [ ] **Channel Discovery**
  - [ ] Channel list displays
  - [ ] Pagination works
  - [ ] Search functionality works
  - [ ] Advanced filters work:
    - [ ] Subscriber range filter
    - [ ] Last activity filter
    - [ ] Niche filter (20 categories)
    - [ ] Tags filter
    - [ ] Video count filter
    - [ ] Social links filter
    - [ ] Blacklist exclusion
  - [ ] Social media links extracted correctly
  - [ ] Channel niche classification accurate

- [ ] **Subscription & Payment**
  - [ ] Subscription page displays plans
  - [ ] Free plan features listed
  - [ ] Pro plan checkout works
  - [ ] Enterprise plan checkout works
  - [ ] Stripe checkout session redirects correctly
  - [ ] Payment succeeds with test card
  - [ ] Subscription status updates in database
  - [ ] Subscription tier displays in profile
  - [ ] Billing portal accessible
  - [ ] Subscription cancellation works
  - [ ] Webhook events processed correctly

### Security Testing

- [ ] **Authentication Security**
  - [ ] Cannot access protected routes without login
  - [ ] Session expires after timeout
  - [ ] Password reset flow secure
  - [ ] 2FA cannot be bypassed

- [ ] **API Security**
  - [ ] Rate limiting active (100 req/15min)
  - [ ] Rate limit headers present
  - [ ] Unauthorized requests rejected (401)
  - [ ] Invalid tokens rejected
  - [ ] CORS configured correctly

- [ ] **Payment Security**
  - [ ] Stripe webhook signature verified
  - [ ] Cannot manipulate subscription tier client-side
  - [ ] Payment amounts cannot be modified
  - [ ] Webhook replay attacks prevented

- [ ] **Input Validation**
  - [ ] SQL injection attempts blocked
  - [ ] XSS attempts sanitized
  - [ ] File upload validates type and size
  - [ ] Email format validated
  - [ ] Password complexity enforced

### Performance Testing

- [ ] **Page Load Performance**
  - [ ] Homepage loads < 3 seconds
  - [ ] Time to First Byte (TTFB) < 600ms
  - [ ] First Contentful Paint (FCP) < 1.8s
  - [ ] Largest Contentful Paint (LCP) < 2.5s
  - [ ] Cumulative Layout Shift (CLS) < 0.1
  - [ ] First Input Delay (FID) < 100ms

- [ ] **API Performance**
  - [ ] Channel list API < 500ms
  - [ ] Search API < 800ms
  - [ ] Profile API < 300ms
  - [ ] Authentication API < 400ms

- [ ] **Database Performance**
  - [ ] Queries use indexes
  - [ ] No N+1 query issues
  - [ ] Connection pooling working
  - [ ] Query response times < 100ms

- [ ] **Lighthouse Audit**
  - [ ] Performance score > 90
  - [ ] Accessibility score > 90
  - [ ] Best Practices score > 90
  - [ ] SEO score > 90

### Browser Compatibility

- [ ] **Desktop Browsers**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)

- [ ] **Mobile Browsers**
  - [ ] Chrome Mobile (Android)
  - [ ] Safari Mobile (iOS)
  - [ ] Samsung Internet

### Monitoring Setup

- [ ] **Vercel Analytics**
  - [ ] Web Analytics enabled
  - [ ] Speed Insights enabled
  - [ ] Real User Monitoring active

- [ ] **Error Tracking**
  - [ ] Error logs accessible in Vercel
  - [ ] Error notifications configured
  - [ ] Log retention policy set

- [ ] **Uptime Monitoring**
  - [ ] Uptime monitor configured (e.g., UptimeRobot)
  - [ ] Alert notifications set up
  - [ ] Status page created (optional)

- [ ] **API Monitoring**
  - [ ] YouTube API quota monitoring
  - [ ] Stripe webhook monitoring
  - [ ] Database connection monitoring

## Post-Launch

### Documentation

- [ ] README.md updated with production info
- [ ] DEPLOYMENT.md reviewed and accurate
- [ ] API documentation created (if public API)
- [ ] User guide created (optional)
- [ ] Admin guide created (if applicable)

### Communication

- [ ] Stakeholders notified of launch
- [ ] Support email configured
- [ ] Social media announcements (if applicable)
- [ ] Launch blog post (optional)

### Backup and Recovery

- [ ] Database backup scheduled
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure documented

### Maintenance Plan

- [ ] Weekly cron job verified
- [ ] Monthly dependency updates scheduled
- [ ] Quarterly security audits planned
- [ ] Annual SSL certificate renewal (Vercel auto-renews)

### Legal and Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented (if EU users)
- [ ] GDPR compliance verified (if EU users)
- [ ] Data retention policy defined

## Rollback Plan

If critical issues arise post-deployment:

1. **Immediate Actions**
   - [ ] Identify the issue from logs
   - [ ] Assess impact and severity
   - [ ] Communicate with users (if needed)

2. **Rollback Steps**
   - [ ] Revert to previous Vercel deployment
   - [ ] Restore database from backup (if needed)
   - [ ] Verify rollback successful
   - [ ] Monitor for stability

3. **Post-Rollback**
   - [ ] Document the issue
   - [ ] Fix the bug in development
   - [ ] Test thoroughly
   - [ ] Redeploy when ready

## Sign-Off

- [ ] **Technical Lead**: Reviewed and approved
- [ ] **Security Review**: Completed and passed
- [ ] **QA Testing**: All tests passed
- [ ] **Product Owner**: Approved for launch
- [ ] **DevOps**: Infrastructure ready

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Production URL**: _________________

**Notes**: _________________
