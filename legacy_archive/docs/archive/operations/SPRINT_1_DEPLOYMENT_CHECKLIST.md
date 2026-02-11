# Sprint 1 Production Deployment Checklist
**Admin Foundation - Core Infrastructure**  
**Date:** September 30, 2025  
**Deployment Target:** Cloudflare Pages + Supabase

---

## Pre-Deployment Verification

### ✅ Code Quality
- [x] PR #91 merged to main
- [x] TypeScript compilation passing
- [x] ESLint checks passing
- [x] All tests passing in CI
- [x] No merge conflicts

### ✅ Documentation Ready
- [x] PRODUCTION_ENV_SETUP.md created
- [x] TESTING_STRATEGY.md documented
- [x] Sprint_2_Testing_Plan.md prepared
- [x] PR_91_STATUS.md tracking complete

---

## Production Environment Setup

### Step 1: Database Migration

**⚠️ CRITICAL: Backup database before migration**

```bash
# 1. Backup production database
pg_dump $SUPABASE_DATABASE_URL > backup_pre_sprint1_$(date +%Y%m%d_%H%M%S).sql

# 2. Review migration script
cat server/migrations/009_create_admin_tables.sql

# 3. Run migration
psql $SUPABASE_DATABASE_URL -f server/migrations/009_create_admin_tables.sql

# 4. Verify tables created
psql $SUPABASE_DATABASE_URL -c "\dt admin*"
psql $SUPABASE_DATABASE_URL -c "SELECT * FROM admin_users LIMIT 1;"
psql $SUPABASE_DATABASE_URL -c "SELECT * FROM admin_audit_log LIMIT 1;"
```

**Expected Output:**
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TRIGGER
CREATE TABLE
CREATE INDEX
CREATE INDEX
```

### Step 2: Configure Environment Variables

**Location:** Cloudflare Pages > Settings > Environment Variables

#### Required Variables (Production)

```bash
# Database (existing - verify correct)
DATABASE_URL="postgresql://postgres.[ref]:[password]@[host]:6543/postgres?sslmode=require"

# Admin Session Security (GENERATE NEW - DO NOT REUSE)
ADMIN_SESSION_SECRET="[GENERATE-64-CHAR-RANDOM-STRING]"
ADMIN_COOKIE_SECRET="[GENERATE-64-CHAR-RANDOM-STRING]"

# Initial Admin User (TEMPORARY - for first setup only)
ADMIN_EMAIL="admin@yourcompany.com"
ADMIN_PASSWORD="[STRONG-TEMPORARY-PASSWORD]"
ADMIN_ROLE="super_admin"

# Application
NODE_ENV="production"
PORT="5000"

# Python Backend
PY_BACKEND_PORT="5050"
```

**Generate Secrets:**
```bash
# Session Secret
openssl rand -base64 48

# Cookie Secret  
openssl rand -base64 48
```

**Security Checklist:**
- [ ] Secrets are unique (not from examples)
- [ ] Secrets are 48+ characters
- [ ] Secrets stored in 1Password/vault
- [ ] ADMIN_PASSWORD is strong (12+ chars, mixed case, numbers, symbols)
- [ ] Using company email domain for ADMIN_EMAIL

### Step 3: Update Cloudflare Pages

**Auto-deployment should trigger from main branch merge**

Check deployment status:
```bash
npm run cf:deploys
```

Or via Cloudflare Dashboard:
1. Go to Cloudflare Pages
2. Select project-arrowhead
3. Check latest deployment status
4. Verify build succeeded

**If manual deploy needed:**
```bash
# Trigger new deployment
# (Cloudflare automatically deploys on main branch push)
git push origin main
```

---

## Post-Deployment Tasks

### Step 4: Create Initial Admin User

**⚠️ Only run ONCE after environment variables are set**

```bash
# Option A: Via SSH/shell access to server
npm run admin:create

