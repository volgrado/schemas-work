<!--
  @file src/routes/+layout.svelte
  @description The root layout for the entire single-page application.
  It provides the global "app shell" components and integrates the Media Session API
  for native OS control of the Text-to-Speech feature.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import { theme, applyTheme } from '$lib/stores/themeStore';

  // --- NEW IMPORTS for Media Session ---
  import { ttsStore } from '$lib/stores/ttsStore';
  import { documentStore } from '$lib/stores/documentStore';

  // --- STYLES ---
  import '$lib/styles/app.css';

  // Apply the theme class to the root element whenever the theme store changes.
  $: if (browser && $theme) {
    applyTheme($theme);
  }

  // --- Media Session API Integration ---
  // This section connects the application's TTS state to the operating system's
  // native media controls (e.g., lock screen, notification shade, keyboard keys).

  /**
   * Updates the metadata displayed in the OS media panel.
   * This includes the title, album, artist, and artwork.
   */
  function updateMediaSessionMetadata() {
    if (!browser || !('mediaSession' in navigator)) return;

    const state = $ttsStore;

    // Only show the media panel if audio is actively playing or paused.
    if (state.status === 'playing' || state.status === 'paused') {
      const currentNode = state.nodesToRead[state.currentNodeIndex];

      // Get metadata from stores, with safe fallbacks.
      const documentTitle = $documentStore.metadata?.title || 'Document';
      const nodeTitle = currentNode ? currentNode.title : 'Loading...';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: nodeTitle,
        artist: 'Schemas.Work', // Your app's name
        album: documentTitle,
        // IMPORTANT: You must provide your own artwork files in the `/static/icons/` folder.
        // The browser will select the most appropriate size for the context.
        artwork: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    } else {
      // Clear metadata to remove the media panel when playback stops.
      navigator.mediaSession.metadata = null;
    }
  }

  // This reactive block listens for any change in the TTS store.
  // It ensures the OS media panel is always in sync with the app's state.
  $: if (browser && 'mediaSession' in navigator) {
    const state = $ttsStore;

    // Update the playback state (affects the play/pause icon in the OS UI).
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

    // Refresh the displayed metadata (title, etc.).
    updateMediaSessionMetadata();
  }

  // onMount runs once when the app starts. We use it to set up the
  // action handlers that connect OS media buttons to our ttsStore functions.
  onMount(() => {
    if (browser && 'mediaSession' in navigator) {
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
