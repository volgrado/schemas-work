<script lang="ts">
  import { get } from 'svelte/store';
  import { t } from '$lib/utils/i18n';
  
  // --- Stores ---
  import { uiState, openCommandBar, closeModal, setActiveView, cycleColorMode } from '$lib/stores/uiStore.svelte';
  import { reviewState, startReview } from '$lib/stores/reviewStore.svelte';
  import { open as openCardEditor } from '$lib/modules/editor/ui/cardEditorStore.svelte';
  import { documentState } from '$lib/stores/documentStore.svelte';
  
  // --- Core Components ---
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import WorkspaceView from '$lib/components/layout/WorkspaceView.svelte';
  import TTSController from '$lib/modules/tts/ui/TTSController.svelte';
  import SlashMenuController from '$lib/modules/editor/ui/SlashMenuController.svelte';
  import FloatingActionButton from '$lib/core/ui/FloatingActionButton.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Modal from '$lib/core/ui/Modal.svelte';
  import Spinner from '$lib/core/ui/Spinner.svelte';

  // --- Props ---
  let { onShowWelcome } = $props<{ onShowWelcome: () => void }>();

  // --- Derived ---
  const config = $derived(uiState.modal.config);

  // --- Actions ---
  function toggleView() {
    uiState.activeView = uiState.activeView === 'editor' ? 'tree' : 'editor';
  }

</script>

{#if reviewState.isReviewing && reviewState.isUiVisible}
  {#await import('$lib/components/review/ReviewController.svelte') then { default: ReviewController }}
    <ReviewController />
  {:catch error}
    <div class="error-state">
      <p>Error loading review controller: {error.message}</p>
    </div>
  {/await}
{:else}
  <div class="main-app-container">
    <AppHeader
      show={true}
      on:showWelcome={onShowWelcome}
    >
      <div class="header-actions">
        <Button
          id="color-mode-toggle"
          variant="icon"
          onclick={cycleColorMode}
          aria-label={$t('visualization.color_mode.aria_label')}
          title={$t(`visualization.color_mode.${uiState.colorMode.replace('-', '_')}`)}
        >
          {#if uiState.colorMode === 'by-level'}
            <Icon name="layers" size={18} />
          {:else if uiState.colorMode === 'by-path'}
            <Icon name="git-branch" size={18} />
          {:else}
            <Icon name="pen-tool" size={18} />
          {/if}
        </Button>

        <Button
          id="view-toggle-graph"
          variant="icon"
          onclick={toggleView}
          aria-label={uiState.activeView === 'editor'
            ? $t('page.view_toggle.aria_label.to_tree')
            : $t('page.view_toggle.aria_label.to_editor')}
        >
          {#if uiState.activeView === 'editor'}
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

    <!-- WorkspaceView now uses uiState internally, so no need to pass currentView -->
    <WorkspaceView />

    <!-- Lazy Load Card Editor -->
    {#await import('$lib/modules/editor/ui/CardEditorPanel.svelte') then { default: CardEditorPanel }}
       <CardEditorPanel />
    {/await}

    <TTSController />
    <SlashMenuController />

    <FloatingActionButton
      id="ai-strategy-btn"
      icon="command"
      label={$t('page.fab.menu')}
      position="right"
      onclick={openCommandBar}
    />

    {#if uiState.modal.show && config}
      {#if config.type === 'formula'}
        {#await import('$lib/modules/editor/ui/FormulaEditorModal.svelte') then { default: FormulaEditorModal }}
          {#if config.onsave}
            <FormulaEditorModal
              bind:show={uiState.modal.show}
              nodePos={config.nodePos}
              nodeType={config.nodeType}
              initialFormula={config.initialFormula}
              onsave={config.onsave}
            />
          {/if}
        {/await}
      {:else if config.type === 'media'}
        <Modal
          bind:show={uiState.modal.show}
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
  .error-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    color: var(--color-danger);
  }
</style>
