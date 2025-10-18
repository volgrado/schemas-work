// src/routes/[lang]/+layout.ts

import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';

const WELCOME_KEY = 'schemas-work-has-seen-welcome';

// This is a client-side only app.
export const ssr = false;

/**
 * This load function runs on the client-side before the root layout is rendered.
 */
export const load: LayoutLoad = ({ params, url }) => {
  let showWelcome = false;

  if (browser) {
    if (!localStorage.getItem(WELCOME_KEY)) {
      showWelcome = true;
    }
  }

  // The returned object is passed as the `data` prop to `+layout.svelte`.
  return {
    lang: params.lang,
    showWelcome,
    // Provide the pathname to fix the infinite re-render loop in the layout.
    pathname: url.pathname,
  };
};
