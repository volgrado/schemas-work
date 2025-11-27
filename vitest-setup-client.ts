/**
 * @file vitest-setup-client.ts
 * @description
 * Configuration file for setting up the Vitest test environment for client-side code.
 *
 * This file is run before each test file in the `jsdom` environment.
 * It primarily imports `@testing-library/jest-dom/vitest`, which extends Vitest's
 * `expect` with DOM-specific matchers (e.g., `toBeInTheDocument`, `toHaveClass`).
 */

import '@testing-library/jest-dom/vitest';
