<!--
  @file src/routes/+layout.svelte
  @description The root layout for the application.
  This version implements the "Global Audio Element" pattern by creating a single <audio>
  element and setting its value in a dedicated Svelte store (`globalAudioElementStore`).
  This is the most robust solution for mobile browser audio.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import { theme, applyTheme } from '$lib/stores/themeStore';
  import { ttsStore } from '$lib/stores/ttsStore';
  import { documentStore } from '$lib/stores/documentStore';

  // --- NEW: Import the dedicated store for the audio element ---
  import { globalAudioElementStore } from '$lib/stores/globalAudioStore';

  // --- STYLES ---
  import '$lib/styles/app.css';

  // Apply theme from store
  $: if (browser && $theme) {
    applyTheme($theme);
  }

  // --- GLOBAL AUDIO ELEMENT PATTERN ---
  // This variable will be bound to the <audio> element in the HTML.
  let audioEl: HTMLAudioElement;

  // This function "unlocks" the audio context after the first user interaction.
  function unlockAudio() {
    if (audioEl && audioEl.paused) {
      // The play() call is expected to fail or do nothing if there's no source,
      // but it successfully signals to the browser that a user gesture initiated audio.
      audioEl.play().catch(() => {});
      // We immediately pause it.
      audioEl.pause();
      console.log('Global audio context unlocked by user gesture.');
    }
  }

  onMount(() => {
    // Once the <audio> element is mounted in the DOM, set the store's value.
    // The ttsStore subscribes to this store and will initialize its service when this is set.
    globalAudioElementStore.set(audioEl);

    // Add a one-time event listener to unlock the audio on the first tap/click anywhere.
    // This is crucial for mobile browser compatibility.
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    // Media Session API Setup
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () =>
        ttsStore.resumeReading()
      );
      navigator.mediaSession.setActionHandler('pause', () =>
        ttsStore.pauseReading()
      );
      navigator.mediaSession.setActionHandler('stop', () =>
        ttsStore.stopReading()
      );
      navigator.mediaSession.setActionHandler('nexttrack', () =>
        ttsStore.nextNode()
      );
      navigator.mediaSession.setActionHandler('previoustrack', () =>
        ttsStore.previousNode()
      );
    }
  });

  // --- Media Session API Integration ---
  $: if (browser && 'mediaSession' in navigator) {
    const state = $ttsStore;
    switch (state.status) {
      case 'playing':
        navigator.mediaSession.playbackState = 'playing';
        break;
      case 'paused':
        navigator.mediaSession.playbackState = 'paused';
        break;
      default:
        navigator.mediaSession.playbackState = 'none';
        break;
    }

    if (state.status === 'playing' || state.status === 'paused') {
      const currentNode = state.nodesToRead[state.currentNodeIndex];
      const documentTitle = $documentStore.metadata?.title || 'Document';
      const nodeTitle = currentNode ? currentNode.title : 'Loading...';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: nodeTitle,
        artist: 'Schemas.Work',
        album: documentTitle,
        artwork: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    } else {
      navigator.mediaSession.metadata = null;
    }
  }
</script>

<svelte:head>
  <title>Schemas.Work</title>
</svelte:head>

<!-- This is the single, persistent audio element for the entire application. -->
<!-- It's bound to our `audioEl` variable and hidden from view. -->
<audio bind:this={audioEl} playsinline style="display:none;"></audio>

<!-- Global UI Components -->
<Toaster position="bottom-center" />
<OrganicCanvas />
<slot />
<CommandBar />
