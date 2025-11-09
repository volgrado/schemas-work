<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import type { Node as ProseMirrorNode } from 'prosemirror-model';

  // --- UI Components ---
  import WelcomeAnimator from '$lib/components/layout/WelcomeAnimator.svelte';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import DocumentView from '$lib/components/editor/DocumentView.svelte';
  import SchemaTree from '$lib/components/tree/SchemaTree.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import ReviewController from '$lib/components/review/ReviewController.svelte';
  import CardEditorPanel from '$lib/components/card/CardEditorPanel.svelte';
  import TTSController from '$lib/components/tts/TTSController.svelte';
  import SlashMenuController from '$lib/components/editor/SlashMenuController.svelte';
  import FormulaEditorModal from '$lib/components/editor/FormulaEditorModal.svelte';
  import FloatingActionButton from '$lib/components/ui/FloatingActionButton.svelte';

  // --- Stores ---
  import { modalState, closeModal } from '$lib/stores/modalStore.svelte';
  import { open as openCommandBar } from '$lib/stores/commandBarStore.svelte';
  import {
    documentState,
    load as loadDocument,
    create as createDocument,
    setFocusCommand,
  } from '$lib/stores/documentStore.svelte';
  import { editorState, updateSelection } from '$lib/stores/editorStore.svelte';
  import { reviewState, startReview } from '$lib/stores/reviewStore.svelte';
  import { open as openCardEditor } from '$lib/stores/cardEditorStore.svelte';

  // --- Services & Utilities ---
  import * as schemaService from '$lib/services/features/schemaService';
  import * as directoryService from '$lib/services/core/directoryService';
  import { t } from '$lib/utils/i18n';

  // --- Component State ---
  let showWelcomeUI = $state(false);
  let showMainUI = $state(false);
  let currentView = $state<'editor' | 'tree'>('editor');
  let showHint = $state(false);

  // Use a derived variable for the modal config for cleaner template logic.
  const config = $derived(modalState.config);

  const WELCOME_KEY = 'schemas-work-has-seen-welcome';
  const HINT_KEY = 'schemas-work-has-seen-command-hint';

  // --- Lifecycle & Logic ---
  onMount(async () => {
    if (!localStorage.getItem(WELCOME_KEY)) {
      showWelcomeUI = true;
    } else {
      showMainUI = true;
      await initialDocumentLoad();
    }
    if (!localStorage.getItem(HINT_KEY)) {
      showHint = true;
    }
  });

  async function initialDocumentLoad() {
    const lastActiveId = await directoryService.getLastActiveDocId();
    if (lastActiveId) {
      await loadDocument(lastActiveId);
    } else {
      const allSchemas = (await directoryService.getAllItems()).filter(
        (i) => i.type === 'schema'
      );
      if (allSchemas.length > 0) {
        await loadDocument(allSchemas[0].id);
      } else {
        await createDocument(get(t)('document.first_schema_title'));
      }
    }
  }

  function onWelcomeAnimationComplete() {
    showWelcomeUI = false;
    showMainUI = true;
    localStorage.setItem(WELCOME_KEY, 'true');
    initialDocumentLoad();
  }

  function dismissHint() {
    showHint = false;
    localStorage.setItem(HINT_KEY, 'true');
  }

  function toggleView() {
    currentView = currentView === 'editor' ? 'tree' : 'editor';
  }

  let treeData = $state<ReturnType<
    typeof schemaService.documentToTreeData
  > | null>(null);

  $effect(() => {
    const revision = editorState.revision;
    const docStatus = documentState.status;
    const editorDoc = editorState.instance?.state.doc;

    if (docStatus === 'ready' && editorDoc) {
      const generatedTree = schemaService.documentToTreeData(editorDoc);
      treeData = generatedTree;
    } else {
      treeData = null;
    }
  });
</script>

