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

  // --- Stores ---
  import { modalState, closeModal } from '$lib/stores/modalStore.svelte';
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

  const WELCOME_KEY = 'schemas-work-has-seen-welcome';
  const HINT_KEY = 'schemas-work-has-seen-command-hint';

  // --- Lifecycle & Logic ---
  onMount(async () => {
    console.log('[+page.svelte] Component has mounted.');
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
    console.log('[+page.svelte] initialDocumentLoad started.');
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
    console.log('[+page.svelte] initialDocumentLoad finished.');
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

  // ==========================================================
  // --- VVVV FINAL FIX: USING $state and $effect VVVV ---
  // ==========================================================

  // 1. Create a state variable to hold the tree data.
  let treeData = $state<ReturnType<
    typeof schemaService.documentToTreeData
  > | null>(null);

  // 2. Create an effect that re-calculates the tree data whenever its dependencies change.
  $effect(() => {
    // Read dependencies to register them for this effect
    const revision = editorState.revision;
    const docStatus = documentState.status;
    const editorDoc = editorState.instance?.state.doc;

    console.log(
      `[+page.svelte] $effect RUNNING. Revision: ${revision}, Status: ${docStatus}, Doc available: ${!!editorDoc}`
    );

    if (docStatus === 'ready' && editorDoc) {
      console.log(
        '[+page.svelte] Conditions MET. Generating tree via $effect...'
      );
      const generatedTree = schemaService.documentToTreeData(editorDoc);
      console.log('[+page.svelte] Generated tree data:', generatedTree);

      // 3. Assign the new tree data to our state variable.
      treeData = generatedTree;
    } else {
      treeData = null;
    }
  });
</script>

<!-- The rest of your file (the template starting with {#if showWelcomeUI}) remains exactly the same -->

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

      <main class="main-content page-container">
        {#if documentState.status === 'loading'}
          <div class="status-message">{$t('page.status.loading_schema')}</div>
        {:else if documentState.status === 'error'}
          <div class="status-message error">{$t('page.status.load_error')}</div>
        {:else if documentState.ydoc}
          {@const currentTreeData = treeData}

          <div
            class="view-wrapper"
            style:display={currentView === 'editor' ? 'contents' : 'none'}
          >
            <div class="sheet-container">
              <DocumentView
                ydoc={documentState.ydoc}
                initialContent={documentState.initialContent}
                provider={documentState.provider}
              />
            </div>
          </div>

          <div
            class="view-wrapper"
            style:display={currentView === 'tree' ? 'contents' : 'none'}
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
                            return false; // Stop searching
                          }
                          return true;
                        }
                      );
                      if (foundPos !== null) {
                        const node = editor.state.doc.nodeAt(foundPos);
                        if (node) updateSelection(node, foundPos);
                        setFocusCommand(e.detail.id); // Use direct function
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

      {#if modalState.isOpen && modalState.config}
        {#if modalState.config.type === 'formula'}
          <Modal
            show={true}
            title={$t('modals.formula_editor_title')}
            onClose={closeModal}
          >
            <FormulaEditorModal
              nodePos={modalState.config.nodePos}
              nodeType={modalState.config.nodeType}
              initialFormula={modalState.config.initialFormula}
              onsave={() => {}}
            />
          </Modal>
        {/if}
        {#if modalState.config.type === 'media'}
          <Modal
            show={true}
            title={$t('modals.media_editor_title')}
            onClose={closeModal}
          >
            <div style="padding: 1rem; text-align: center;">
              {$t('modals.media_editor_placeholder')}: {modalState.config
                .nodeType}
            </div>
          </Modal>
        {/if}
      {/if}
    </div>
  {/if}
{/if}

<style>
  /* Styles remain unchanged */
  .view-wrapper {
    width: 100%;
    height: 100%;
    display: contents;
  }
  .main-app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .main-content {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    padding: calc(60px + var(--space-xl)) var(--space-lg) var(--space-xxl);
  }
  .page-container {
    height: 100%;
    position: relative;
    width: 100%;
  }
  .sheet-container {
    width: 100%;
    max-width: 820px;
    height: fit-content;
    margin: 0 auto;
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
    max-width: 1200px;
    height: 100%;
    margin: 0 auto;
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
