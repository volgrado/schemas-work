import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		svelteTesting()
	],
	build: {
		target: 'esnext',
		minify: 'esbuild',
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// Separate large vendor libraries for better caching
					if (id.includes('node_modules')) {
						// Group Tiptap packages together
						if (id.includes('@tiptap/')) {
							return 'vendor-tiptap';
						}
						// Group Y.js and related packages
						if (id.includes('yjs') || id.includes('y-indexeddb') || id.includes('y-prosemirror')) {
							return 'vendor-yjs';
						}
						// Dexie for IndexedDB operations
						if (id.includes('dexie')) {
							return 'vendor-dexie';
						}
						// D3 modules (tree-shaken)
						if (id.includes('d3-')) {
							return 'vendor-d3';
						}
						// KaTeX (lazy loaded but when loaded, separate chunk)
						if (id.includes('katex')) {
							return 'vendor-katex';
						}
						// All other node_modules
						return 'vendor';
					}
				}
			}
		}
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['./vitest-setup-client.ts']
	}
});
