// src/routes/+layout.ts

import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';

/**
 * The unique key in localStorage used to remember if the user has already
 * seen and bypassed the welcome screen.
 */
const WELCOME_KEY = 'schemas-work-has-seen-welcome';

export const ssr = false;

/**
 * The SvelteKit `load` function runs on the server and/or the client
 * before the `+layout.svelte` component is rendered. Its purpose is
 * to provide data to the layout and all nested pages.
 *
 * In this case, its sole responsibility is to check if it is the user's
 * first visit to decide whether to show the onboarding screen.
 */
export const load: LayoutLoad = () => {
  let showWelcome = false;

  // This logic can only run in the browser, where localStorage
  // is available. During server-side rendering (SSR), `browser` is `false`.
  if (browser) {
    // If the key is NOT found in localStorage, it means the user
    // has never clicked the "Get Started" button on the welcome screen.
    if (!localStorage.getItem(WELCOME_KEY)) {
      showWelcome = true;
    }
  }

  // The object returned here will be available in `+layout.svelte` and `+page.svelte`
  // through the `export let data` prop.
  return {
    showWelcome,
  };
};
