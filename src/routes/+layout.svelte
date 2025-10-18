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
