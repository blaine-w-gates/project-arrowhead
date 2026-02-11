# Testing Strategy & Modernization Plan
**Project Arrowhead - Comprehensive Automated Testing**  
**Version:** 1.0  
**Date:** September 30, 2025  
**Status:** Draft for Review

---

## Executive Summary

This document outlines a comprehensive testing strategy for Project Arrowhead, aligning with industry best practices and our transition to a commercial SaaS platform. The strategy addresses current gaps, modernizes existing tests, and establishes standards for future development.

---

## 1. Current State Analysis

### Existing Test Infrastructure

#### ✅ **Strengths**
1. **E2E Coverage** - 24 Playwright tests covering:
   - Blog functionality (display, ordering, 404, headers)
   - PDF exports (brainstorm, full project, visual regression)
   - SEO (robots.txt, sitemap.xml, RSS feed)
   - Lead magnet API
   - Data health monitoring
   - Admin access (needs update)

2. **Multi-Browser Support** - Chromium, Firefox, WebKit configured
3. **Production Testing** - Separate `prod-chromium` project with Cloudflare Access
4. **CI/CD Integration** - GitHub Actions workflows

#### ❌ **Critical Gaps**
1. **Admin Panel Testing** - Obsolete Decap CMS tests, no AdminJS coverage
2. **Unit Test Coverage** - Only 1 unit test (MailerLite integration)
3. **API Testing** - No dedicated API integration tests
4. **Security Testing** - No authentication/authorization tests
5. **Performance Testing** - No load/stress testing
6. **Database Testing** - No schema validation or migration tests
7. **Component Testing** - No React component tests

---

## 2. Industry Standards & Best Practices

### Testing Pyramid (Recommended Distribution)

```
           ╱──────────╲
          ╱   E2E (10%)  ╲     ← Critical user journeys
         ╱──────────────╲
        ╱  Integration    ╲    ← API, services, database
       ╱     (30%)         ╲
      ╱────────────────────╲
     ╱   Unit Tests (60%)    ╲  ← Business logic, utilities
    ╱────────────────────────╲
```

### Key Principles
1. **Test Independence** - Each test runs in isolation
2. **Fast Feedback** - Unit tests < 100ms, E2E < 30s
3. **Deterministic** - No flaky tests, reliable results
4. **Maintainable** - Clear naming, DRY principles
5. **Coverage Goals** - 80% unit, 60% integration, critical paths E2E

### Modern Testing Stack (Our Current vs. Recommended)

| Layer | Current | Recommended | Action |
|-------|---------|-------------|--------|
| **Unit** | Vitest (minimal) | Vitest + Testing Library | ✅ Keep, expand |
| **Integration** | None | Supertest + Vitest | 🆕 Add |
| **E2E** | Playwright | Playwright | ✅ Keep |
| **Component** | None | Vitest + Testing Library | 🆕 Add |
| **API** | None | Supertest | 🆕 Add |
| **Visual** | Playwright (basic) | Percy/Chromatic | 📋 Consider |
| **Performance** | None | k6 or Artillery | 📋 Future |

---

## 3. Comprehensive Testing Plan

### Phase 1: Foundation (Sprint 2) - **PRIORITY**

#### 1.1 Admin Panel Test Suite
**Goal:** Complete coverage of new AdminJS functionality

```typescript
// tests/e2e/admin/
├── admin-auth.spec.ts          // Login, logout, session
├── admin-users-crud.spec.ts    // User management
├── admin-rbac.spec.ts          // Role-based access
├── admin-audit-log.spec.ts     // Audit trail verification
└── admin-security.spec.ts      // CSRF, rate limiting, XSS
```

**Key Scenarios:**
- ✅ Login with valid/invalid credentials
- ✅ Session persistence across page reloads
- ✅ Role-based access control (super_admin, admin, support, read_only)
- ✅ CRUD operations with audit logging
- ✅ Rate limiting on failed logins
- ✅ Secure password handling (no exposure in logs/errors)

