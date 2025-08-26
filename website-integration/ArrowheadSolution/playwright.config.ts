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
        command: 'npm run dev',
        url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
