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
  expect: { timeout: 15_000 },
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5000',
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
    // Only include prod-chromium when explicitly targeting production via PLAYWRIGHT_PROD_BASE_URL
    ...(process.env.PLAYWRIGHT_PROD_BASE_URL ? [{
      name: 'prod-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_PROD_BASE_URL,
        extraHTTPHeaders: accessHeaders,
      },
    }] : []),
  ],
  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
      // Ensure the Node dev server proxies to the Python backend on 5050 during tests
      // Expose E2E_EXPOSE_OTP=1 so /api/auth/request returns { devCode } for the test environment
      command: 'AUTH_JWT_SECRET=testsecret E2E_EXPOSE_OTP=1 PY_BACKEND_PORT=5050 npm run dev',
      url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // Pass Supabase credentials to dev server environment so it can use real admin client
      // CRITICAL: Spread parent env to preserve system vars, then add our secrets
      env: {
        ...process.env,

        // Expose Vite client env so supabase-js in the browser uses the correct project ref and storage key
        VITE_SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        VITE_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
        // Force API team init path during Playwright runs to avoid UI modal flake
        E2E_FORCE_API_TEAM_INIT: '1',
        // Bypass UI signup flow and use Admin API for speed and reliability
        E2E_BYPASS_UI_SIGNUP: '1',
      },
    },
});
