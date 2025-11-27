/**
 * @file setupTests.ts
 * @description
 * Legacy or alternate setup file for Jest/Vitest DOM testing.
 * Ensures that `@testing-library/jest-dom` matchers are available globally.
 * This is often redundant if `vitest-setup-client.ts` is used, but kept for compatibility.
 */

import '@testing-library/jest-dom';
