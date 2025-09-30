# Production Environment Variables Setup
**Project Arrowhead - Admin Panel Deployment**

## Overview

This document provides the complete environment configuration needed for deploying the admin panel to production.

---

## Required Environment Variables

### 1. Database Configuration

```bash
# PostgreSQL Connection String (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require"

# Optional: IPv4 override for DNS issues
# PGHOSTADDR="xxx.xxx.xxx.xxx"
# DB_HOST_IPV4="xxx.xxx.xxx.xxx"
```

**Security Notes:**
- ✅ Use connection pooling in production
- ✅ Enable SSL/TLS (sslmode=require)
- ✅ Rotate passwords quarterly
- ✅ Use read-only replicas for analytics

**Supabase Specific:**
```bash
# Get from Supabase Dashboard > Project Settings > Database
# Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DATABASE_URL="postgresql://postgres.xxxxx:yyyyy@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
```

---

### 2. Admin Panel Security

```bash
# Session Secret (CRITICAL - Generate unique random string)
ADMIN_SESSION_SECRET="[GENERATE-64-CHARACTER-RANDOM-STRING]"

# Cookie Secret (CRITICAL - Generate unique random string)
ADMIN_COOKIE_SECRET="[GENERATE-64-CHARACTER-RANDOM-STRING]"
```

**Generate Secure Secrets:**
```bash
# Method 1: OpenSSL
openssl rand -base64 48

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Method 3: Python
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

**Security Requirements:**
- ⚠️ NEVER use the example values in production
- ⚠️ Each secret must be unique (don't reuse)
- ⚠️ Minimum 32 characters, recommend 48-64
- ⚠️ Store in secure vault (AWS Secrets Manager, 1Password, etc.)
- ⚠️ Rotate every 90 days
- ⚠️ Never commit to version control

---

### 3. Default Admin User (Initial Setup Only)

```bash
# Initial admin account credentials
ADMIN_EMAIL="admin@yourcompany.com"
ADMIN_PASSWORD="[TEMPORARY-STRONG-PASSWORD]"
ADMIN_ROLE="super_admin"
```

**Important:**
- ⚠️ Only used during initial `npm run admin:create` setup
- ⚠️ Change password immediately after first login
- ⚠️ Remove these from environment after setup
- ✅ Use company email domain
- ✅ Password must meet: 12+ chars, uppercase, lowercase, number, symbol

---

### 4. Node.js Environment

```bash
# Environment mode
NODE_ENV="production"

# Server port (Cloudflare Pages uses 5000)
PORT="5000"

# Python backend integration
PY_BACKEND_URL="http://localhost:5050"
# OR
PY_BACKEND_PORT="5050"
```

---

### 5. External Services (Optional)

```bash
# Cloudflare Access (if using)
CF_ACCESS_CLIENT_ID="[CLIENT_ID]"
CF_ACCESS_CLIENT_SECRET="[CLIENT_SECRET]"

# Email service (future)
# SMTP_HOST="smtp.sendgrid.net"
# SMTP_PORT="587"
# SMTP_USER="apikey"
# SMTP_PASS="[SENDGRID_API_KEY]"

# Stripe (Sprint 3)
# STRIPE_SECRET_KEY="sk_live_..."
# STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## Complete Production .env Template

```bash
# ============================================
# PROJECT ARROWHEAD - PRODUCTION ENVIRONMENT
# ============================================

# Database
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"

# Admin Panel Security (CRITICAL)
ADMIN_SESSION_SECRET="[GENERATE_UNIQUE_64_CHAR_STRING]"
ADMIN_COOKIE_SECRET="[GENERATE_UNIQUE_64_CHAR_STRING]"

# Initial Admin User (TEMPORARY - Remove after setup)
ADMIN_EMAIL="admin@yourcompany.com"
ADMIN_PASSWORD="[STRONG_TEMPORARY_PASSWORD]"
ADMIN_ROLE="super_admin"

# Application
NODE_ENV="production"
PORT="5000"

# Python Backend
PY_BACKEND_PORT="5050"

# Cloudflare Access (Optional)
# CF_ACCESS_CLIENT_ID="xxx"
# CF_ACCESS_CLIENT_SECRET="yyy"
```

---

## Deployment Platforms

### Cloudflare Pages

**Set Environment Variables:**
1. Go to Cloudflare Dashboard
2. Pages > project-arrowhead > Settings > Environment Variables
3. Add each variable individually
4. Mark `ADMIN_SESSION_SECRET` and `ADMIN_COOKIE_SECRET` as **Encrypted**
5. Save and redeploy

**Build Configuration:**
```json
{
  "build": {
    "command": "npm run prebuild && npm run build",
    "directory": "website-integration/ArrowheadSolution/dist",
    "root_dir": "/"
  },
  "env": {
    "NODE_VERSION": "20",
    "NPM_VERSION": "10"
  }
}
```

---

### Other Platforms

#### Vercel
```bash
vercel env add ADMIN_SESSION_SECRET
vercel env add ADMIN_COOKIE_SECRET
vercel env add DATABASE_URL
# ... etc
```

#### Railway
```bash
# Via CLI
railway variables set ADMIN_SESSION_SECRET=[value]

# Or via Dashboard: Project > Variables
```

