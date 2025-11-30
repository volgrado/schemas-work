/**
 * @file vite.config.ts
 * @description
 * The main configuration file for Vite.
 * Updated to include Cross-Origin headers for Local LLM (WebGPU) support.
 */
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [
    // Enables SvelteKit framework support
    sveltekit(),
    // Enables testing support for Svelte components
    svelteTesting(),
  ],

  // -----------------------------------------------------------------------
  // 🚀 NEW: Server Configuration for Local AI (SharedArrayBuffer)
  // -----------------------------------------------------------------------
  server: {
    headers: {
      // These two headers are MANDATORY for MediaPipe/WebGPU to work.
      // They enable "Cross-Origin Isolation" allowing high-memory usage.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    // Ensure Vite can serve the model files from your static/public folder
    fs: {
      allow: ['.'] 
    }
  },

  build: {
    // Target modern browsers (ESNext) for smaller bundles and better performance
    target: 'esnext',
    // Use esbuild for fast minification
    minify: 'esbuild',
    // Disable sourcemaps in production for security and size
    sourcemap: false,
  },
  test: {
    // Enable global test APIs (describe, it, expect) without imports
    globals: true,
    // Use JSDOM to simulate a browser environment for component tests
    environment: 'jsdom',
    // Define which files are considered tests
    include: ['src/**/*.{test,spec}.{js,ts}'],
    // Path to the test setup file (runs before tests)
    setupFiles: ['./vitest-setup-client.ts'],
  },
});