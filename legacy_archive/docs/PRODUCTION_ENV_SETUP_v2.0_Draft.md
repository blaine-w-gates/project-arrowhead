# Production Environment Setup v2.0

**Version:** 2.0 (Draft)  
**Date:** October 25, 2025  
**Status:** Draft - For Team-Based MVP  
**Supersedes:** PRODUCTION_ENV_SETUP.md (Individual-User model)  
**Related:** Sprint_Plan_v9.0.md, PRD_v5.0_Draft.md

---

## Document Purpose

This document defines all environment variables and secrets required for the **Team-Based MVP** deployment (Sprint Plan v9.0). This supersedes the previous setup which was for the Individual-User Paid Model.

---

## Overview of Changes from v1.0

### **Removed (Obsolete for Team MVP):**
- ❌ `ADMIN_SESSION_SECRET` - Admin panel deprecated
- ❌ `ADMIN_COOKIE_SECRET` - Admin panel deprecated  
- ❌ `ADMIN_EMAIL` - Admin panel deprecated
- ❌ `ADMIN_PASSWORD_HASH` - Admin panel deprecated
- ❌ `STRIPE_PRO_MONTHLY_PRICE_ID` - Replaced by tiered pricing

### **Added (New for Team MVP):**
- ✅ `SUPABASE_URL` - Database + Real-time + Auth
- ✅ `SUPABASE_ANON_KEY` - Client-side Supabase access
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Server-side admin operations
- ✅ `STRIPE_PRICE_ID_SMALL_TEAM` - Small Team tier (1-10 members)
- ✅ `STRIPE_PRICE_ID_LARGE_TEAM` - Large Team tier (11-50 members)
- ✅ `SENDGRID_API_KEY` - Email for team invitations (critical)
- ✅ `JWT_SECRET` - Team auth tokens
- ✅ `WEBSOCKET_SECRET` - Real-time collaboration auth

### **Retained (Still Used):**
- ✅ `DATABASE_URL` - PostgreSQL connection (now Supabase)
- ✅ `STRIPE_SECRET_KEY` - Stripe API access
- ✅ `STRIPE_WEBHOOK_SECRET` - Webhook verification
- ✅ `NODE_ENV` - Environment indicator

---

## Environment Variables (Complete List)

### **Database & Authentication**

#### `DATABASE_URL` (Required)
- **Purpose:** PostgreSQL database connection string (Supabase)
- **Format:** `postgresql://user:password@host:port/database?sslmode=require`
- **Example:** `postgresql://postgres:****@db.supabase.co:5432/postgres`
- **Used By:** Drizzle ORM, database migrations, RLS enforcement
- **Notes:** 
  - Must include SSL (`sslmode=require`)
  - Uses Supabase pooling connection
  - Contains service role credentials for migrations

#### `SUPABASE_URL` (Required - NEW)
- **Purpose:** Supabase project URL for client SDK
- **Format:** `https://<project-ref>.supabase.co`
- **Example:** `https://xyzabc123.supabase.co`
- **Used By:** Frontend (Supabase client), Real-time WebSocket connections
- **Notes:** 
  - Public-facing URL (safe to expose to client)
  - Required for Supabase Realtime (WebSocket)

#### `SUPABASE_ANON_KEY` (Required - NEW)
- **Purpose:** Supabase anonymous/public API key
- **Format:** JWT token (long base64 string starting with `eyJ...`)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Used By:** Frontend (public API calls), Client-side auth
- **Security:** 
  - ✅ Safe to expose in client-side code
  - ✅ RLS policies enforce data isolation
  - ✅ Limited to anon role permissions

#### `SUPABASE_SERVICE_ROLE_KEY` (Required - NEW)
- **Purpose:** Supabase service role key (bypasses RLS)
- **Format:** JWT token (long base64 string starting with `eyJ...`)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Used By:** Server-side operations (invitations, admin tasks, migrations)
- **Security:** 
  - ⚠️ **NEVER** expose to client
  - ⚠️ **NEVER** commit to git
  - ⚠️ Bypasses RLS - use only when necessary
  - ⚠️ Server-side only

