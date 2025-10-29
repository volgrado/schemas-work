<!--
  @file src/routes/+layout.svelte.
  @description The root layout for the application.
  This component is responsible for triggering the initialization of global, client-side services
  like the TTS engine and audio context. It composes the global UI but contains no business logic.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import { theme, applyTheme } from '$lib/stores/themeStore';
  import { ttsStore } from '$lib/stores/ttsStore';
  import { getGlobalAudioElement } from '$lib/stores/globalAudioStore';

  // --- STYLES ---
  import '$lib/styles/app.css';

  // Apply theme from store on client-side
  $: if (browser && $theme) {
    applyTheme($theme);
  }

  // onMount is Svelte's lifecycle hook for client-side-only code.
  onMount(() => {
    // --- Step 1: Initialize Global Services ---
    // Get the singleton audio element. This function is safe to call and will
    // create the element on the first run or return the existing one.
    const audioEl = getGlobalAudioElement();

    // Pass the audio element to the TTS store to initialize the entire TTS system.
    // The ttsStore will handle its own internal setup and the Media Session API integration.
    ttsStore.initialize(audioEl);

    // --- Step 2: Unlock Audio Context for Mobile Browsers ---
    // This is a crucial step for iOS and other mobile browsers that require a user
    // gesture to enable audio playback.
    const unlockAudio = () => {
      // The play() call is expected to fail or do nothing if there's no source,
      // but it successfully signals to the browser that a user gesture initiated audio.
      audioEl.play().catch(() => {});
      audioEl.pause();
      console.log('Global audio context unlocked by user gesture.');

      // The listeners are set with { once: true }, so they remove themselves automatically.
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
  });
</script>

<svelte:head>
  <title>Schemas.Work</title>
</svelte:head>

<!--
  NOTE: The global <audio> element is no longer needed here.
  It is created programmatically and managed by the globalAudioStore,
  ensuring it is never created during Server-Side Rendering (SSR).
-->

<!-- Global UI Components -->
<Toaster position="bottom-center" />
<OrganicCanvas />
<slot />
<CommandBar />
