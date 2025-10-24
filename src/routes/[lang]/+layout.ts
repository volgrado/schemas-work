/**
 * @file src/routes/[lang]/+layout.ts
 * @description This is the primary load function for all language-specific pages. It runs on the client-side
 * before the layout and page are rendered.
 *
 * Key Responsibilities:
 * 1.  **Disabling SSR**: It explicitly sets `export const ssr = false;`, turning the entire application into a
 *     Single-Page Application (SPA). This is a critical architectural choice for an offline-first,
 *     client-side heavy application that relies on browser APIs like IndexedDB and localStorage.
 * 2.  **Welcome Screen Logic**: It checks `localStorage` to see if the user has previously seen the
 *     welcome animation. If not, it sets the `showWelcome` flag to `true`. This data is then passed
 *     as a prop to the layout and page components to orchestrate the initial user experience.
 * 3.  **Passing Essential Data**: It extracts the `lang` parameter from the URL and passes it, along with the
 *     `showWelcome` flag and the `pathname`, to the `+layout.svelte` component. The `pathname` is
 *     specifically included to be used as a `key` for the slot, which is a Svelte best practice to
 *     ensure transitions are correctly triggered on navigation.
 */
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
