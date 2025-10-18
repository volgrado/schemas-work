
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const lang = event.url.pathname.split('/')[1];

  if (lang === 'en' || lang === 'es') {
    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html.replace('%lang%', lang),
    });
  }

  const browserLang = event.request.headers.get('accept-language')?.split(',')[0].split('-')[0] || 'en';

  return new Response(undefined, {
    status: 302,
    headers: {
      location: `/${browserLang}${event.url.pathname}`,
    },
  });
};
