// svelte.config.js

import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // AÑADE ESTA SECCIÓN PARA RESOLVER EL ERROR DE CONSTRUCCIÓN
      compatibilityFlags: ['nodejs_compat'],
      compatibility_date: '2024-09-23',

      routes: {
        include: ['/*'],
        exclude: ['<all_static_assets>'],
      },
    }),

    alias: {
      $lib: 'src/lib',
    },
  },
};

export default config;