{#if showWelcomeUI}
  <WelcomeAnimator oncomplete={onWelcomeAnimationComplete} />
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
            variant="icon"
            on:click={toggleView}
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
              variant="icon"
              aria-label={$t('page.header_actions.study')}
              on:click={() => startReview([documentState.docId!])}
            >
              <Icon name="zap" size={18} />
            </Button>
            <Button
              variant="icon"
              aria-label={$t('page.header_actions.cards')}
              on:click={() => openCardEditor(documentState.docId!)}
            >
              <Icon name="edit-3" size={18} />
            </Button>
          {/if}
        </div>
      </AppHeader>

      <main
        class="main-content"
        class:is-editor-view={currentView === 'editor'}
        class:is-tree-view={currentView === 'tree'}
      >
        {#if documentState.status === 'loading'}
          <div class="status-message">{$t('page.status.loading_schema')}</div>
        {:else if documentState.status === 'error'}
          <div class="status-message error">{$t('page.status.load_error')}</div>
        {:else if documentState.ydoc}
          {@const currentTreeData = treeData}

          <!-- Editor View Wrapper -->
          <div
            class="view-wrapper"
            style:display={currentView === 'editor' ? 'flex' : 'none'}
          >
            <div class="sheet-container">
              <DocumentView
                ydoc={documentState.ydoc}
                initialContent={documentState.initialContent}
                provider={documentState.provider}
              />
            </div>
          </div>

          <!-- Tree View Wrapper -->
          <div
            class="view-wrapper"
            style:display={currentView === 'tree' ? 'block' : 'none'}
          >
            <div class="tree-container">
              {#if currentTreeData}
                <SchemaTree
                  treeData={currentTreeData}
                  selectedNodeId={editorState.selectedNode?.attrs.nodeId ??
                    null}
                  on:nodeClick={(e) => {
                    const editor = editorState.instance;
                    if (editor) {
                      let foundPos: number | null = null;
                      editor.state.doc.descendants(
                        (node: ProseMirrorNode, pos: number) => {
                          if (node.attrs.nodeId === e.detail.id) {
                            foundPos = pos;
                            return false;
                          }
                          return true;
                        }
                      );
                      if (foundPos !== null) {
                        const node = editor.state.doc.nodeAt(foundPos);
                        if (node) updateSelection(node, foundPos);
                        setFocusCommand(e.detail.id);
                        currentView = 'editor';
                      }
                    }
                  }}
                />
              {:else}
                <div class="status-message">
                  {$t('page.status.generating_tree')}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </main>

      <CardEditorPanel />
      <TTSController />
      <SlashMenuController />

      {#if documentState.docId}
        <FloatingActionButton
          icon="command"
          label={$t('page.fab.menu')}
          position="right"
          on:click={openCommandBar}
        />
      {/if}

      <!-- ▼▼▼ COMPLETE MODAL SOLUTION ▼▼▼ -->
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
      <!-- ▲▲▲ END OF SOLUTION ▲▲▲ -->
    </div>
  {/if}
{/if}

<style>
  /* All your styles are correct and do not need to be changed. */
  .main-app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .main-content {
    flex-grow: 1;
    position: relative;
    overflow: hidden;
  }
  .view-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .main-content.is-editor-view .view-wrapper {
    overflow-y: auto;
    padding: var(--space-xl) var(--space-lg) var(--space-xxl);
    padding-top: calc(60px + var(--space-xl));
    display: flex;
    justify-content: center;
  }
  .main-content.is-tree-view .view-wrapper {
    padding-top: 60px;
    box-sizing: border-box;
  }
  .sheet-container {
    width: 100%;
    max-width: 820px;
    height: fit-content;
    margin: 0;
    padding: 3rem 4rem;
    background-color: var(--color-background-translucent);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-xl);
    border-radius: var(--border-radius-lg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transition: var(--transition-fast);
  }
  :global(.dark-theme) .sheet-container {
    background-color: var(--panel-bg-dark);
  }
  .tree-container {
    width: 100%;
    height: 100%;
  }
  .status-message {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: var(--color-text-tertiary);
    font-style: italic;
  }
  .status-message.error {
    color: var(--color-danger);
    font-style: normal;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
</style>