#### `JWT_SECRET` (Required - NEW)
- **Purpose:** Sign and verify custom JWT tokens for team sessions
- **Format:** Random string (min 32 characters)
- **Example:** `b8f3d9c2a1e4f7g5h8j1k3m5n7p9q2r4`
- **Generation:** `openssl rand -hex 32`
- **Used By:** Team invitation tokens, session cookies
- **Security:** 
  - ⚠️ **NEVER** expose to client
  - ⚠️ Rotate periodically (invalidates existing tokens)

---

### **Payment & Billing**

#### `STRIPE_SECRET_KEY` (Required)
- **Purpose:** Stripe API secret key
- **Format:** `sk_live_...` (production) or `sk_test_...` (development)
- **Example:** `sk_test_51H...`
- **Used By:** Checkout session creation, subscription management
- **Security:**
  - ⚠️ **NEVER** expose to client
  - ⚠️ Different keys for test/prod

#### `STRIPE_WEBHOOK_SECRET` (Required)
- **Purpose:** Verify Stripe webhook signatures
- **Format:** `whsec_...`
- **Example:** `whsec_abc123...`
- **Used By:** Webhook endpoint (`/api/stripe/webhook`)
- **Security:**
  - ⚠️ **NEVER** expose to client
  - ⚠️ Different secrets for test/prod endpoints

#### `STRIPE_PRICE_ID_SMALL_TEAM` (Required - NEW)
- **Purpose:** Stripe Price ID for Small Team tier (1-10 members)
- **Format:** `price_...`
- **Example:** `price_1H2j3kL4m5N6o7P8Q`
- **Used By:** Checkout session creation for Small Team subscription
- **Pricing:** $29/month flat-rate (see PRD_v5.0 Section 7.1)
- **Notes:**
  - Create in Stripe Dashboard → Products → Add Price
  - Recurring billing, monthly interval

#### `STRIPE_PRICE_ID_LARGE_TEAM` (Required - NEW)
- **Purpose:** Stripe Price ID for Large Team tier (11-50 members)
- **Format:** `price_...`
- **Example:** `price_2H3j4kL5m6N7o8P9Q`
- **Used By:** Checkout session creation for Large Team subscription
- **Pricing:** $99/month flat-rate (see PRD_v5.0 Section 7.1)
- **Notes:**
  - Create in Stripe Dashboard → Products → Add Price
  - Recurring billing, monthly interval

---

### **Email & Notifications**

#### `SENDGRID_API_KEY` (Required - NEW)
- **Purpose:** Send team invitation emails
- **Format:** `SG....` (long alphanumeric string)
- **Example:** `SG.abc123xyz...`
- **Used By:** Team invitation flow (Tab 1 - Permission Grid)
- **Security:**
  - ⚠️ **NEVER** expose to client
  - ⚠️ Configure SendGrid sender domain for deliverability
- **Setup:**
  1. Create SendGrid account
  2. Verify sender domain
  3. Create API key with "Mail Send" permission only
  4. Configure default "from" email in app config

**Alternative Email Providers:**
- Resend: Use `RESEND_API_KEY` instead
- AWS SES: Use `AWS_SES_ACCESS_KEY_ID` + `AWS_SES_SECRET_ACCESS_KEY`
- Postmark: Use `POSTMARK_API_KEY`

**Email Template Variables (for invitation email):**
- `{{inviter_name}}` - Manager who sent invite
- `{{team_name}}` - Team name
- `{{invitation_link}}` - One-time use link with token
- `{{expires_in}}` - "24 hours"

---

### **Real-Time Collaboration**

#### `WEBSOCKET_SECRET` (Required - NEW)
- **Purpose:** Authenticate WebSocket connections for real-time collaboration
- **Format:** Random string (min 32 characters)
- **Example:** `c9g4e1a2f7h8j1k3m5n7p9q2r4s6t8v0`
- **Generation:** `openssl rand -hex 32`
- **Used By:** 
  - Tab 2 (Objectives) - Lock-based editing presence
  - Tab 3 ↔ Tab 4 - Real-time task status sync
- **Security:**
  - ⚠️ Used to sign WebSocket auth tokens
  - ⚠️ Rotate periodically (invalidates active sessions)

**Supabase Realtime Configuration:**
- Enable Realtime in Supabase Dashboard → Settings → API
- Configure channel authorization rules
- Set max connections per IP (default: 100)

---

### **Application Configuration**

