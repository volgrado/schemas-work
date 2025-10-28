<!--
  @file src/routes/+layout.svelte
  @description The root layout for the entire single-page application.
  It provides the global "app shell" components that persist across all UI states.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import { theme, applyTheme } from '$lib/stores/themeStore';

  // --- STYLES ---
  // This is the crucial import that links the entire application's stylesheet.
  import '$lib/styles/app.css';

  // Apply the theme class to the root element whenever the theme store changes.
  $: if (browser && $theme) {
    applyTheme($theme);
  }
</script>

<svelte:head>
  <title>Schemas.Work</title>
</svelte:head>

<!-- Global toast notification component -->
<Toaster position="bottom-center" />

<!-- Animated background, always present -->
<OrganicCanvas />

<!-- The main content of the application, rendered by +page.svelte -->
<slot />

<!-- GLOBAL UI OVERLAYS -->
<!-- The CommandBar is a global overlay that can be triggered from anywhere. -->
<CommandBar />

<!-- ADD THIS LINE AT THE VERY BOTTOM -->
<audio id="background-audio-player" loop src="/silent.mp3"></audio>
