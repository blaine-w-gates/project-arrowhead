# Sprint 2: Testing Implementation Plan
**Operation: Admin Foundation - Test Coverage**

## Overview

Sprint 2 focuses on implementing comprehensive test coverage for the new admin panel functionality while modernizing our existing test infrastructure.

---

## Priority Tasks

### 🔴 **P0: Critical (Must Have for Sprint 2)**

#### 1. Admin Panel E2E Tests
**Estimated Time:** 4-6 hours

```typescript
// tests/e2e/admin/admin-auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Authentication', () => {
  test('admin can login with valid credentials', async ({ page }) => {
    await page.goto('/admin');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // Fill in login form
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('admin cannot login with invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('admin session persists across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin$/);
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('rate limiting blocks after 5 failed login attempts', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Try 6 times with wrong password
    for (let i = 0; i < 6; i++) {
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'wrong');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100);
    }
    
    // Should show rate limit error
    await expect(page.locator('text=Too many')).toBeVisible();
  });
});
```

#### 2. Admin API Integration Tests
**Estimated Time:** 6-8 hours

```bash
# Install dependencies
npm install -D supertest @types/supertest
```

```typescript
// tests/integration/api/admin-auth.test.ts
import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { app } from '@/server/index';
import { db } from '@/server/db';
import { adminUsers } from '@shared/schema';
import { hashPassword } from '@/server/admin/auth';

describe('POST /api/admin/login', () => {
  let testAdminId: number;

  beforeAll(async () => {
    // Create test admin user
    const [admin] = await db.insert(adminUsers).values({
      email: 'test@example.com',
      passwordHash: await hashPassword('test123'),
      role: 'admin',
      isActive: true,
    }).returning();
    testAdminId = admin.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(adminUsers).where(eq(adminUsers.id, testAdminId));
  });

  it('returns 200 with valid credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'test@example.com',
        password: 'test123',
      })
      .expect(200);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 with invalid credentials', async () => {
    await request(app)
      .post('/api/admin/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      })
      .expect(401);
  });

  it('returns 401 for inactive admin', async () => {
    // Deactivate admin
    await db.update(adminUsers)
      .set({ isActive: false })
      .where(eq(adminUsers.id, testAdminId));

    await request(app)
      .post('/api/admin/login')
      .send({
        email: 'test@example.com',
        password: 'test123',
      })
      .expect(401);

    // Reactivate for cleanup
    await db.update(adminUsers)
      .set({ isActive: true })
      .where(eq(adminUsers.id, testAdminId));
  });
});
```

#### 3. Unit Tests for Auth Utilities
**Estimated Time:** 2-3 hours

```typescript
// tests/unit/server/admin/auth.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/server/admin/auth';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('generates bcrypt hash', async () => {
      const password = 'test123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    it('generates different hashes for same password', async () => {
      const password = 'test123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const password = 'test123';
      const hash = await hashPassword(password);

      expect(await verifyPassword(password, hash)).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hash = await hashPassword('test123');

      expect(await verifyPassword('wrong', hash)).toBe(false);
    });
  });
});
```

### 🟡 **P1: High Priority (Should Have)**

#### 4. Update Obsolete Tests
**Estimated Time:** 2-3 hours

Files to review and update:
- `tests/e2e/admin-access.spec.ts` - Update for AdminJS
- `tests/e2e/admin-redirect.spec.ts` - Update redirect logic
- `tests/e2e/admin-noindex.spec.ts` - Verify SEO blocking

#### 5. Test Fixtures & Helpers
**Estimated Time:** 2-3 hours

```typescript
// tests/fixtures/admin-users.ts
import { db } from '@/server/db';
import { adminUsers } from '@shared/schema';
import { hashPassword } from '@/server/admin/auth';

export async function createTestAdmin(overrides = {}) {
  const [admin] = await db.insert(adminUsers).values({
    email: 'test@example.com',
    passwordHash: await hashPassword('test123'),
    role: 'admin',
    isActive: true,
    ...overrides,
  }).returning();

  return admin;
}

export async function cleanupTestAdmin(id: number) {
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
}
```

### 🟢 **P2: Nice to Have (Future)**

#### 6. Component Tests
**Estimated Time:** 4-6 hours

```typescript
// tests/component/admin/AdminUserForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminUserForm } from '@/client/components/admin/AdminUserForm';

test('renders admin user form', () => {
  render(<AdminUserForm onSubmit={vi.fn()} />);
  
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
});
```

---

## Configuration Updates

### 1. Add Test Database

```bash
# .env.test
DATABASE_URL="postgresql://test:test@localhost:5432/arrowhead_test"
TEST_ADMIN_EMAIL="admin@test.com"
TEST_ADMIN_PASSWORD="test123"
```

### 2. Update package.json Scripts

```json
{
  "scripts": {
    "test:integration": "vitest run tests/integration",
    "test:integration:watch": "vitest tests/integration",
    "test:admin:e2e": "playwright test tests/e2e/admin",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### 3. Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts', 'shared/**/*.ts'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
```

### 4. Test Setup File

```typescript
// tests/setup.ts
import { beforeAll, afterAll } from 'vitest';
import { db } from '@/server/db';

// Global test setup
beforeAll(async () => {
  // Run migrations if needed
  console.log('Setting up test environment...');
});

// Global teardown
afterAll(async () => {
  // Close database connections
  console.log('Cleaning up test environment...');
});
```

---

## Acceptance Criteria

### Sprint 2 Complete When:

- [ ] All admin E2E tests passing
- [ ] API integration tests for auth endpoints
- [ ] Unit tests for auth utilities (80% coverage)
- [ ] Test fixtures created and documented
- [ ] Obsolete tests updated or removed
- [ ] CI/CD running all test suites
- [ ] Test documentation updated
- [ ] Zero flaky tests

---

## Timeline

**Week 1 (Days 1-3):**
- Day 1: Setup test infrastructure (vitest config, fixtures)
- Day 2: Admin E2E tests
- Day 3: API integration tests

**Week 2 (Days 4-5):**
- Day 4: Unit tests + update obsolete tests
- Day 5: CI/CD integration + documentation

**Total Estimated Time:** 20-28 hours

---

## Dependencies

### Technical
- PostgreSQL test database
- Environment variables configured
- AdminJS fully functional
- Database migrations run

### Team
- Code reviews for test quality
- Approval of testing strategy
- CI/CD access for GitHub Actions

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flaky E2E tests | High | Use explicit waits, deterministic data |
| Test database setup | Medium | Docker container for consistency |
| Slow test execution | Medium | Parallel execution, mock external services |
| Coverage gaps | Low | Regular coverage reports, required reviews |

---

## Success Metrics

Track weekly:
- ✅ Test count (target: 50+ new tests)
- ✅ Coverage (target: 80% on admin code)
- ✅ Execution time (target: <10min total)
- ✅ Pass rate (target: 100%)
- ✅ Flakiness (target: 0%)

---

**Next Steps After Sprint 2:**
1. Component testing for React admin UI
2. Security test suite
3. Performance benchmarking
4. Visual regression testing
