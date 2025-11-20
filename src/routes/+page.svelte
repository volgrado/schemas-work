<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t } from '$lib/utils/i18n';
  import { load as loadDocument, create as createDocument } from '$lib/stores/documentStore.svelte';
  import * as directoryService from '$lib/services/core/directoryService';
  import { WELCOME_SEEN_KEY } from '$lib/constants';
  import MainApp from '$lib/components/app/MainApp.svelte';

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
      const lastActiveId = await directoryService.getLastActiveDocId();
      if (lastActiveId) {
        console.log('[+page] Loading last active doc:', lastActiveId);
        await loadDocument(lastActiveId);
      } else {
        console.log('[+page] No last active doc, checking all items');
        const allSchemas = (await directoryService.getAllItems()).filter(
          (i) => i.type === 'schema'
        );
        if (allSchemas.length > 0) {
          console.log('[+page] Loading first available schema:', allSchemas[0].id);
          await loadDocument(allSchemas[0].id);
        } else {
          console.log('[+page] No schemas found, creating new one');
          await createDocument(get(t)('document.first_schema_title'));
        }
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
    {#await import('$lib/components/layout/WelcomeAnimator.svelte') then { default: WelcomeAnimator }}
      <WelcomeAnimator oncomplete={handleIntroComplete} />
    {/await}
  {:else}
    {#await import('$lib/components/layout/WelcomeScreen.svelte') then { default: WelcomeScreen }}
      <WelcomeScreen onstart={onWelcomeAnimationComplete} />
    {/await}
  {/if}
{:else if showMainUI}
  <MainApp onShowWelcome={() => {
    showMainUI = false;
    showWelcomeUI = true;
  }} />
{/if}
