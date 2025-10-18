// src/hooks.server.ts

import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const lang = event.url.pathname.split('/')[1];

  if (lang === 'en' || lang === 'es') {
    return resolve(event, {
      transformPageChunk: ({ html }) => html.replace('%lang%', lang),
    });
  }

  // This part handles the redirect for users visiting the root.
  // We check if we are building the app, and if so, we don't redirect.
  if (!building) {
    const browserLang =
      event.request.headers
        .get('accept-language')
        ?.split(',')[0]
        .split('-')[0] || 'en';

    return new Response(undefined, {
      status: 302,
      headers: {
        location: `/${browserLang}${event.url.pathname}`,
      },
    });
  }

  return resolve(event);
};
