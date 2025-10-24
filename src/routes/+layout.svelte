<!--
  @file src/routes/+layout.svelte
  @description This is the root layout for the entire application. It acts as a shell that wraps every page.
  Its primary responsibility in this app is to handle the initial language-based redirect for users
  landing on the root URL ('/'). Based on the user's browser language, it redirects them to the
  appropriate language-specific path (e.g., '/en' or '/es'), ensuring they see the site in their
  preferred language from the start. This redirect logic has been moved to `+page.svelte` to
  centralize the root index functionality. This layout now simply renders the content of the
  matched route.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  onMount(() => {
    // Only run this on the initial load of the root page
    if ($page.route.id === '/') {
      const browserLang = navigator.language.split('-')[0];
      // Default to 'en' if the browser language is not 'es'
      const lang = browserLang === 'es' ? 'es' : 'en';
      // Use replaceState to avoid adding a back-button entry for the redirect
      goto(`/${lang}`, { replaceState: true });
    }
  });
</script>

<slot />
