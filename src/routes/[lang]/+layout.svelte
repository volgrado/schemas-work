<!--
  @component
  [lang]/+layout.svelte

  This is the root layout for the application, wrapping all pages that include a language
  parameter in their route. Its primary responsibilities are to set up global services,
  synchronize application state with the URL, and provide a consistent shell for all pages.

  Key Responsibilities:
  - **Internationalization (i18n):** Sets and synchronizes the application's locale based on the `[lang]` URL parameter.
  - **Global Error Handling:** Establishes a global error boundary using `window.onerror` and `window.onunhandledrejection` to catch and report all uncaught exceptions and promise rejections.
  - **State Synchronization:** Uses Svelte 5 runes (`$effect`) to reactively update the i18n locale when the URL changes.
  - **Root HTML Configuration:** Sets the `lang` attribute on the `<html>` element for accessibility and SEO.
  - **Forced Remounting:** Uses a `{#key}` block to ensure child components are fully remounted during certain navigations, which can help prevent stale state issues.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import '$lib/styles/app.css';
  import * as errorService from '$lib/services/core/errorService';

  // --- Stores ---
  import { editorStore } from '$lib/stores/editorStore';
  import { locale } from '$lib/utils/i18n';

  // --- Props (Svelte 5 style) ---
  // `data` is passed from the corresponding `+layout.ts` load function.
  let { data } = $props();

  // A state variable used to force re-rendering of the slot content.
  let key = $state(0);

  // This effect forces the key to update on every render, triggering a remount of the child slot.
  $effect(() => {
    key = Date.now();
  });

  /**
   * This reactive effect ensures that the `locale` store is always
   * in sync with the `lang` parameter from the URL. It runs whenever `data.lang` changes.
   */
  $effect(() => {
    if (browser) {
      locale.set(data.lang);
    }
  });

  // --- DEBUG: Global Store Listener ---
  // This reactive effect is a debugging tool to monitor the state of the editor.
  // It logs the entire `editorStore` to the console whenever it changes.
  $effect(() => {
    console.log('[GLOBAL LAYOUT] editorStore has changed:', $editorStore);
  });

  /**
   * This effect sets up global error handling for the entire application.
   * It runs once on component mount on the client-side.
   * The returned function serves as a cleanup, restoring the original handlers on unmount.
   */
  $effect(() => {
    // Must be protected from running during server-side rendering (SSR).
    if (!browser) {
      return;
    }

    // --- Setup Logic ---
    const originalOnError = window.onerror;
    const originalOnUnhandledRejection = window.onunhandledrejection;

    // Catches uncaught runtime errors.
    window.onerror = (message, source, lineno, colno, error) => {
      errorService.reportError(error || new Error(message.toString()), {
        source,
        lineno,
        colno,
        type: 'window.onerror',
      });
      if (originalOnError) {
        return originalOnError.call(
          window,
          message,
          source,
          lineno,
          colno,
          error
        );
      }
      // Prevent the default browser error console in production.
      return !import.meta.env.DEV;
    };

    // Catches unhandled promise rejections.
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      errorService.reportError(event.reason, { type: 'unhandledrejection' });
      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection.call(window, event);
      }
      // Prevent default browser handling in production.
      if (!import.meta.env.DEV) {
        event.preventDefault();
      }
    };

    // --- Cleanup Logic ---
    // This function is automatically executed when the layout is unmounted.
    return () => {
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    };
  });
</script>

<svelte:head>
  <html lang={data.lang} />
</svelte:head>

<!--
  The `{#key}` block is a Svelte construct that destroys and recreates its contents
  whenever the value of the `key` expression changes. Here, it forces the entire
  page content (`<slot/>`) to be remounted on each navigation, ensuring a clean state.
-->
{#key key}
  <slot />
{/key}