#### 1.2 API Integration Tests
**Goal:** Test all backend endpoints independently

```typescript
// tests/integration/api/
├── auth.test.ts               // Admin authentication API
├── users.test.ts              // User management API
├── journey-sessions.test.ts   // Journey system API
├── tasks.test.ts              // Task management API
├── blog.test.ts               // Blog API
└── lead-magnet.test.ts        // Lead capture API
```

**Framework:** Supertest + Vitest
```bash
npm install -D supertest @types/supertest
```

**Example Structure:**
```typescript
import request from 'supertest';
import { app } from '../server';

describe('POST /api/admin/login', () => {
  it('returns 200 with valid credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@test.com', password: 'test123' })
      .expect(200);
    
    expect(res.body).toHaveProperty('user');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 with invalid credentials', async () => {
    await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@test.com', password: 'wrong' })
      .expect(401);
  });
});
```

#### 1.3 Unit Test Expansion
**Goal:** 60% code coverage on business logic

```typescript
// tests/unit/
├── server/
│   ├── admin/
│   │   ├── auth.test.ts           // Password hashing, validation
│   │   └── middleware.test.ts     // Audit logging, rate limiting
│   ├── storage/
│   │   └── blog-storage.test.ts   // Blog data operations
│   └── utils/
│       └── validation.test.ts     // Schema validation
└── client/
    ├── hooks/
    │   ├── useJourney.test.ts     // Journey state management
    │   └── useTaskManager.test.ts // Task operations
    └── utils/
        └── exportUtils.test.ts    // PDF export logic
```

**Example:**
```typescript
import { hashPassword, verifyPassword } from '@/server/admin/auth';

describe('Password Utilities', () => {
  it('hashes passwords securely', async () => {
    const password = 'test123';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format
  });

  it('verifies correct passwords', async () => {
    const password = 'test123';
    const hash = await hashPassword(password);
    
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
```

### Phase 2: Modernization (Sprint 3)

#### 2.1 Database Testing
**Goal:** Validate schema, migrations, and RLS policies

```typescript
// tests/integration/database/
├── migrations.test.ts        // Migration up/down
├── schema-validation.test.ts // Drizzle schema integrity
├── rls-policies.test.ts      // Row-level security
└── seed-data.test.ts         // Test data generation
```

#### 2.2 Component Testing
**Goal:** Test React components in isolation

```bash
npm install -D @testing-library/react @testing-library/user-event
```

```typescript
// tests/component/
├── JourneyStep.test.tsx       // Journey step component
├── TaskList.test.tsx          // Task management
├── BlogPost.test.tsx          // Blog display
└── LeadMagnetForm.test.tsx    // Lead capture form
```

**Example:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { LeadMagnetForm } from '@/components/LeadMagnetForm';

describe('LeadMagnetForm', () => {
  it('submits email successfully', async () => {
    const onSubmit = vi.fn();
    render(<LeadMagnetForm onSubmit={onSubmit} />);
    
    const input = screen.getByLabelText(/email/i);
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    
    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });
});
```

#### 2.3 Security Testing
**Goal:** Automated security checks

```typescript
// tests/security/
├── xss-prevention.test.ts      // Cross-site scripting
├── sql-injection.test.ts       // SQL injection (Drizzle ORM)
├── csrf-protection.test.ts     // CSRF tokens
├── session-security.test.ts    // Session hijacking prevention
└── rate-limiting.test.ts       // DoS protection
```

### Phase 3: Advanced (Sprint 4+)

#### 3.1 Performance Testing
```typescript
// tests/performance/
├── api-load.test.ts           // API response times
├── database-queries.test.ts   // Query optimization
└── pdf-generation.test.ts     // Export performance
```

**Framework:** k6 or Artillery
```javascript
// k6 example
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 100, // 100 virtual users
  duration: '30s',
};

