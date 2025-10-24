<!--
  @file src/routes/+page.svelte
  @description This page component exclusively handles the root URL ('/'). Its single responsibility
  is to perform a client-side redirect to the user's preferred language path (e.g., '/en' or '/es').
  It inspects the browser's `navigator.language` to determine the best initial locale for the user,
  then uses SvelteKit's `goto` function to navigate them to the correct starting page. This approach
  ensures a smooth, automatic localization experience for first-time visitors. A simple "Loading..."
  message is displayed while the redirect is processed.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  onMount(() => {
    if (browser) {
      // Detect the user's browser language (e.g., 'es-ES' becomes 'es').
      const browserLang = navigator.language.split('-')[0];
      // Default to 'en' if the browser language is not one you explicitly support.
      const lang = browserLang === 'es' ? 'es' : 'en';

      // Redirect to the language-specific URL.
      // `replaceState: true` prevents this redirect from adding an entry to the browser's history,
      // so the user won't get stuck in a loop if they press the back button.
      goto(`/${lang}`, { replaceState: true });
    }
  });
</script>

<!-- You can add a simple loading message while the redirect happens -->
<div
  style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;"
>
  <p>Loading...</p>
</div>
