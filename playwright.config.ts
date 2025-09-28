import process from 'node:process';

import { defineConfig, devices } from '@playwright/test';

const { CI, PLAYWRIGHT_USE_PREVIEW } = process.env;

const isCI = CI === 'true' || CI === '1';
const usePreview = PLAYWRIGHT_USE_PREVIEW === 'true' || PLAYWRIGHT_USE_PREVIEW === '1';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'on',
    video: 'retain-on-failure',
  },
  webServer: {
    command: usePreview
      ? 'pnpm preview --host 127.0.0.1 --port 4173 --strictPort'
      : 'pnpm dev --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCI,
    stdout: 'pipe',
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
  ],
});