export default function() {
  let res = http.get('http://localhost:5000/api/blog/posts');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

#### 3.2 Accessibility Testing
```typescript
// tests/accessibility/
├── wcag-compliance.test.ts    // WCAG 2.1 AA
└── keyboard-navigation.test.ts // Keyboard-only users
```

**Framework:** axe-core + Playwright
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage should not have accessibility violations', async ({ page }) => {
  await page.goto('/');
  
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

---

## 4. Test Organization Structure

### Recommended Directory Layout

```
tests/
├── unit/                    # Fast, isolated tests
│   ├── server/
│   │   ├── admin/
│   │   ├── storage/
│   │   └── utils/
│   └── client/
│       ├── hooks/
│       ├── utils/
│       └── components/
│
├── integration/             # API & service tests
│   ├── api/
│   ├── database/
│   └── services/
│
├── component/               # React component tests
│   ├── journey/
│   ├── blog/
│   └── admin/
│
├── e2e/                     # End-to-end user flows
│   ├── admin/
│   ├── journey/
│   ├── blog/
│   └── lead-magnet/
│
├── security/                # Security-focused tests
├── performance/             # Load & stress tests
└── fixtures/                # Shared test data
    ├── users.ts
    ├── blog-posts.ts
    └── admin-users.ts
```

---

## 5. Testing Patterns & Standards

### Naming Conventions

```typescript
// ✅ Good
describe('AdminAuth', () => {
  describe('login()', () => {
    it('returns user object with valid credentials', async () => {});
    it('throws error with invalid credentials', async () => {});
    it('rate limits after 5 failed attempts', async () => {});
  });
});

// ❌ Bad
describe('test admin', () => {
  it('works', async () => {});
});
```

### Test Data Management

```typescript
// fixtures/admin-users.ts
export const testAdminUser = {
  email: 'admin@test.com',
  passwordHash: '$2a$12$...', // pre-hashed
  role: 'super_admin',
  isActive: true,
};

export async function createTestAdmin(overrides = {}) {
  return db.insert(adminUsers).values({
    ...testAdminUser,
    ...overrides,
  }).returning();
}
```

### Mock & Stub Strategy

```typescript
// Use vi.mock for external dependencies
vi.mock('@/server/storage', () => ({
  getBlogPosts: vi.fn().mockResolvedValue([]),
}));

// Use test doubles for database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};
```

---

## 6. CI/CD Integration

### GitHub Actions Workflows

```yaml
# .github/workflows/test-suite.yml
name: Comprehensive Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit:ci
      - uses: codecov/codecov-action@v3  # Upload coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e:ci
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Coverage Requirements

```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types.ts',
      ],
    },
  },
});
```

---

## 7. Implementation Roadmap

### Sprint 2: Admin Foundation Tests (Week 1-2)
- [ ] Admin authentication E2E tests
- [ ] Admin CRUD E2E tests
- [ ] API integration tests (auth endpoints)
- [ ] Unit tests for auth utilities
- [ ] Database migration tests

### Sprint 3: Core Functionality (Week 3-4)
- [ ] Journey system E2E tests
- [ ] Task management API tests
- [ ] Component tests for admin panel
- [ ] Security tests (XSS, CSRF, SQL injection)
- [ ] Update obsolete tests

### Sprint 4: Advanced Coverage (Week 5-6)
- [ ] Performance tests
- [ ] Accessibility tests
- [ ] Visual regression tests
- [ ] Database stress tests
- [ ] CI/CD optimization

---

## 8. Metrics & Monitoring

### Test Health Dashboard

Track these metrics weekly:
- **Coverage:** Unit (target 80%), Integration (60%), E2E (critical paths)
- **Execution Time:** Unit (<5min), Integration (<10min), E2E (<30min)
- **Flaky Tests:** < 1% failure rate
- **Test Count:** Growing with features
- **Maintenance Burden:** Time spent fixing tests vs. writing new ones

### Success Criteria

✅ **Phase 1 Complete When:**
- 80% unit test coverage on new admin code
- All admin E2E flows covered
- API integration tests for all endpoints
- Zero failing tests in CI

✅ **Phase 2 Complete When:**
- Component tests for all React components
- Database tests for all migrations
- Security test suite passing
- Performance baselines established

✅ **Phase 3 Complete When:**
- Accessibility compliance verified
- Load testing shows acceptable performance
- Visual regression suite stable
- Test execution time < 30 minutes total

---

## 9. Tools & Dependencies

### Required Installations

```bash
# Core testing
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/user-event
npm install -D @testing-library/jest-dom

