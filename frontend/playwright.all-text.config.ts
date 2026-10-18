import { defineConfig, devices } from '@playwright/test'

// "Read every text" run: opens every page against sample data built from the API schemas, so no backend
// or database is needed. Uses its own dev server on 5181 so it never shares one with a developer's
// server on 5173, and points that server's API proxy at a dead port so nothing can reach a real backend.
const PORT = 5181

export default defineConfig({
  testDir: './e2e-text',
  fullyParallel: true,
  workers: 2,
  // One retry absorbs a cold Vite dev server re-optimising dependencies mid-run; a retried pass shows as "flaky".
  retries: 1,
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  globalSetup: './e2e-text/global-setup.ts',
  globalTeardown: './e2e-text/global-teardown.ts',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { DEV_API_PROXY_TARGET: 'http://127.0.0.1:9' },
  },
})
