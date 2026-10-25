import { defineConfig, devices } from '@playwright/test';
import { z } from 'zod';
const port = z.coerce
  .number()
  .int()
  .min(1024)
  .max(65535)
  .parse(process.env.TEST_PORT ?? '3000');
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: `ACTIVITY_WORKER_DISABLED=1 npm run start -- --port ${port}`,
    url: `${baseURL}/es`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
