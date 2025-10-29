// svelte.config.js

import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // vitePreprocess es el preprocesador recomendado para SvelteKit.
  // Permite usar cosas como TypeScript o SCSS en tus componentes Svelte.
  preprocess: vitePreprocess(),

  kit: {
    // ESTA ES LA CLAVE DE LA MIGRACIÓN:
    // Usamos el adaptador de Cloudflare. Este adaptador es inteligente y sabe
    // cómo separar tu código en dos partes:
    // 1. Los activos estáticos (frontend) que se sirven desde la CDN de Cloudflare.
    // 2. Las funciones del servidor (tus APIs) que se despliegan como Cloudflare Functions.
    adapter: adapter({
      // Las opciones por defecto suelen ser suficientes.
      // Estas reglas le dicen a Cloudflare que todas las rutas deben ser gestionadas
      // por la lógica de SvelteKit, excepto los archivos estáticos.
      routes: {
        include: ['/*'],
        exclude: ['<all_static_assets>'],
      },
    }),

    // Es una buena práctica definir explícitamente el alias para tu directorio $lib.
    alias: {
      $lib: 'src/lib',
    },
  },
};

export default config;
