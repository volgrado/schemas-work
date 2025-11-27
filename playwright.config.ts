/**
 * @file playwright.config.ts
 * @description
 * Configuration file for Playwright End-to-End (E2E) testing.
 * This file defines:
 * - The web server to run before tests (building and serving the app).
 * - Test directories and execution settings (parallelism, retries).
 * - Browser configurations (Chromium, Firefox, WebKit, Mobile).
 * - Reporting and tracing settings.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Configure the local development server for testing
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI, // Reuse server if not in CI environment
  },

  // Directory where E2E tests are located
  testDir: 'e2e',

  // Run tests in parallel for faster execution
  fullyParallel: true,

  // Fail the build if `test.only` is left in the code (CI only)
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI to reduce flakiness
  retries: process.env.CI ? 2 : 0,

  // Limit workers in CI to prevent resource exhaustion
  workers: process.env.CI ? 1 : undefined,

  // Generate an HTML report of the test results
  reporter: 'html',

  use: {
    // Collect trace when retrying a failed test
    trace: 'on-first-retry',
    // Take a screenshot only when a test fails
    screenshot: 'only-on-failure',
    // Retain video recording only when a test fails
    video: 'retain-on-failure',
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
    },
  },

  // Define the browser projects to run tests against
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
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
