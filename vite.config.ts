/**
 * @file vite.config.ts
 * @description
 * The main configuration file for Vite, the build tool and development server.
 * This file configures:
 * - The SvelteKit plugin for handling Svelte components and routing.
 * - The Vitest plugin for running unit tests.
 * - Svelte Testing Library integration for component testing.
 * - Build settings (targets, minification).
 * - Test environment settings (globals, jsdom, setup files).
 */
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
	plugins: [
		// Enables SvelteKit framework support
		sveltekit(),
		// Enables testing support for Svelte components
		svelteTesting()
	],
	build: {
		// Target modern browsers (ESNext) for smaller bundles and better performance
		target: 'esnext',
		// Use esbuild for fast minification
		minify: 'esbuild',
		// Disable sourcemaps in production for security and size
		sourcemap: false
	},
	test: {
		// Enable global test APIs (describe, it, expect) without imports
		globals: true,
		// Use JSDOM to simulate a browser environment for component tests
		environment: 'jsdom',
		// Define which files are considered tests
		include: ['src/**/*.{test,spec}.{js,ts}'],
		// Path to the test setup file (runs before tests)
		setupFiles: ['./vitest-setup-client.ts']
	}
});
