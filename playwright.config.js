import { defineConfig, devices } from '@playwright/test'

// E2E tests run against the full running stack (frontend + backend + DB),
// started with `docker compose up -d`. They mirror the backend's Behat behaviour
// coverage at the UI level. See e2e/README or thelibrary/README.md for how to run.
export default defineConfig({
  testDir: './e2e',
  // The full play-through walks every phase, so allow generous time.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // Game state is global per backend, so keep runs serial and deterministic.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'list' : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Use the system-installed Google Chrome so no browser download is needed.
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: { args: ['--no-sandbox'] },
      },
    },
  ],
})
