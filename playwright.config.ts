import { defineConfig, devices } from '@playwright/test';

// Runs against the real Worker (wrangler dev) with Turnstile's test keys and EMAIL_FAKE=1 from .dev.vars.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:8787', trace: 'retain-on-failure' },
  webServer: { command: 'pnpm build && pnpm wrangler dev --port 8787', url: 'http://localhost:8787', reuseExistingServer: !process.env.CI, timeout: 180_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
