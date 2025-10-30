// svelte.config.js

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // Usamos el adaptador estático para generar archivos HTML, CSS y JS.
    adapter: adapter({
      // Las opciones por defecto suelen ser 'build' para pages y assets.
      pages: 'build',
      assets: 'build',

      // ¡ESTA ES LA LÍNEA MÁS IMPORTANTE PARA UNA SPA!
      // Le dice al servidor que si una ruta como /document/xyz no existe como
      // un archivo, debe servir el archivo principal 'index.html'. Esto permite
      // que el enrutador del lado del cliente de SvelteKit se haga cargo.
      fallback: 'index.html',

      // Opciones adicionales, los valores por defecto suelen estar bien.
      precompress: false,
    }),

    alias: {
      $lib: 'src/lib',
    },
  },
};

export default config;
