import { defineConfig, devices } from '@playwright/test';

const accessHeaders = (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET)
  ? {
      'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
    }
  : undefined;

const heavyEnabled = !!(process.env.E2E_HEAVY || process.env.E2E_SMOKE_PROD);
const prodEnabled = !!(process.env.E2E_SMOKE_PROD || process.env.E2E_HEAVY);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000',
    trace: 'on',
    video: 'on',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
  },
  // By default, skip tests tagged @heavy. When heavy mode is enabled
  // via E2E_HEAVY or E2E_SMOKE_PROD, run only @heavy tests.
  grep: heavyEnabled ? /@heavy/ : undefined,
  grepInvert: heavyEnabled ? undefined : /@heavy/,
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
    ...(prodEnabled
      ? [
          {
            name: 'prod-chromium',
            use: {
              ...devices['Desktop Chrome'],
              baseURL: process.env.PLAYWRIGHT_PROD_BASE_URL || 'https://project-arrowhead.pages.dev',
              extraHTTPHeaders: accessHeaders,
            },
          },
        ]
      : []),
  ],
  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
        // Ensure the Node dev server proxies to the Python backend on 5050 during tests
        // Expose E2E_EXPOSE_OTP=1 so /api/auth/request returns { devCode } for the test environment
        command: 'AUTH_JWT_SECRET=testsecret E2E_EXPOSE_OTP=1 PY_BACKEND_PORT=5050 npm run dev',
        url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Pass Supabase credentials to dev server environment so it can use real admin client
        // CRITICAL: Spread parent env to preserve system vars, then add our secrets
        env: {
          ...process.env,
          SUPABASE_URL: process.env.SUPABASE_URL || '',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',
          DATABASE_URL: process.env.DATABASE_URL || '',
          // Expose Vite client env so supabase-js in the browser uses the correct project ref and storage key
          VITE_SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
          VITE_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
          // Force API team init path during Playwright runs to avoid UI modal flake
          E2E_FORCE_API_TEAM_INIT: '1',
        },
      },
});