#### `NODE_ENV` (Required)
- **Purpose:** Environment indicator
- **Values:** `development`, `production`, `test`
- **Used By:** All components (logging, error handling, debugging)
- **Defaults:**
  - Development: Verbose logs, source maps, hot reload
  - Production: Minified code, error reporting only
  - Test: Mock services, in-memory database

#### `PORT` (Optional)
- **Purpose:** Server port for Express (development only)
- **Default:** `3000`
- **Used By:** Express server in dev mode
- **Notes:** Cloudflare Functions ignore this (use Functions routing)

#### `APP_URL` (Required)
- **Purpose:** Base URL for the application
- **Format:** `https://domain.com` (no trailing slash)
- **Example (prod):** `https://app.arrowhead.com`
- **Example (dev):** `http://localhost:3000`
- **Used By:** 
  - Email invitation links
  - OAuth redirect URIs
  - CORS origin validation

#### `FRONTEND_URL` (Optional)
- **Purpose:** Frontend URL if different from API
- **Default:** Same as `APP_URL`
- **Used By:** CORS configuration
- **Example:** `https://app.arrowhead.com`

---

## Security Best Practices

### **Secret Management**

1. **Never Commit Secrets**
   ```bash
   # Verify .gitignore includes:
   .env
   .env.local
   .env.production
   ```

2. **Use Environment-Specific Files**
   ```
   .env.development  # Local dev (committed template OK)
   .env.production   # Production (NEVER commit)
   .env.test         # Test environment (committed template OK)
   ```

3. **Secret Rotation Schedule**
   - `JWT_SECRET`: Every 90 days
   - `WEBSOCKET_SECRET`: Every 90 days
   - `STRIPE_WEBHOOK_SECRET`: When compromised only
   - `SENDGRID_API_KEY`: When compromised only
   - `SUPABASE_SERVICE_ROLE_KEY`: Never rotate (managed by Supabase)

### **Access Control**

| Secret | Who Needs It | Where Stored |
|--------|--------------|--------------|
| `SUPABASE_ANON_KEY` | Frontend | ✅ Can be public (in build) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only | ⚠️ Cloudflare env vars, never in code |
| `STRIPE_SECRET_KEY` | Backend only | ⚠️ Cloudflare env vars |
| `JWT_SECRET` | Backend only | ⚠️ Cloudflare env vars |
| `SENDGRID_API_KEY` | Backend only | ⚠️ Cloudflare env vars |

### **Deployment Environments**

**Development (Local):**
- Use `.env.development` file
- All secrets use test/sandbox versions
- `NODE_ENV=development`

**Staging (Cloudflare Preview):**
- Environment variables in Cloudflare Dashboard → Settings → Environment Variables
- Use production-like but separate Supabase/Stripe projects
- `NODE_ENV=production` (but separate resources)

**Production (Cloudflare Pages):**
- Environment variables in Cloudflare Dashboard
- All secrets are production versions
- `NODE_ENV=production`

---

## Setup Checklist

### **Phase 1: Database (Supabase)**

- [ ] Create Supabase project
- [ ] Note down `SUPABASE_URL`
- [ ] Copy `SUPABASE_ANON_KEY` (Settings → API)
- [ ] Copy `SUPABASE_SERVICE_ROLE_KEY` (Settings → API)
- [ ] Run database migrations (Phase 1 of Sprint v9.0)
- [ ] Verify RLS policies are enabled
- [ ] Test connection with `DATABASE_URL`

### **Phase 2: Authentication**

- [ ] Generate `JWT_SECRET` (`openssl rand -hex 32`)
- [ ] Generate `WEBSOCKET_SECRET` (`openssl rand -hex 32`)
- [ ] Configure JWT expiration (default: 7 days)
- [ ] Test token signing/verification

### **Phase 3: Email (SendGrid)**

- [ ] Create SendGrid account
- [ ] Verify sender domain (e.g., `noreply@arrowhead.com`)
- [ ] Create API key with "Mail Send" permission
- [ ] Copy `SENDGRID_API_KEY`
- [ ] Create invitation email template
- [ ] Test email delivery

### **Phase 4: Billing (Stripe)**

