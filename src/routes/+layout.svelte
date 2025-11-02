<!--
  @file src/routes/+layout.svelte.
  @description The root layout for the application.
  This component is responsible for triggering the initialization of global, client-side services
  like the TTS engine. It composes the global UI but contains no business logic.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import { theme, applyTheme } from '$lib/stores/themeStore';
  import { ttsStore } from '$lib/stores/ttsStore';

  // --- STYLES ---
  import '$lib/styles/app.css';

  // --- REACTIVITY ---

  // Apply theme from store reactively on the client-side.
  // The `browser` check ensures this logic never runs during SSR.
  $: if (browser && $theme) {
    applyTheme($theme);
  }

  // onMount is Svelte's lifecycle hook for client-side-only code,
  // making it the perfect place to initialize browser-specific APIs.
  onMount(() => {
    // --- Step 1: Initialize the TTS System ---

    // Initialize the ttsStore. This call "wakes up" the store.
    // The store is now fully self-contained and will create its own private audio
    // element internally, as per our final architectural decision.
    ttsStore.initialize();

    // --- Step 2: Unlock Audio Context for Mobile Browsers ---

    // This is a crucial step for iOS and other mobile browsers that require a user
    // gesture to enable audio playback for BOTH the <audio> element and window.speechSynthesis.
    const unlockAudioContext = () => {
      // Create a silent, empty audio buffer to play. This is the most reliable
      // way to activate the Web Audio API context across all browsers.
      const context = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      if (context.state === 'suspended') {
        context.resume();
      }

      // Also trigger a silent utterance for SpeechSynthesis to unlock it.
      const utterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(utterance);

      console.log('[Layout] Global audio context unlocked by user gesture.');

      // Note: The { once: true } option automatically removes the event listener
      // after it has been called once. No manual cleanup is needed.
    };

    // Listen for the first user interaction to unlock the audio.
    window.addEventListener('click', unlockAudioContext, { once: true });
    window.addEventListener('touchstart', unlockAudioContext, { once: true });
  });
</script>

<svelte:head>
  <title>Schemas.Work</title>

  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
    integrity="sha384-n8MVd4RsNIU0KOVEMeaMurdcICHZodavIMpg9DGcbEFcV3FoDb4eAZcARndCjKZX"
    crossorigin="anonymous"
  />
</svelte:head>

<!--
  NOTE: The global <audio> element is not rendered here.
  It is created programmatically and managed privately by the ttsStore,
  ensuring it is never created during Server-Side Rendering (SSR).
  This keeps the DOM clean and the logic encapsulated.
-->

<!-- Global UI Components -->
<Toaster position="bottom-center" />
<OrganicCanvas />

<!-- The main content of each page is rendered here -->
<slot />

<CommandBar />
