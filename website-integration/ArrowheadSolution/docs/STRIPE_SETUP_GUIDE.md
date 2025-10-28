# Stripe Setup Guide

**Version:** 1.0  
**Last Updated:** October 28, 2025  
**Purpose:** Configure Stripe for Project Arrowhead Team Edition subscriptions

---

## Overview

This guide documents the manual steps required to configure Stripe for the Project Arrowhead subscription system. These steps must be performed by a team member with access to the Stripe Dashboard.

**Subscription Model:**
- **Product:** Project Arrowhead Teams
- **Price:** $49/month (recurring)
- **Billing Cycle:** Monthly
- **Trial Period:** 14 days (handled by our application, not Stripe)

---

## Prerequisites

- [ ] Stripe account created (https://dashboard.stripe.com)
- [ ] Admin access to Stripe Dashboard
- [ ] Production deployment URL known (e.g., `https://project-arrowhead.pages.dev`)
- [ ] Access to update environment variables in deployment platform

---

## Step 1: Create Product in Stripe Dashboard

### Navigate to Products
1. Log in to Stripe Dashboard: https://dashboard.stripe.com
2. Click **Products** in the left sidebar
3. Click **+ Add product** button

### Configure Product Details
**Product Information:**
- **Name:** `Project Arrowhead Teams`
- **Description:** `Collaborative project management for small teams (2-10 members)`
- **Statement descriptor:** `ARROWHEAD TEAMS` (appears on customer's credit card statement)
- **Unit label:** Leave blank
- **Product image:** Optional (recommended: upload Project Arrowhead logo)

**Pricing Information:**
- **Pricing model:** Standard pricing
- **Price:** `49.00`
- **Billing period:** `Monthly`
- **Currency:** `USD`
- **Usage type:** `Licensed`

**Tax Information:**
- **Tax code:** `txcd_10000000` (Software as a Service - digital)
- **Tax behavior:** `Inclusive` (or as per business requirements)

### Create Product
1. Click **Save product**
2. **CRITICAL:** Note the **Price ID** (format: `price_xxxxxxxxxxxxx`)
3. Copy this Price ID - you'll need it for environment variables

**Example Price ID:**
```
price_1Abc2DefGhIjKlMn3
```

---

## Step 2: Configure Webhook Endpoint

### Navigate to Webhooks
1. In Stripe Dashboard, click **Developers** in left sidebar
2. Click **Webhooks** tab
3. Click **+ Add endpoint** button

### Configure Endpoint Details

**Endpoint URL:**
```
https://project-arrowhead.pages.dev/api/stripe/webhook
```
*Replace with your actual production domain*

**Description:** (Optional)
```
Project Arrowhead subscription events
```

**Events to send:**
Select the following events (click "Select events" button):

#### Required Events:
- [x] `checkout.session.completed` - When customer completes payment
- [x] `customer.subscription.created` - When subscription is created
- [x] `customer.subscription.updated` - When subscription changes (renewal, plan change)
- [x] `customer.subscription.deleted` - When subscription is canceled

#### Recommended Events (for monitoring):
- [x] `invoice.payment_succeeded` - Successful payment
- [x] `invoice.payment_failed` - Failed payment (handle gracefully)
- [x] `customer.subscription.trial_will_end` - Trial ending reminder (optional, we handle this)

### API Version
- **API version:** Use latest stable version (currently `2024-10-28` or newer)
- Note: Stripe uses rolling API versions; select the latest available

### Save Webhook
1. Click **Add endpoint**
2. **CRITICAL:** Copy the **Signing secret** (format: `whsec_xxxxxxxxxxxxx`)
3. This appears immediately after creating the webhook
4. Store securely - you cannot retrieve it later (only regenerate)

**Example Signing Secret:**
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

---

## Step 3: Retrieve API Keys

### Navigate to API Keys
1. In Stripe Dashboard, click **Developers**
2. Click **API keys** tab

### Copy Keys

**Publishable Key (pk_live_... or pk_test_...):**
- Used by frontend to initialize Stripe checkout
- Safe to expose in client-side code
- Example: `pk_live_51Abc...xyz`

**Secret Key (sk_live_... or sk_test_...):**
- Used by backend for API calls
- **NEVER expose in frontend or commit to Git**
- Example: `sk_live_51Abc...xyz`

### Test vs Production Keys

**During Development:**
- Use **Test mode** keys (pk_test_..., sk_test_...)
- Test credit cards: `4242 4242 4242 4242` (Visa)
- No real charges occur

**For Production:**
- Switch to **Live mode** toggle in Stripe Dashboard
- Use **Live mode** keys (pk_live_..., sk_live_...)
- Real credit cards and charges
- Requires Stripe account activation (business verification)

---

## Step 4: Update Environment Variables

### Required Environment Variables

Add these to your deployment platform (Cloudflare Pages, Vercel, etc.):

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Price IDs
STRIPE_PRICE_ID_TEAM_PLAN=price_xxxxxxxxxxxxx
```

### Cloudflare Pages Configuration
1. Go to Cloudflare Dashboard
2. Navigate to **Workers & Pages** > **Your Project**
3. Click **Settings** > **Environment variables**
4. Click **Add variable** for each key
5. Select **Production** environment
6. **Encrypt** the secret values (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)

### Local Development (.env.local)
```bash
# .env.local (DO NOT COMMIT)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxx
STRIPE_PRICE_ID_TEAM_PLAN=price_xxxxxxxxxxxxx
```

---

## Step 5: Test Webhook Delivery

### Using Stripe CLI (Recommended for Development)
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

### Using Stripe Dashboard
1. Go to **Developers** > **Webhooks**
2. Click your webhook endpoint
3. Click **Send test webhook**
4. Select event type (e.g., `checkout.session.completed`)
5. Click **Send test webhook**
6. Verify your backend receives and processes it

---

## Step 6: Verify Configuration

### Checklist
- [ ] Product "Project Arrowhead Teams" created
- [ ] Price $49/month configured
- [ ] Price ID copied and saved
- [ ] Webhook endpoint configured with production URL
- [ ] All required events selected
- [ ] Webhook signing secret copied and saved
- [ ] Publishable key copied
- [ ] Secret key copied (and kept secure)
- [ ] Environment variables added to deployment platform
- [ ] Environment variables added to .env.local for development
- [ ] Webhook test successful

---

## Security Best Practices

### API Key Security
- ❌ **NEVER** commit API keys to Git
- ❌ **NEVER** expose secret keys in frontend code
- ✅ Store in environment variables
- ✅ Use encrypted secrets in production
- ✅ Rotate keys if compromised

### Webhook Security
- ✅ Always verify webhook signatures using signing secret
- ✅ Use HTTPS endpoint (required by Stripe)
- ✅ Validate event data before processing
- ✅ Implement idempotency (handle duplicate events)

### PCI Compliance
- ✅ Use Stripe Checkout (Stripe hosts payment form)
- ✅ Never handle raw credit card data in your application
- ✅ Let Stripe manage PCI compliance

---

## Troubleshooting

### Webhook Not Receiving Events
1. Check webhook URL is correct and accessible
2. Verify endpoint is HTTPS (not HTTP)
3. Check webhook is not disabled in Stripe Dashboard
4. Review webhook logs in Stripe Dashboard for errors
5. Verify signing secret matches environment variable

### Test Mode vs Live Mode
- Ensure keys match mode (test keys with test mode, live keys with live mode)
- Cannot mix test and live keys
- Switch mode in Stripe Dashboard top-right corner

### Payment Failures
1. Check Stripe Dashboard > **Payments** for error details
2. Verify Price ID is correct
3. Ensure customer has valid payment method
4. Check for blocked countries/cards in Stripe Radar

---

## Additional Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Checkout Sessions:** https://stripe.com/docs/payments/checkout
- **Webhooks Guide:** https://stripe.com/docs/webhooks
- **API Reference:** https://stripe.com/docs/api
- **Test Cards:** https://stripe.com/docs/testing

---

## Support

For Stripe-related questions:
- **Stripe Support:** https://support.stripe.com
- **Stripe Community:** https://discord.gg/stripe

For Project Arrowhead integration questions:
- See: `/docs/PRODUCTION_ENV_SETUP_v2.0_Draft.md`
- See: Backend webhook handler at `/server/api/stripe/webhook.ts`

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-28 | Initial Stripe setup guide created |
