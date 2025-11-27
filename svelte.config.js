/**
 * @file svelte.config.js
 * @description
 * The SvelteKit configuration file.
 * This file handles:
 * - Preprocessing (using Vite).
 * - Adapter configuration (for static site generation).
 * - Alias definitions (mapping shortcuts like `$lib` to directories).
 * - Compiler options (enabling Svelte 5 Runes).
 */
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Use Vite to preprocess Svelte components (handles TypeScript, SCSS, etc.)
  preprocess: vitePreprocess(),

  kit: {
    // Configure the adapter for static site generation (SSG)
    // This builds the app into a simple collection of HTML/CSS/JS files
    // suitable for hosting on any static file server (GitHub Pages, Vercel, etc.)
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html', // Required for SPA routing behavior
      precompress: false,
    }),

    // Define path aliases for cleaner imports
    alias: {
      $lib: 'src/lib',
      '@core': 'src/lib/core',
      '@modules': 'src/lib/modules',
      '@ui': 'src/lib/core/ui',
    },
  },

  compilerOptions: {
    // Enable Svelte 5 Runes mode
    runes: true,

    // Compatibility options (required for Tiptap integration in some cases)
    compatibility: {
      componentApi: 4,
    },
  },
};

export default config;
