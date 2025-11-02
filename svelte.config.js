// svelte.config.js

import adapter from '@sveltejs/adapter-cloudflare';
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

  // ==========================================================
  // --- VVVV THIS BLOCK IS CRITICAL - VERIFY IT EXISTS VVVV ---
  // ==========================================================
  compilerOptions: {
    compatibility: {
      // This enables the Svelte 4 Component API (`new Component(...)`)
      // which is required for Tiptap's vanilla JS Node Views.
      componentApi: 4,
    },
  },
  // ==========================================================
  // --- ^^^^ THIS BLOCK IS CRITICAL - VERIFY IT EXISTS ^^^^ ---
  // ==========================================================
};

export default config;
