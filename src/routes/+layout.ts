/**
 * @file src/routes/+layout.ts
 * @description This is the root load function for the entire application.
 *
 * It explicitly disables Server-Side Rendering (SSR) for the whole app,
 * turning it into a pure Single-Page Application (SPA). This is a critical
 * architectural choice for an offline-first, client-side heavy application
 * that relies on browser APIs like IndexedDB, localStorage, and the Web Crypto API.
 */

// This line is the most important fix. It disables SSR.
export const ssr = false;

// This tells SvelteKit to build all pages as static .html files during the build process.
export const prerender = true;
