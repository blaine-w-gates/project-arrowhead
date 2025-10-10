import { defineConfig, devices } from '@playwright/test';

const accessHeaders = (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET)
  ? {
      'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
    }
  : undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000',
    trace: 'on',
    video: 'on',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'prod-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_PROD_BASE_URL || 'https://project-arrowhead.pages.dev',
        extraHTTPHeaders: accessHeaders,
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
        // Ensure the Node dev server proxies to the Python backend on 5050 during tests
        // Expose E2E_EXPOSE_OTP=1 so /api/auth/request returns { devCode } for the test environment
        // Provide AUTH_JWT_SECRET so /api/auth/verify can issue a signed session cookie during tests
        command: 'AUTH_JWT_SECRET=testsecret E2E_EXPOSE_OTP=1 DATABASE_URL= PY_BACKEND_PORT=5050 npm run dev',
        url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