- [ ] Create Stripe account (or use existing)
- [ ] Create "Small Team" product ($29/month)
- [ ] Copy `STRIPE_PRICE_ID_SMALL_TEAM`
- [ ] Create "Large Team" product ($99/month)
- [ ] Copy `STRIPE_PRICE_ID_LARGE_TEAM`
- [ ] Copy `STRIPE_SECRET_KEY`
- [ ] Configure webhook endpoint: `https://app.arrowhead.com/api/stripe/webhook`
- [ ] Copy `STRIPE_WEBHOOK_SECRET`
- [ ] Test checkout flow

### **Phase 5: Deployment (Cloudflare)**

- [ ] Set all environment variables in Cloudflare Dashboard
- [ ] Verify `APP_URL` matches production domain
- [ ] Test deployment
- [ ] Verify WebSocket connections work
- [ ] Test invitation email delivery
- [ ] Test Stripe webhook reception

---

## Troubleshooting

### **Issue: "Supabase connection failed"**

**Symptoms:** Database queries fail, RLS errors

**Checks:**
1. Verify `DATABASE_URL` format includes `?sslmode=require`
2. Check Supabase project is not paused (free tier auto-pauses)
3. Verify IP allowlist (if configured)
4. Test connection: `psql $DATABASE_URL`

**Solution:** Update connection string or unpause project

---

### **Issue: "WebSocket connection refused"**

**Symptoms:** Real-time features don't work, lock-based editing fails

**Checks:**
1. Verify `SUPABASE_URL` is correct
2. Check Realtime is enabled in Supabase Dashboard
3. Verify `SUPABASE_ANON_KEY` is valid
4. Check browser console for CORS errors

**Solution:** Enable Realtime in Supabase, verify CORS origins

---

### **Issue: "Invitation emails not sending"**

**Symptoms:** Invitations fail silently, no emails received

**Checks:**
1. Verify `SENDGRID_API_KEY` is valid
2. Check sender domain is verified
3. Check SendGrid activity logs for errors
4. Verify email template exists

**Solution:** Re-verify domain, check API key permissions

---

### **Issue: "Stripe webhook verification failed"**

**Symptoms:** `400 Bad Request` on webhook endpoint

**Checks:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
2. Check webhook endpoint URL is correct
3. Verify request signature header is present
4. Check clock skew (webhook timestamps)

**Solution:** Update webhook secret, verify endpoint URL

---

## Migration from v1.0

### **For Developers:**

1. **Update local `.env.development`:**
   ```bash
   # Remove these (obsolete)
   ADMIN_SESSION_SECRET=
   ADMIN_COOKIE_SECRET=
   ADMIN_EMAIL=
   ADMIN_PASSWORD_HASH=
   STRIPE_PRO_MONTHLY_PRICE_ID=
   
   # Add these (new)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   JWT_SECRET=<generate>
   WEBSOCKET_SECRET=<generate>
   SENDGRID_API_KEY=SG...
   STRIPE_PRICE_ID_SMALL_TEAM=price_...
   STRIPE_PRICE_ID_LARGE_TEAM=price_...
   ```

2. **Run new migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Test locally:**
   ```bash
   npm run dev
   # Verify team creation, invitation, WebSocket connection
   ```

### **For DevOps:**

1. **Update Cloudflare environment variables** (remove old, add new)
2. **Configure Stripe webhooks** for new endpoint
3. **Verify SendGrid domain** is ready for production
4. **Test staging deployment** before production
5. **Archive old environment variables** (don't delete - for rollback)

---

## Document History

- **v2.0 (October 25, 2025):** Team-Based MVP setup (Sprint v9.0)
  - Added Supabase (URL, ANON_KEY, SERVICE_ROLE_KEY)
  - Added tiered Stripe pricing (SMALL_TEAM, LARGE_TEAM)
  - Added SendGrid for invitations
  - Added JWT and WebSocket secrets
  - Removed admin panel secrets (deprecated)
  
- **v1.0 (October 2025):** Individual-User Paid MVP setup
  - Archived as PRODUCTION_ENV_SETUP.md (see docs/archive/)

---

## Related Documents

- **Sprint Plan v9.0** (`Sprint_Plan_v9.0.md`) - Implementation roadmap
- **PRD v5.0** (`PRD_v5.0_Draft.md`) - Product requirements
- **SLAD v6.0** (pending) - Architecture baseline
- **ADR-006** (`adr/ADR-006-environments-and-secrets-management.md`) - Secrets philosophy

---

**Status:** Draft - Pending PRD v5.0 approval and Phase 1 database implementation