# API testing
npm install -D supertest @types/supertest

# Security testing
npm install -D @axe-core/playwright

# Performance testing (optional)
npm install -D k6

# Visual regression (optional)
npm install -D @percy/cli @percy/playwright
```

### Configuration Files

```typescript
// vitest.config.ts - Unit & Integration
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: { /* see section 6 */ },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
```

---

## 10. Maintenance & Best Practices

### Code Review Checklist
- [ ] Tests included with new features
- [ ] Tests updated with bug fixes
- [ ] Coverage thresholds met
- [ ] No skipped or focused tests
- [ ] Test data uses fixtures
- [ ] Async operations properly awaited
- [ ] No hardcoded timeouts

### Common Pitfalls to Avoid
1. **Flaky Tests** - Use deterministic data, proper waits
2. **Slow Tests** - Mock external services, optimize queries
3. **Brittle Tests** - Test behavior, not implementation
4. **Test Interdependence** - Each test must be independent
5. **Poor Coverage** - Focus on critical paths, edge cases

---

## Conclusion

This comprehensive testing strategy transforms Project Arrowhead's testing infrastructure from basic E2E coverage to a robust, multi-layered test suite aligned with industry standards. 

**Immediate Next Steps:**
1. Review and approve this strategy
2. Begin Phase 1 implementation in Sprint 2
3. Set up test metrics dashboard
4. Schedule weekly test health reviews

**Expected Outcomes:**
- 🎯 80% code coverage
- 🚀 Faster development cycles
- 🛡️ Fewer production bugs
- 📊 Better code quality
- 🔄 Confident refactoring

---

## 11. Team MVP Testing Requirements (Sprint v9.0 Addendum)

**Version:** 1.1  
**Date:** October 26, 2025  
**Status:** Final  
**Based On:** PRD v5.2 Final, SLAD v6.0 Draft

This addendum outlines the specific testing requirements for the Team MVP features defined in PRD v5.2 Final and SLAD v6.0 Draft, supplementing the general strategy document.

---

### 11.1 RLS Policy Tests

**Team Isolation:**
- Verify that a user logged into Team A cannot query or access any data (projects, objectives, tasks, members) belonging to Team B via API calls or direct database inspection (simulated).

**Project Assignment Enforcement:**
- Verify a user can only see/access Projects they are explicitly assigned to via the `team_member_project_assignments` table.
- Verify a user cannot see/access Objectives, Tasks, or Touchbases belonging to projects they are not assigned to, even if they belong to the same team.

**Touchbase Privacy:**
- Verify the `created_by` user can view the Touchbase.
- Verify the `team_member_id` user (the one the Touchbase is with) can view the Touchbase.
- Verify Account Owner / Account Manager can view any Touchbase within their team.
- Verify a regular Team Member cannot view Touchbases they are not a participant in (neither `created_by` nor `team_member_id`).

**Virtual Persona Context:**
- Verify RLS policies correctly function when the Manager is acting "as" a Virtual Persona (e.g., using session variable `app.current_team_member_id`).
- Ensure Manager actions on behalf of a Virtual Persona are restricted to the projects that Virtual Persona is assigned to.

---

### 11.2 Permission Function & RBAC Tests

**Role-Based CRUD (API Level):**

For each of the 5 roles, test API endpoints to ensure they can perform allowed actions and are blocked from disallowed actions according to the matrix in PRD v5.2 Section 6.2. Examples:

- Verify Account Owner/Manager/Project Owner can successfully `POST /api/teams/:teamId/projects`.
- Verify Objective Owner/Team Member receive a 403 Forbidden error for the same request.
- Verify Team Member can successfully update their own task status via `PUT /api/tasks/:taskId` but not others'.
- Verify Objective Owner can manage tasks (POST, PUT, DELETE) only for objectives they own/are assigned to.

**Project Assignment Checks (API Level):**
- Verify API endpoints correctly check project assignment before allowing actions (e.g., an Objective Owner cannot create a Touchbase for an objective in a project they are not assigned to).

---

### 11.3 WebSocket/Real-Time Tests (E2E)

**Lock Acquisition/Release:**
- Verify User A acquiring a lock successfully blocks User B from acquiring the same lock.
- Verify User B sees the "[User A] is editing..." banner.
- Verify releasing the lock (manual or timeout) allows User B to acquire it.

**5-Minute Timeout:**
- Verify lock is automatically released after 5 minutes of inactivity.
- Verify unsaved changes are auto-saved upon timeout (per SLAD v6.0).
- Verify relevant notification is shown to the user whose lock timed out.

**Concurrent Editing Scenario:**
- Simulate two users attempting edits, verify only one succeeds at a time and updates broadcast correctly.

**Task Status Sync:**
- Verify changing task status in Tab 4 (RRGT) instantly (<500ms) updates the status displayed in Tab 3 (Scoreboard) for another user viewing the same objective.
- Verify adding a new task in Tab 3 instantly appears in the assigned user's Tab 4 (RRGT).

---

### 11.4 Touchbase Tests (E2E & API)

**Creation:**
- Verify only Objective Owner (for assigned objective) or higher roles can create Touchbases via the UI/API.
- Verify it's 1-on-1 only.

**Privacy:**
- Verify saved Touchbases are only visible to the creator, the participant, and Account Owner/Manager via API queries and UI checks.

**24-Hour Edit Window:**
- Verify the `editable` flag is set correctly on creation and flips after 24 hours.
- Verify API blocks edits after 24 hours.

**Lock-Based Editing:**
- Verify the real-time locking mechanism works for concurrent Touchbase editing sessions.

**History Log:**
- Verify completed Touchbases appear correctly in the Tab 3 history log and expand/collapse properly.

---

### 11.5 Completion Tracker Tests (Integration & E2E)

**Automatic Objective Completion (Database Trigger):**
- Create an objective with multiple tasks.
- Mark all tasks but one as 'Completed'. Verify `objectives.all_tasks_complete` is `false`.
- Mark the final task as 'Completed'. Verify the trigger correctly sets `objectives.all_tasks_complete` to `true` and populates `objectives.actual_completion_date`.
- Change one task back to 'In Progress'. Verify the trigger resets `all_tasks_complete` to `false` and clears `actual_completion_date`.

**Manual Project Completion (UI):**
- Verify the toggle in Tab 2 correctly updates `projects.completion_status`.

**Date Comparison UI:**
- Verify the UI correctly displays target vs. actual dates and calculates/shows the difference (e.g., "3 days late").

---

### 11.6 Yes/No Objective Flow Tests (E2E)

**"Yes" Path:**
- Verify clicking "Yes", entering a name, leads directly to the Objectives module (steps 11-17).

**"No" Path:**
- Verify clicking "No" proceeds sequentially through Brainstorm (1-5) → Choose (6-10) → Objectives (11-17).

**Name Setting:**
- Verify the objective name is correctly set (or updated from "Untitled...") during the "Choose" module in the "No" path.

**State Management:**
- Verify `objectives.current_step` and `objectives.journey_status` are updated correctly throughout the flow.

**Draft Resumption:**
- Verify saving a draft mid-journey and reopening the objective correctly resumes at `current_step` with previously saved data loaded.

---

### 11.7 Invitation Flow Tests (Integration & E2E)

**Invite Generation (API):**
- Verify calling the invite endpoint successfully triggers the Supabase `inviteUserByEmail` function and sets the `team_members` record status correctly.

**Email Delivery:**
- (Requires integration environment) Verify the magic link email is sent and received.

**Signup via Link:**
- Simulate user clicking magic link, setting password, and successfully authenticating.

**Database Trigger Linking:**
- Verify the `auth.users` insert trigger correctly finds the matching `team_members` record (by email) and updates `team_members.user_id`, linking the accounts.

**Duplicate/Existing Email:**
- Test scenarios where the invited email already exists in `auth.users` globally; ensure the user is correctly added/linked to the new team without disrupting their existing access elsewhere.

---

### 11.8 Test Implementation Priority (Sprint v9.0)

#### **Phase 1: Database Foundation (Week 1-2)**
- [ ] RLS policy tests (team isolation, project assignment)
- [ ] Database trigger tests (completion tracker, invite linking)
- [ ] Permission function unit tests
- [ ] Schema validation tests

#### **Phase 2: API & Backend (Week 3-4)**
- [ ] API integration tests (all team-based endpoints)
- [ ] Role-based CRUD tests (5 roles × all actions)
- [ ] Touchbase API tests (creation, privacy, edit window)
- [ ] Invitation flow tests (magic link, linking)

#### **Phase 3: Real-Time & UI (Week 5-6)**
- [ ] WebSocket E2E tests (lock-based editing, task sync)
- [ ] Completion tracker E2E tests (UI display, date comparison)
- [ ] Yes/No objective flow E2E tests (branching logic, state management)
- [ ] Touchbase E2E tests (full flow, history log)

#### **Phase 4: Integration & Regression (Week 7-8)**
- [ ] Cross-feature integration tests
- [ ] Performance tests (concurrent users, large datasets)
- [ ] Regression suite for all Team MVP features
- [ ] Security tests (RLS bypass attempts, privilege escalation)

---

### 11.9 Testing Tools & Setup

**Additional Dependencies for Team MVP:**
```bash
# Supabase testing client
npm install -D @supabase/supabase-js

