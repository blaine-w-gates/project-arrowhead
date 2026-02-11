---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** Sprint_Plan_v8.0.md  
**Archived:** October 23, 2025  
---

# Sprint Plan v7.0: Operation: Admin Foundation

> Note: Superseded by v8.0 — see `Sprint_Plan_v8.0.md`. Archived for historical reference.

**Version:** 7.0  
**Date:** September 30, 2025  
**Epic:** Operation: Admin Foundation — Build the core backend management system for users, teams, and billing to establish the foundation for the Pro Version.

---

## Epic Objective

Create a secure, extensible admin panel that enables the Project Manager and team members to:
- Manage user accounts and permissions
- Oversee team subscriptions and billing
- Monitor key business metrics
- Add and configure new features over time

This is the cornerstone of **Stage 2: Systematize** — transforming Project Arrowhead from a free tool into a commercial SaaS platform.

---

## 1) Grounding & Dependencies

### Current State Summary
- **Backend:** Express server with PostgreSQL (Supabase) in `server/`
- **Database:** Users, sessions, tasks, journey sessions already implemented
- **Authentication:** No admin auth system currently exists
- **Deployment:** Cloudflare Pages with Express server

### Dependencies / Risks
- AdminJS requires adaptation for our Drizzle ORM schema
- Admin routes must be completely separate from public API
- Session security critical for production admin access
- Must not disrupt existing public-facing features

### Technology Stack
- **AdminJS** v7 - Auto-generated admin UI
- **Passport.js** - Authentication middleware
- **express-session** - Secure session management
- **bcryptjs** - Password hashing
- **connect-pg-simple** - PostgreSQL session store

---

## 2) Organized & Prioritized Backlog (with Estimates)

| Priority | Size | Task |
|----------|------|------|
| **Critical** | Large | Sprint 1: AdminJS integration + basic auth |
| **Critical** | Medium | Sprint 2: Core resource management (users, teams) |
| **High** | Medium | Sprint 3: Billing integration + subscription management |
| **High** | Small | Sprint 4: Analytics dashboard + business metrics |
| **Medium** | Small | Role-based access control (RBAC) |
| **Medium** | Small | Audit logging for admin actions |
| **Low** | Small | Team collaboration features UI |

---

## 3) Sprint Breakdown

### **Sprint 1: Core Admin Infrastructure** (3-4 days)

**Objective:** Establish the foundational admin system with authentication and basic UI.

#### Scope

**1. Install AdminJS Dependencies**
```bash
npm install adminjs @adminjs/express @adminjs/drizzle
npm install passport passport-local express-session
npm install bcryptjs connect-pg-simple
npm install @types/passport @types/passport-local @types/bcryptjs
```

**2. Create Admin User Schema**
- Add `admin_users` table to database
- Fields: `id`, `email`, `password_hash`, `role`, `created_at`, `last_login`
- Create migration script

**3. Build Authentication System**
- Implement Passport.js local strategy
- Create session management with PostgreSQL store
- Build login/logout endpoints
- Add authentication middleware

**4. Integrate AdminJS with Express**
- Create `/admin` route prefix
- Configure AdminJS with Drizzle adapter
- Set up basic resource for `users` table
- Implement authentication gate

**5. Create Seed Admin User**
- Script to create initial admin account
- Environment variable for default admin credentials

#### Deliverables
- ✅ AdminJS accessible at `/admin` (protected by login)
- ✅ Login page with email/password authentication
- ✅ Secure sessions persisted in PostgreSQL
- ✅ Basic CRUD interface for viewing users
- ✅ Seed script for creating admin accounts

#### Acceptance Criteria
- Admin login page renders and accepts credentials
- Invalid credentials show error, valid credentials create session
- Session persists across page refreshes
- Users table visible in admin panel with read-only access
- Logout destroys session and redirects to login

#### Implementation Notes

