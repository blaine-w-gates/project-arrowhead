# Production Environment Setup Guide

**Version:** 2.0  
**Last Updated:** October 28, 2025  
**Platform:** Cloudflare Pages  

---

## Overview

This document specifies all environment variables required for production deployment of Project Arrowhead on Cloudflare Pages.

**Related Documentation:**
- [Stripe Setup Guide](./STRIPE_SETUP_GUIDE.md) - Detailed Stripe configuration
- [Cloudflare Access Runbook](./cloudflare-access-runbook.md) - Admin route protection

---

## Required Environment Variables

### Supabase Configuration

**SUPABASE_URL**
- **Description:** Supabase project URL
- **Format:** `https://xxxxxxxxxxxxx.supabase.co`
- **Required:** Yes
- **Example:** `https://abcdefghijklmnop.supabase.co`
- **Where to find:** Supabase Dashboard > Project Settings > API

**SUPABASE_ANON_KEY**
- **Description:** Supabase anonymous/public API key
- **Format:** Long JWT token starting with `eyJ`
- **Required:** Yes (for frontend)
- **Security:** Safe to expose in frontend code
- **Where to find:** Supabase Dashboard > Project Settings > API

**SUPABASE_SERVICE_ROLE_KEY**
- **Description:** Supabase service role key (admin privileges)
- **Format:** Long JWT token starting with `eyJ`
- **Required:** Yes (for backend/Functions)
- **Security:** ⚠️ **NEVER expose in frontend** - backend only
- **Where to find:** Supabase Dashboard > Project Settings > API
- **Cloudflare:** Mark as **Encrypted** in environment variables

**SUPABASE_JWT_SECRET**
- **Description:** Secret for verifying Supabase JWTs
- **Format:** Random string (256+ bits recommended)
- **Required:** Yes
- **Security:** Keep confidential
- **Where to find:** Supabase Dashboard > Project Settings > API
- **Cloudflare:** Mark as **Encrypted**

---

### Stripe Configuration

**STRIPE_SECRET_KEY**
- **Description:** Stripe secret API key for backend operations
- **Format:** `sk_live_...` (production) or `sk_test_...` (testing)
- **Required:** Yes
- **Security:** ⚠️ **CRITICAL** - Never expose, mark as encrypted
- **Where to find:** Stripe Dashboard > Developers > API keys
- **See:** [STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md)
- **Cloudflare:** Mark as **Encrypted**

**STRIPE_PUBLISHABLE_KEY**
- **Description:** Stripe publishable API key for frontend
- **Format:** `pk_live_...` (production) or `pk_test_...` (testing)
- **Required:** Yes
- **Security:** Safe to expose in frontend
- **Where to find:** Stripe Dashboard > Developers > API keys
- **Prefix:** Must have `VITE_` for Vite access if used in client

**STRIPE_WEBHOOK_SECRET**
- **Description:** Secret for verifying Stripe webhook signatures
- **Format:** `whsec_...`
- **Required:** Yes
- **Security:** Keep confidential, mark as encrypted
- **Where to find:** Stripe Dashboard > Developers > Webhooks > [Your endpoint] > Signing secret
- **See:** [STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md) Step 2
- **Cloudflare:** Mark as **Encrypted**

**STRIPE_PRICE_ID_TEAM_PLAN**
- **Description:** Stripe Price ID for Team Edition ($49/month)
- **Format:** `price_...`
- **Required:** Yes
- **Where to find:** Stripe Dashboard > Products > Project Arrowhead Teams > Pricing
- **See:** [STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md) Step 1

---

### Database Configuration

**DATABASE_URL**
- **Description:** PostgreSQL connection string for Drizzle ORM
- **Format:** `postgresql://user:password@host:port/database`
- **Required:** Yes (if using direct database access)
- **Security:** ⚠️ Contains credentials - mark as encrypted
- **Note:** For Supabase, can be constructed from Supabase credentials
- **Cloudflare:** Mark as **Encrypted**