# Option B: If no shell access, use database directly
psql $DATABASE_URL << EOF
INSERT INTO admin_users (email, password_hash, role, is_active, created_at, updated_at)
VALUES (
  'admin@yourcompany.com',
  -- Generate hash locally first:
  -- node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YOUR_PASSWORD', 12));"
  '$2a$12$[YOUR_BCRYPT_HASH]',
  'super_admin',
  true,
  NOW(),
  NOW()
);
EOF
```

### Step 5: Manual Verification

**Critical Tests:**

1. **Admin Panel Accessibility**
   ```
   https://yoursite.com/admin
   ```
   - [ ] Page loads (no 404)
   - [ ] Redirects to /admin/login
   - [ ] Login form visible
   - [ ] No JavaScript errors in console

2. **Authentication Flow**
   - [ ] Login with created credentials
   - [ ] Dashboard loads
   - [ ] Session persists on page refresh
   - [ ] Logout works
   - [ ] Cannot access /admin after logout

3. **Security Checks**
   - [ ] Rate limiting works (try 6 wrong passwords)
   - [ ] HTTPS enforced
   - [ ] No admin credentials in logs
   - [ ] No database errors visible to users

4. **Audit Logging**
   ```sql
   -- Check audit log is recording
   SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 10;
   ```
   - [ ] Login events recorded
   - [ ] Logout events recorded
   - [ ] IP addresses captured
   - [ ] User agents captured

5. **Resource Access** (will be empty, but should load)
   - [ ] /admin/resources/users
   - [ ] /admin/resources/admin_users
   - [ ] /admin/resources/journey_sessions
   - [ ] /admin/resources/tasks

### Step 6: Security Lockdown

**Immediately after verification:**

1. **Remove temporary credentials from environment**
   ```bash
   # Remove from Cloudflare Pages environment variables:
   - ADMIN_EMAIL
   - ADMIN_PASSWORD
   ```

2. **Change admin password**
   - Login to admin panel
   - Change password via UI (when implemented)
   - OR: Update database directly with new hash

3. **Store credentials securely**
   - [ ] Save in 1Password/vault
   - [ ] Share with authorized team only
   - [ ] Document password rotation schedule (90 days)

4. **Verify session security**
   ```bash
   # Check session table exists
   psql $DATABASE_URL -c "\d session"
   ```

---

## Rollback Plan

**If critical issues found:**

### Option 1: Revert Code
```bash
# Revert the merge commit
git revert b90d168 -m 1
git push origin main
```

### Option 2: Rollback Database
```bash
# Drop new tables (last resort)
psql $DATABASE_URL << EOF
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS session CASCADE;
EOF

# Restore from backup
psql $DATABASE_URL < backup_pre_sprint1_YYYYMMDD_HHMMSS.sql
```

### Option 3: Disable Admin Routes
```typescript
// Quick fix: Comment out admin routes in server/index.ts
// app.use('/admin', adminRouter);
```

---

## Monitoring & Alerts

### Health Checks (First 24 Hours)

**Every 2 hours:**
- [ ] Check error logs
- [ ] Verify admin panel accessible
- [ ] Check database connection pool
- [ ] Monitor session table size
- [ ] Review audit log entries

**Metrics to Watch:**
- Response time for /admin
- Database query count
- Session table growth
- Failed login attempts
- Error rate

### Success Criteria

**Deployment considered successful when:**
- [ ] Admin panel accessible at /admin
- [ ] Authentication working
- [ ] Audit logging functional
- [ ] No 500 errors in logs
- [ ] No user-facing issues reported
- [ ] All existing features still working

**Timeline:**
- Deploy: 1 hour
- Verify: 2 hours
- Monitor: 24 hours
- Sign-off: After 24 hours stable

---

## Communication Plan

### Team Notifications

**Before Deployment:**
```
🚀 DEPLOYMENT NOTICE
Feature: Admin Panel Foundation
Timeline: [DATE/TIME]
Expected Duration: 2-3 hours
Impact: No downtime expected
Action Required: None
```

**After Deployment:**
```
✅ DEPLOYMENT COMPLETE
Feature: Admin Panel - LIVE
Access: https://yoursite.com/admin
Credentials: [Sent separately to authorized users]
Issues: Report immediately to [CONTACT]
Documentation: See PRODUCTION_ENV_SETUP.md
```

**If Issues:**
```
⚠️ DEPLOYMENT ISSUE
Problem: [DESCRIPTION]
Impact: [SEVERITY]
Status: [Investigating/Fixing/Rolling Back]
ETA: [TIME]
```

---

## Post-Deployment Sign-Off

**Required Approvals:**

- [ ] **Tech Lead:** Deployment verified  
  Name: _________________ Date: _______

- [ ] **DevOps:** Infrastructure stable  
  Name: _________________ Date: _______

- [ ] **Security:** Security checks passed  
  Name: _________________ Date: _______

- [ ] **Product:** Feature acceptance  
  Name: _________________ Date: _______

**Issues Found:** ___________________________________________

**Resolution:** ___________________________________________

**Sprint 1 Status:** DEPLOYED / ROLLED BACK / PARTIAL

---

## Next Steps (Sprint 2)

**After successful deployment:**

1. [ ] Create Sprint 2 branch
2. [ ] Install test dependencies
3. [ ] Set up Docker test database
4. [ ] Begin test implementation

**Timeline:** Start Sprint 2 after 24-hour monitoring period

---

**Deployment Lead:** _________________  
**Date:** September 30, 2025  
**Version:** Sprint 1 - Admin Foundation v1.0