**File Structure:**
```
server/
  admin/
    index.ts           # AdminJS setup and configuration
    auth.ts            # Passport.js authentication
    resources/         # AdminJS resource definitions
      users.ts
    middleware.ts      # Authentication middleware
  migrations/
    009_create_admin_users.sql
  scripts/
    create-admin.ts    # Seed script
```

**Security Considerations:**
- Use `secure: true` for cookies in production
- Implement rate limiting on login endpoint
- Hash passwords with bcrypt (cost factor 12)
- Use CSRF protection for admin forms
- Set strict CORS policy for admin routes

---

### **Sprint 2: Core Resource Management** (3-4 days)

**Objective:** Build full CRUD interfaces for managing users, teams, and sessions.

#### Scope

**1. Expand Database Schema**
- Add `teams` table: `id`, `name`, `owner_id`, `plan`, `created_at`
- Add `team_members` table: `team_id`, `user_id`, `role`, `joined_at`
- Add `subscriptions` table: `team_id`, `stripe_subscription_id`, `status`, `plan_id`
- Create migrations

**2. Configure AdminJS Resources**
- **Users Resource:**
  - List view: email, created_at, last_active
  - Detail view: full profile + journey sessions
  - Actions: view, edit, delete, ban/unban
- **Teams Resource:**
  - List view: team name, owner, member count, plan
  - Detail view: members list, subscription status
  - Actions: create, edit, delete, view members
- **Journey Sessions Resource:**
  - List view: user, module, progress, created_at
  - Detail view: full session data (read-only)
  - Actions: view, export, delete

**3. Custom Actions**
- "Reset Password" action for users
- "Add Team Member" action for teams
- "Export Data" action for sessions

**4. Relationship Configuration**
- Link users to their teams
- Link teams to their subscriptions
- Display related records in detail views

#### Deliverables
- ✅ Full CRUD interfaces for users, teams, sessions
- ✅ Custom actions for common admin tasks
- ✅ Search and filter functionality
- ✅ Pagination for large datasets
- ✅ Relationship navigation between resources

#### Acceptance Criteria
- Admin can view all users and search by email
- Admin can create/edit/delete teams
- Admin can view user's journey sessions and export data
- Relationships properly linked (user → teams → subscriptions)
- All actions include confirmation dialogs

---

### **Sprint 3: Billing Integration** (4-5 days)

**Objective:** Integrate Stripe for subscription management and payment processing.

#### Scope

**1. Stripe Setup**
- Install Stripe SDK: `npm install stripe`
- Configure Stripe API keys (test + production)
- Create Stripe webhook endpoint

**2. Subscription Management**
- Create subscription plans in Stripe
- Build subscription creation flow
- Implement webhook handlers:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

**3. Admin UI for Billing**
- Custom page: "Subscription Overview"
  - Active subscriptions count
  - MRR (Monthly Recurring Revenue)
  - Churn rate
- Subscription resource in AdminJS:
  - List view: team, plan, status, next_billing_date
  - Actions: cancel, upgrade, downgrade
- Payment history resource:
  - List invoices with status

**4. Payment Failure Handling**
- Auto-retry logic via Stripe
- Email notifications for failed payments
- Grace period before downgrade

#### Deliverables
- ✅ Stripe integration with webhook handling
- ✅ Admin UI for viewing subscriptions
- ✅ Manual subscription management actions
- ✅ Payment failure notifications
- ✅ MRR and churn tracking

#### Acceptance Criteria
- Admin can view all active subscriptions
- Admin can manually cancel or modify subscriptions
- Webhooks properly update subscription status in database
- Failed payments trigger notifications
- MRR calculated correctly on dashboard

---

### **Sprint 4: Analytics Dashboard** (2-3 days)

**Objective:** Create a metrics dashboard for monitoring business health.

#### Scope

**1. Custom Dashboard Page**
Build custom AdminJS dashboard with key metrics:

