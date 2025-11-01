// svelte.config.js

import adapter from '@sveltejs/adapter-cloudflare'; // <--- CAMBIO 1: Importamos el nuevo adaptador
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // Usamos el adaptador de Cloudflare para desplegar en su plataforma.
    adapter: adapter({
      // <--- CAMBIO 2: Usamos el nuevo adaptador
      // ¡ESTA ES LA LÍNEA MÁS IMPORTANTE PARA UNA SPA EN CLOUDFLARE!
      // Esto le dice a Cloudflare que todas las rutas ('/*') deben ser manejadas
      // por la lógica de tu aplicación (sirviendo el index.html), excepto
      // los archivos que ya existen físicamente ('<all>'), como imágenes o CSS.
      // Es el equivalente al 'fallback: "index.html"' del adaptador estático.
      routes: {
        include: ['/*'],
        exclude: ['<all>'],
      },
    }),

    alias: {
      $lib: 'src/lib',
    },
  },
};

export default config;
