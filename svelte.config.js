import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // Opciones por defecto para el despliegue estático
      pages: 'build',
      assets: 'build',

      // Punto clave para una SPA: todas las rutas deben apuntar al mismo archivo HTML
      fallback: 'index.html',

      precompress: false,
      strict: true,
    }),
  },
};

export default config;