**User Metrics:**
- Total users
- New users (last 7/30 days)
- Active users (last 30 days)
- User growth chart

**Business Metrics:**
- Total subscriptions (by plan)
- MRR and ARR
- Churn rate
- Conversion rate (free → paid)

**Product Metrics:**
- Journey completions by module
- Average session duration
- Task export usage
- Most popular modules

**2. Charts and Visualizations**
- Install Chart.js or Recharts
- Line charts for growth trends
- Pie charts for plan distribution
- Bar charts for module usage

**3. Real-time Updates**
- Auto-refresh dashboard every 5 minutes
- Last updated timestamp

#### Deliverables
- ✅ Custom dashboard as admin homepage
- ✅ All key metrics visible at a glance
- ✅ Interactive charts for trends
- ✅ Export dashboard data as CSV

#### Acceptance Criteria
- Dashboard loads in <2 seconds
- All metrics accurate (verified against database)
- Charts render correctly and are interactive
- Dashboard updates automatically

---

## 4) Role-Based Access Control (RBAC)

### Roles Definition

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full access to all features |
| **Admin** | User management, view billing (no modifications) |
| **Support** | View-only access to users and sessions |
| **Read-Only** | Dashboard and analytics only |

### Implementation
- Add `role` field to `admin_users` table
- Create middleware to check permissions per action
- Configure AdminJS actions with role requirements

---

## 5) Audit Logging

### Scope
- Log all admin actions to `admin_audit_log` table
- Fields: `admin_id`, `action`, `resource`, `resource_id`, `timestamp`, `ip_address`
- Display audit log in admin panel (read-only)

### Use Cases
- Track who modified user accounts
- Monitor subscription changes
- Investigate security incidents

---

## 6) Implementation Notes

### Security Checklist
- [ ] Admin routes isolated from public API
- [ ] HTTPS enforced for admin access
- [ ] Strong password requirements
- [ ] Session timeout after 30 minutes of inactivity
- [ ] CSRF protection enabled
- [ ] Rate limiting on login endpoint
- [ ] Audit logging for all actions

### Testing Strategy
- **Unit Tests:** Authentication middleware, password hashing
- **Integration Tests:** Login flow, session management
- **E2E Tests:** Admin panel navigation, CRUD operations
- **Security Tests:** SQL injection, XSS, CSRF attacks

---

## 7) Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AdminJS learning curve | Medium | Start with basic resources, iterate |
| Security vulnerabilities | High | Follow OWASP guidelines, security audit |
| Performance with large datasets | Medium | Implement pagination, indexing |
| Stripe integration complexity | Medium | Use Stripe's official Node.js SDK |

---

## 8) Definition of Done (Epic)

The epic is complete when:
- ✅ Admin panel accessible at `/admin` with secure authentication
- ✅ Full CRUD management for users, teams, subscriptions
- ✅ Stripe integration for billing and payments
- ✅ Analytics dashboard with key business metrics
- ✅ Role-based access control implemented
- ✅ Audit logging for all admin actions
- ✅ Comprehensive test coverage
- ✅ Security audit passed
- ✅ Documentation for admin users

---

## 9) Success Metrics

After implementation, we should achieve:
- **Admin Efficiency:** Common tasks (user lookup, subscription check) take <30 seconds
- **Security:** Zero unauthorized access incidents
- **Reliability:** Admin panel uptime >99.9%
- **Adoption:** Project Manager uses admin daily for business decisions
- **Extensibility:** New resources can be added in <1 hour

---

## Next Steps

1. **Immediate:** Begin Sprint 1 implementation
2. **Week 2:** Review Sprint 1 deliverables, start Sprint 2
3. **Week 3:** Stripe integration (Sprint 3)
4. **Week 4:** Dashboard and polish (Sprint 4)
5. **Week 5:** Security audit, documentation, launch

**Target Launch Date:** October 28, 2025 (~4 weeks)
