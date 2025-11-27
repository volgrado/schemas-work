import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
    }),
    alias: {
      $lib: 'src/lib',
      '@core': 'src/lib/core',
      '@modules': 'src/lib/modules',
      '@ui': 'src/lib/core/ui',
    },
  },

  compilerOptions: {
    // --- ADD THIS LINE ---
    runes: true,

    // Your existing compatibility option is still needed for Tiptap
    compatibility: {
      componentApi: 4,
    },
  },
};

export default config;
