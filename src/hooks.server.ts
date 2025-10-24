// src/hooks.server.ts
/**
 * @file Server-side hooks for SvelteKit.
 *
 * This file configures server-side hooks that are used to intercept and modify
 * requests and responses. This is primarily used for setting the `lang` attribute
 * on the HTML element based on the current route.
 */
import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

/**
 * Handles incoming requests and sets the language attribute on the HTML element.
 *
 * @param {object} params - The request handler parameters.
 * @param {Request} params.event - The request event object.
 * @param {function} params.resolve - The function to resolve the request.
 * @returns {Promise<Response>} The response.
 */
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