# PostgreSQL testing utilities
npm install -D pg @types/pg

# WebSocket testing
npm install -D ws @types/ws
```

**Test Database Setup:**
```bash
# Create test database with Supabase schema
npm run db:test:setup

# Run migrations on test database
npm run db:migrate:test

# Seed test data (teams, members, projects)
npm run db:seed:test
```

**Environment Variables (Test):**
```bash
# .env.test
DATABASE_URL=postgresql://postgres:test@localhost:54322/test_db
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test_anon_key
SUPABASE_SERVICE_ROLE_KEY=test_service_role_key
```

---

### 11.10 Success Criteria

**Sprint v9.0 Testing Complete When:**
- ✅ 100% RLS policy coverage (all tables, all roles)
- ✅ All 5 roles tested against permission matrix
- ✅ Real-time features verified (lock-based editing, task sync)
- ✅ Completion trackers working (automatic + manual)
- ✅ Invitation flow tested end-to-end
- ✅ Yes/No objective flow fully tested
- ✅ Touchbase module fully tested (creation, privacy, history)
- ✅ Zero failing tests in CI
- ✅ Test execution time < 45 minutes

---

**This addendum provides the specific test targets for the Team MVP. The overall testing strategy (pyramid, tools, CI/CD integration) remains as defined in the main TESTING_STRATEGY.md document.**

---

**Document Owner:** Development Team  
**Last Updated:** October 26, 2025  
**Next Review:** November 15, 2025
