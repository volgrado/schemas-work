<script lang="ts">
  import { onMount } from 'svelte';
  import MainLayout from '$lib/core/ui/layout/MainLayout.svelte';
  import { fileSystemStore } from '$lib/modules/file-system/stores/fileSystemStore.svelte';
  import {
    create as createDocument,
    load as loadDocument,
  } from '$lib/modules/editor/ui/documentStore.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';
  import { WELCOME_SEEN_KEY } from '$lib/constants';

  let showWelcomeUI = $state(false);
  let showMainUI = $state(false);
  let showIntroAnimation = $state(false);

  onMount(async () => {
    if (!localStorage.getItem(WELCOME_SEEN_KEY)) {
      showWelcomeUI = true;
      if (!localStorage.getItem('intro-animation-seen')) {
        showIntroAnimation = true;
      }
    } else {
      showMainUI = true;
      await initialDocumentLoad();
    }
  });

  async function initialDocumentLoad() {
    console.log('[+page] initialDocumentLoad started');
    try {
      // 1. Check URL for docId
      const urlParams = new URLSearchParams(window.location.search);
      const docIdFromUrl = urlParams.get('docId');

      if (docIdFromUrl) {
        await loadDocument(docIdFromUrl);
        return;
      }

      // 2. Check last active document
      const lastActiveId = fileSystemStore.getLastActiveDocId();
      if (lastActiveId) {
        const exists = fileSystemStore.getItem(lastActiveId);
        if (exists) {
          console.log('[+page] Loading last active doc:', lastActiveId);
          await loadDocument(lastActiveId);
          return;
        }
      }

      console.log('[+page] No last active doc, checking all items');
      const allSchemas = fileSystemStore
        .getAll()
        .filter((i: any) => i.type === 'schema');

      if (allSchemas.length > 0) {
        console.log(
          '[+page] Loading first available schema:',
          allSchemas[0].id
        );
        await loadDocument(allSchemas[0].id);
      } else {
        console.log('[+page] No schemas found, creating new one');
        await createDocument(i18n.t('document.first_schema_title'));
      }
    } catch (error) {
      console.error('[+page] initialDocumentLoad failed:', error);
    }
  }

  function onWelcomeAnimationComplete() {
    console.log('[+page] onWelcomeAnimationComplete triggered');
    showWelcomeUI = false;
    showMainUI = true;
    localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    initialDocumentLoad();
  }

  function handleIntroComplete() {
    localStorage.setItem('intro-animation-seen', 'true');
    showIntroAnimation = false;
    // Automatically proceed to the main app after the intro animation
    onWelcomeAnimationComplete();
  }
</script>

{#if showWelcomeUI}
  {#if showIntroAnimation}
    {#await import('$lib/core/ui/layout/WelcomeAnimator.svelte') then { default: WelcomeAnimator }}
      <WelcomeAnimator oncomplete={handleIntroComplete} />
    {/await}
  {:else}
    {#await import('$lib/core/ui/layout/WelcomeScreen.svelte') then { default: WelcomeScreen }}
      <WelcomeScreen onstart={onWelcomeAnimationComplete} />
    {/await}
  {/if}
{:else if showMainUI}
  <MainLayout
    onShowWelcome={() => {
      showMainUI = false;
      showWelcomeUI = true;
    }}
  />
{/if}