---

### Application Configuration

**PUBLIC_SITE_URL**
- **Description:** Base URL of the deployed site
- **Format:** `https://your-domain.com` (no trailing slash)
- **Required:** Yes
- **Example:** `https://project-arrowhead.pages.dev`
- **Used for:** Stripe checkout redirects, email links, CORS

**ALLOWED_ORIGINS**
- **Description:** Comma-separated list of allowed CORS origins
- **Format:** `https://domain1.com,https://domain2.com`
- **Required:** No (defaults to PUBLIC_SITE_URL)
- **Example:** `https://project-arrowhead.pages.dev,https://arrowhead.com`

**NODE_ENV**
- **Description:** Node environment
- **Format:** `production` | `development` | `test`
- **Required:** No (defaults to `production` on Cloudflare)
- **Note:** Cloudflare Pages sets this automatically

---

### Security & Monitoring

**SENTRY_DSN**
- **Description:** Sentry Data Source Name for error tracking
- **Format:** `https://xxxxx@o000000.ingest.sentry.io/0000000`
- **Required:** No (optional but recommended)
- **Where to find:** Sentry.io > Project Settings > Client Keys
- **Purpose:** Error monitoring and alerting

**SENTRY_RELEASE**
- **Description:** Release version for Sentry tracking
- **Format:** Semantic version or git SHA
- **Required:** No (auto-detected from package.json)
- **Example:** `1.0.0` or `abc123def`

**SENTRY_FORCE_ENABLE**
- **Description:** Force enable Sentry in non-production environments
- **Format:** `0` | `1`
- **Required:** No (defaults to `0`)
- **Note:** Sentry disabled in dev by default

---

### Cloudflare Turnstile (CAPTCHA)

**VITE_TURNSTILE_SITE_KEY**
- **Description:** Cloudflare Turnstile public site key
- **Format:** `0x4AAAAAAA...`
- **Required:** No (optional for bot protection)
- **Where to find:** Cloudflare Dashboard > Turnstile
- **Prefix:** `VITE_` for frontend access

**TURNSTILE_SECRET_KEY**
- **Description:** Cloudflare Turnstile secret key for backend verification
- **Format:** `0x4AAAAAAA...`
- **Required:** No (only if using Turnstile)
- **Where to find:** Cloudflare Dashboard > Turnstile
- **Cloudflare:** Mark as **Encrypted**

**TURNSTILE_REQUIRED**
- **Description:** Whether Turnstile verification is required
- **Format:** `true` | `false`
- **Required:** No (defaults to `false`)
- **Note:** Set to `true` to enforce CAPTCHA on forms

---

### Cloudflare Access (Admin Protection)

**CF_ACCESS_CLIENT_ID**
- **Description:** Cloudflare Access service token client ID
- **Format:** UUID
- **Required:** No (only if protecting admin routes)
- **Where to find:** Cloudflare Dashboard > Zero Trust > Service Tokens
- **See:** [cloudflare-access-runbook.md](./cloudflare-access-runbook.md)

**CF_ACCESS_CLIENT_SECRET**
- **Description:** Cloudflare Access service token secret
- **Format:** Random string
- **Required:** No (only if protecting admin routes)
- **Where to find:** Cloudflare Dashboard > Zero Trust > Service Tokens
- **Cloudflare:** Mark as **Encrypted**

---

### E2E Testing (Optional)

**E2E_TEST_EMAIL**
- **Description:** Email for E2E test account (Account Owner role)
- **Format:** Valid email
- **Required:** No (only for CI/CD E2E tests)
- **Example:** `test-owner@arrowhead.com`

**E2E_TEST_PASSWORD**
- **Description:** Password for E2E test account
- **Format:** String
- **Required:** No (only for CI/CD)
- **Cloudflare:** Mark as **Encrypted** if set

**E2E_TEST_MEMBER_EMAIL**
- **Description:** Email for E2E test account (Team Member role)
- **Format:** Valid email
- **Required:** No (only for CI/CD)

