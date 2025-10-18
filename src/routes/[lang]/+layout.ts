// src/routes/[lang]/+layout.ts

import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';

/**
 * The unique key in localStorage used to remember if the user has already
 * seen and bypassed the welcome screen.
 */
const WELCOME_KEY = 'schemas-work-has-seen-welcome';

// This is a client-side only app. We disable server-side rendering
// to ensure that browser-specific APIs like `localStorage` are always available.
export const ssr = false;

/**
 * @description This SvelteKit `load` function runs on the client-side before the root layout
 * component (`+layout.svelte`) is rendered. Its primary responsibilities are to determine the
 * initial UI state and to pass necessary data down to the component tree.
 *
 * @param {object} context - The SvelteKit load context object.
 * @param {object} context.params - An object containing the dynamic route parameters. In this case,
 * it will contain the `lang` parameter from the URL (e.g., `/en`).
 *
 * @returns {object} An object that becomes the `data` prop in the layout and all subsequent pages.
 * @property {string} lang - The language code extracted from the URL (e.g., 'en', 'es').
 * This is used to set the initial locale for the application.
 * @property {boolean} showWelcome - A boolean flag that determines if the initial welcome/
 * onboarding screen should be displayed. This is set to `true` if the `WELCOME_KEY` is not
 * found in the user's `localStorage`, indicating a first-time visit.
 */
export const load: LayoutLoad = ({ params }) => {
  let showWelcome = false;

  // This logic is guaranteed to run only in the browser because `ssr` is set to `false`.
  if (browser) {
    // If the key is NOT found in localStorage, it signifies the user's first session,
    // so we should display the welcome screen.
    if (!localStorage.getItem(WELCOME_KEY)) {
      showWelcome = true;
    }
  }

  // The returned object is passed as the `data` prop to `+layout.svelte`.
  return {
    lang: params.lang,
    showWelcome,
  };
};
