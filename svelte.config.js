// svelte.config.js

import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>'],
      },
    }),
    alias: {
      $lib: 'src/lib',
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