**E2E_TEST_MEMBER_PASSWORD**
- **Description:** Password for Team Member test account
- **Format:** String
- **Required:** No (only for CI/CD)
- **Cloudflare:** Mark as **Encrypted** if set

---

## Cloudflare Pages Configuration

### Adding Environment Variables

1. Go to **Cloudflare Dashboard**
2. Navigate to **Workers & Pages** > **project-arrowhead**
3. Click **Settings** > **Environment variables**
4. Click **Add variable**
5. Enter **Variable name** and **Value**
6. Select **Environment:**
   - `Production` - for main branch deployments
   - `Preview` - for pull request previews
7. **Encryption:** Mark sensitive variables as **Encrypted**
8. Click **Save**

### Which Variables to Encrypt?

**Always encrypt:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`
- `TURNSTILE_SECRET_KEY`
- `CF_ACCESS_CLIENT_SECRET`
- Any `*_PASSWORD` variables

**Safe to leave unencrypted:**
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_ID_TEAM_PLAN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `PUBLIC_SITE_URL`
- `VITE_TURNSTILE_SITE_KEY`

---

## Frontend (Vite) Variables

Variables accessible in frontend code **must** be prefixed with `VITE_`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TURNSTILE_SITE_KEY`

**⚠️ NEVER prefix secrets with VITE_** - they will be exposed in client bundles!

---

## Deployment Checklist

Before deploying to production:

- [ ] All **required** environment variables set
- [ ] Stripe keys are **LIVE** keys (sk_live_, pk_live_)
- [ ] Stripe webhook endpoint configured with production URL
- [ ] Sensitive variables marked as **Encrypted**
- [ ] `PUBLIC_SITE_URL` matches actual domain
- [ ] Supabase project is in **production** mode
- [ ] Database migrations run successfully
- [ ] E2E tests pass with production variables (optional)
- [ ] Sentry configured for error monitoring (optional)

---

## Testing Locally

Create `.env.local` file (never commit):

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_JWT_SECRET=your-jwt-secret

# Stripe (use TEST keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_PRICE_ID_TEAM_PLAN=price_test_...

# Application
PUBLIC_SITE_URL=http://localhost:5000
DATABASE_URL=postgresql://...
```

**Run locally:**
```bash
npm run dev
```

---

## Troubleshooting

### "Unauthorized" errors
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify `SUPABASE_JWT_SECRET` matches Supabase project

### Stripe webhook failures
- Verify `STRIPE_WEBHOOK_SECRET` matches webhook endpoint
- Check webhook URL is correct (`PUBLIC_SITE_URL/api/stripe/webhook`)
- Ensure webhook events are selected in Stripe Dashboard

### Build failures
- Check all required variables are set
- Verify no syntax errors in `.env` file
- Ensure `VITE_` prefix on frontend variables

### Frontend can't connect to Supabase
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Check variables are prefixed with `VITE_`
- Rebuild after adding new variables

---

## Security Best Practices

1. **Never commit secrets to Git**
   - Use `.env.local` for local development
   - Add `.env.local` to `.gitignore`

2. **Rotate keys regularly**
   - Stripe keys: every 90 days
   - Database credentials: every 180 days
   - Service tokens: on security incidents

3. **Use separate keys for test/prod**
   - Test keys in development/staging
   - Live keys only in production

4. **Encrypt sensitive variables**
   - Mark as encrypted in Cloudflare Dashboard
   - Prevents accidental exposure in logs

5. **Principle of least privilege**
   - Use anon key in frontend (limited access)
   - Service role key only in backend (full access)

---

## Reference

- **.env.example:** Template with all variables
- **STRIPE_SETUP_GUIDE.md:** Detailed Stripe configuration
- **Cloudflare Docs:** https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-10-28 | Added Stripe Team Plan variables, updated structure |
| 1.0 | 2025-10-01 | Initial production environment documentation |
