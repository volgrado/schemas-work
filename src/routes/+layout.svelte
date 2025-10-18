<!-- src/routes/+layout.svelte (REFACTORED TO SVELTE 5 WITH RUNES) -->
<script lang="ts">
  import { browser } from '$app/environment';
  import '$lib/styles/app.css';
  import * as errorService from '$lib/services/core/errorService';

  // --- Store for Testing ---
  import { editorStore } from '$lib/stores/editorStore';

  // --- Props (Svelte 5 style) ---
  let { data } = $props();

  // --- TEST: Global Store Listener ---
  // This reactive effect is our key debugging tool.
  // It will run every time the value of `editorStore` changes.
  $effect(() => {
    // Subscription is automatic when using the '$' prefix
    console.log('[GLOBAL LAYOUT] editorStore has changed:', $editorStore);
  });

  // --- EFFECT: Global Error Handling (replaces onMount/onDestroy) ---
  // This effect runs once when the component is mounted on the client.
  // The returned function will be executed as cleanup when the component is unmounted.
  $effect(() => {
    // Effects that interact with browser APIs (window)
    // must be protected from running during server-side rendering (SSR).
    if (!browser) {
      return;
    }

    // --- "Setup" Logic ---
    const originalOnError = window.onerror;
    const originalOnUnhandledRejection = window.onunhandledrejection;

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
      // Return true to prevent default behavior in production
      return !import.meta.env.DEV;
    };

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      errorService.reportError(event.reason, { type: 'unhandledrejection' });
      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection.call(window, event);
      }
      if (!import.meta.env.DEV) {
        event.preventDefault();
      }
    };

    // --- "Cleanup" Logic ---
    // This function will be automatically executed when the layout is unmounted.
    return () => {
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    };
  });
</script>

<slot />