#### Heroku
```bash
heroku config:set ADMIN_SESSION_SECRET=[value]
heroku config:set ADMIN_COOKIE_SECRET=[value]
heroku config:set DATABASE_URL=[value]
```

---

## Security Checklist

### Pre-Deployment
- [ ] Generate unique secrets (not example values)
- [ ] Store secrets in secure vault
- [ ] Review .gitignore (ensure .env excluded)
- [ ] Test with production database copy first
- [ ] Document secret rotation schedule

### Post-Deployment
- [ ] Verify HTTPS enabled (not HTTP)
- [ ] Test admin login works
- [ ] Create backup admin account
- [ ] Remove ADMIN_EMAIL/PASSWORD from environment
- [ ] Enable audit log monitoring
- [ ] Set up secret rotation calendar

### Ongoing
- [ ] Rotate secrets every 90 days
- [ ] Monitor audit logs weekly
- [ ] Review admin user list monthly
- [ ] Update dependencies regularly
- [ ] Backup database daily

---

## Secret Rotation Procedure

### Every 90 Days

1. **Generate New Secrets**
   ```bash
   NEW_SESSION_SECRET=$(openssl rand -base64 48)
   NEW_COOKIE_SECRET=$(openssl rand -base64 48)
   ```

2. **Update Environment Variables**
   - Update in hosting platform
   - Update in secure vault
   - Document rotation date

3. **Rolling Update** (Zero Downtime)
   ```bash
   # Step 1: Add new secrets alongside old
   ADMIN_SESSION_SECRET="old-secret"
   ADMIN_SESSION_SECRET_NEW="new-secret"
   
   # Step 2: Deploy with both active (supports old sessions)
   # Step 3: After 30 minutes (session timeout), remove old
   ADMIN_SESSION_SECRET="new-secret"
   ```

4. **Verify**
   - Test admin login
   - Check audit logs
   - Confirm no errors

---

## Environment Variable Validation

### Startup Checks (Add to server/index.ts)

```typescript
// server/admin/validate-env.ts
export function validateAdminEnv() {
  const required = [
    'DATABASE_URL',
    'ADMIN_SESSION_SECRET',
    'ADMIN_COOKIE_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Validate secret strength
  if (process.env.ADMIN_SESSION_SECRET!.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');
  }

  if (process.env.ADMIN_COOKIE_SECRET!.length < 32) {
    throw new Error('ADMIN_COOKIE_SECRET must be at least 32 characters');
  }

  // Warn about default values
  if (process.env.NODE_ENV === 'production') {
    const defaults = [
      'changeme',
      'example',
      'test',
      'demo',
    ];

    defaults.forEach(keyword => {
      if (process.env.ADMIN_SESSION_SECRET?.includes(keyword)) {
        throw new Error('Production secret contains insecure keyword');
      }
    });
  }

  console.log('✅ Environment variables validated');
}
```

---

## Troubleshooting

### "Invalid credentials" on login

**Check:**
1. Admin user created? `SELECT * FROM admin_users;`
2. Password hashed correctly? (starts with `$2a$`)
3. User active? `is_active = true`
4. Environment variables loaded? `console.log(process.env)`

### "Session expired" immediately after login

**Check:**
1. HTTPS enabled in production? (required for secure cookies)
2. SESSION_SECRET set correctly?
3. Database connection working?
4. `session` table exists? (created by connect-pg-simple)

### "Cannot connect to database"

**Check:**
1. DATABASE_URL format correct?
2. IP whitelist includes server IP? (Supabase)
3. SSL mode enabled? `?sslmode=require`
4. Connection pooling limits not exceeded?

---

## Production Deployment Checklist

### Phase 1: Pre-Deployment
- [ ] Generate all secrets
- [ ] Store in secure vault
- [ ] Set environment variables in hosting platform
- [ ] Test in staging environment first
- [ ] Review security checklist

### Phase 2: Database Setup
- [ ] Run migration: `009_create_admin_tables.sql`
- [ ] Verify tables created successfully
- [ ] Test database connection
- [ ] Enable database backups

### Phase 3: Admin Setup
- [ ] Create first admin user
- [ ] Test login flow
- [ ] Verify session persistence
- [ ] Check audit logging works
- [ ] Remove temp admin credentials from env

### Phase 4: Verification
- [ ] Admin panel accessible at /admin
- [ ] HTTPS working (not HTTP)
- [ ] Rate limiting functional
- [ ] Audit logs recording
- [ ] No error logs

### Phase 5: Cleanup
- [ ] Remove ADMIN_EMAIL, ADMIN_PASSWORD from env
- [ ] Document admin credentials in secure vault
- [ ] Set up monitoring alerts
- [ ] Schedule first secret rotation (90 days)

---

## Support & References

- **Security Best Practices:** https://cheatsheetseries.owasp.org/
- **Environment Variables:** https://12factor.net/config
- **Secret Management:** https://cloud.google.com/secret-manager/docs/best-practices
- **Supabase Docs:** https://supabase.com/docs/guides/database

---

**Last Updated:** September 30, 2025  
**Next Review:** October 30, 2025  
**Owner:** DevOps Team
