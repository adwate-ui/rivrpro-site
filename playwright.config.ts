import { defineConfig, devices } from '@playwright/test';

// Runs against the real Worker (wrangler dev) with Turnstile's test keys from .dev.vars; emails go to wrangler's local
// send_email simulator. A fresh state folder each run, so the per-address send limit never carries over from earlier runs.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:8787', trace: 'retain-on-failure' },
  webServer: {
    command: 'rm -rf .wrangler/e2e && pnpm build && pnpm wrangler dev --port 8787 --persist-to .wrangler/e2e',
    url: 'http://localhost:8787', reuseExistingServer: false, timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
