<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { reviewState, startReview } from '$lib/stores/reviewStore.svelte';
  import { open as openCardEditor } from '$lib/stores/cardEditorStore.svelte';
  import { modalState, closeModal } from '$lib/stores/modalStore.svelte';
  import { open as openCommandBar } from '$lib/stores/commandBarStore.svelte';
  import { documentState, load as loadDocument, create as createDocument } from '$lib/stores/documentStore.svelte';

  // --- Components ---
  import WelcomeAnimator from '$lib/components/layout/WelcomeAnimator.svelte';
  import WelcomeScreen from '$lib/components/layout/WelcomeScreen.svelte';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import WorkspaceView from '$lib/components/layout/WorkspaceView.svelte';
  import ReviewController from '$lib/components/review/ReviewController.svelte';
  import CardEditorPanel from '$lib/components/card/CardEditorPanel.svelte';
  import TTSController from '$lib/components/tts/TTSController.svelte';
  import SlashMenuController from '$lib/components/editor/SlashMenuController.svelte';
  import FloatingActionButton from '$lib/components/ui/FloatingActionButton.svelte';
  import FormulaEditorModal from '$lib/components/editor/FormulaEditorModal.svelte';
  import { Button, Icon, Modal } from '$lib/components/ui';

  // --- Services & Utilities ---
  import * as directoryService from '$lib/services/core/directoryService';
  import { t } from '$lib/utils/i18n';
  import { WELCOME_SEEN_KEY, HINT_SEEN_KEY } from '$lib/constants';

  // --- Component State ---
  let showWelcomeUI = $state(false);
  let showMainUI = $state(false);
  let currentView = $state<'editor' | 'tree'>('editor');
  let showHint = $state(false);

  // Use a derived variable for the modal config for cleaner template logic.
  const config = $derived(modalState.config);

  // --- Lifecycle & Logic ---
  let showIntroAnimation = $state(false);

  onMount(async () => {
    if (!localStorage.getItem(WELCOME_SEEN_KEY)) {
      showWelcomeUI = true;
      // Check if we've seen the intro animation specifically
      if (!localStorage.getItem('intro-animation-seen')) {
        showIntroAnimation = true;
      }
    } else {
      showMainUI = true;
      await initialDocumentLoad();
    }
    if (!localStorage.getItem(HINT_SEEN_KEY)) {
      showHint = true;
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

  function dismissHint() {
    showHint = false;
    localStorage.setItem(HINT_SEEN_KEY, 'true');
  }

  function toggleView() {
    currentView = currentView === 'editor' ? 'tree' : 'editor';
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
    <WelcomeAnimator oncomplete={handleIntroComplete} />
  {:else}
    <WelcomeScreen 
      onstart={onWelcomeAnimationComplete}
    />
  {/if}
{/if}

{#if showMainUI}
  {#if reviewState.isReviewing && reviewState.isUiVisible}
    <ReviewController />
  {:else}
    <div class="main-app-container">
      <AppHeader
        show={true}
        on:showWelcome={() => {
          showMainUI = false;
          showWelcomeUI = true;
        }}
      >
        <div class="header-actions">
          <Button
            id="view-toggle-graph"
            variant="icon"
            onclick={toggleView}
            aria-label={currentView === 'editor'
              ? $t('page.view_toggle.aria_label.to_tree')
              : $t('page.view_toggle.aria_label.to_editor')}
          >
            {#if currentView === 'editor'}
              <Icon name="git-branch" size={18} />
            {:else}
              <Icon name="file-text" size={18} />
            {/if}
          </Button>
          {#if documentState.docId && !reviewState.isReviewing}
            <Button
              id="study-button"
              variant="icon"
              aria-label={$t('page.header_actions.study')}
              onclick={() => startReview([documentState.docId!])}
            >
              <Icon name="zap" size={18} />
            </Button>
            <Button
              id="cards-button"
              variant="icon"
              aria-label={$t('page.header_actions.cards')}
              onclick={() => openCardEditor(documentState.docId!)}
            >
              <Icon name="edit-3" size={18} />
            </Button>
          {/if}
        </div>
      </AppHeader>

      <WorkspaceView bind:currentView />

      <CardEditorPanel />
      <TTSController />
      <SlashMenuController />

      <FloatingActionButton
        id="ai-strategy-btn"
        icon="command"
        label={$t('page.fab.menu')}
        position="right"
        onclick={openCommandBar}
      />

      {#if modalState.show && config}
        {#if config.type === 'formula'}
          <!-- Render the FormulaEditorModal directly, as it contains its own <Modal> frame. -->
          {#if config.onsave}
            <FormulaEditorModal
              bind:show={modalState.show}
              nodePos={config.nodePos}
              nodeType={config.nodeType}
              initialFormula={config.initialFormula}
              onsave={config.onsave}
            />
          {/if}
        {:else if config.type === 'media'}
          <!-- For placeholder modals, use the generic <Modal> component as a wrapper. -->
          <Modal
            bind:show={modalState.show}
            title={$t('modals.media_editor_title')}
            onClose={closeModal}
          >
            <div style="padding: 1rem; text-align: center;">
              {$t('modals.media_editor_placeholder')}: {config.nodeType}
            </div>
          </Modal>
        {/if}
      {/if}
    </div>
  {/if}
{/if}

<style>
  .main-app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
</style>
