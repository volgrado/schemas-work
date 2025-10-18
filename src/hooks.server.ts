// src/hooks.server.ts

import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const lang = event.url.pathname.split('/')[1];

  // This part remains, as it's needed for setting the `lang` attribute on the HTML.
  if (lang === 'en' || lang === 'es') {
    return resolve(event, {
      transformPageChunk: ({ html }) => html.replace('%lang%', lang),
    });
  }

  // The server-side redirect logic is no longer needed and has been removed.
  // The root route will now be handled by src/routes/+page.svelte.

  return resolve(event);
};
