<script lang="ts">
  import { get } from 'svelte/store';
  import type { Node as ProseMirrorNode } from 'prosemirror-model';
  import { fade } from 'svelte/transition';

  // --- Components ---
  import DocumentView from '$lib/modules/editor/ui/DocumentView.svelte';
  // SchemaTree is now lazy loaded
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Spinner from '$lib/core/ui/Spinner.svelte';
  import EmptyState from '$lib/core/ui/EmptyState.svelte';

  // --- Stores ---
  import { open as openCommandBar } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import { uiState, setActiveView } from '$lib/stores/uiStore.svelte';
  import {
    documentState,
    create as createDocument,
    setFocusCommand,
  } from '$lib/stores/documentStore.svelte';
  import { editorState, updateSelection } from '$lib/modules/editor/ui/editorStore.svelte';
  import { t } from '$lib/utils/i18n';

  // --- Services ---
  import * as schemaService from '$lib/services/features/schemaService';

  // --- Logic ---
  let treeData = $state<ReturnType<
    typeof schemaService.documentToTreeData
  > | null>(null);

  let visualizationMode = $state<'tree'>('tree');

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

  function handleNodeClick(e: CustomEvent<{ id: string }>) {
    const editor = editorState.instance;
    if (editor) {
      let foundPos: number | null = null;
      editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
        if (node.attrs.nodeId === e.detail.id) {
          foundPos = pos;
          return false;
        }
        return true;
      });
      if (foundPos !== null) {
        const node = editor.state.doc.nodeAt(foundPos);
        if (node) updateSelection(node, foundPos);
        setFocusCommand(e.detail.id);
        setActiveView('editor');
      }
    }
  }
</script>

<main
  class="main-content"
  class:is-editor-view={uiState.activeView === 'editor'}
  class:is-tree-view={uiState.activeView === 'tree'}
>
  {#if documentState.status === 'loading'}
    <div class="status-message loading-state" in:fade>
      <Spinner size="lg" />
      <p>{$t('page.status.loading_schema')}</p>
    </div>
  {:else if documentState.status === 'error'}
    <div class="status-container" in:fade>
      <div class="error-content">
        <Icon name="alert-triangle" size={48} color="var(--color-danger)" />
        <h2>{$t('page.status.load_error_title')}</h2>
        <p>{$t('page.status.load_error_message')}</p>
        <div class="error-actions">
          <Button
            variant="primary"
            onclick={() => createDocument(get(t)('document.new_schema_title'))}
          >
            <Icon name="file-plus" />
            {$t('page.actions.create_new')}
          </Button>
          <Button variant="secondary" onclick={openCommandBar}>
            <Icon name="command" />
            {$t('page.actions.open_menu')}
          </Button>
        </div>
      </div>
    </div>
  {:else if documentState.ydoc}
    {@const currentTreeData = treeData}

    <!-- Editor View Wrapper -->
    <div
      class="view-wrapper"
      style:display={uiState.activeView === 'editor' ? 'flex' : 'none'}
      in:fade={{ duration: 200 }}
    >
      <div class="sheet-container glass-panel">
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
      style:display={uiState.activeView === 'tree' ? 'block' : 'none'}
      in:fade={{ duration: 200 }}
    >
      <div class="tree-container">
        {#if currentTreeData}
          {@const visualizationView = $state.snapshot(visualizationMode)}
          
          {#if visualizationView === 'tree'}
            {#await import('$lib/components/visualization/StandardTree.svelte') then { default: StandardTree }}
              <StandardTree
                treeData={currentTreeData}
                selectedNodeId={editorState.selectedNode?.attrs.nodeId ?? null}
                on:nodeClick={handleNodeClick}
              />
            {:catch error}
              <div class="status-message error">
                <p>Error loading tree visualization: {error.message}</p>
              </div>
            {/await}
          {/if}
        {:else}
          <div class="status-message">
            <Spinner size="md" />
            <span style="margin-left: 10px;">{$t('page.status.generating_tree')}</span>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Empty State (No Document Loaded) -->
    <div class="view-wrapper" style:display="flex" style:justify-content="center" style:align-items="center">
      <EmptyState
        title={$t('document.empty_state.title')}
        description={$t('document.empty_state.description')}
        icon="layout"
        actionLabel={$t('page.actions.create_new')}
        actionId="new-schema-button"
        onaction={() => {
          createDocument(get(t)('document.new_schema_title'));
        }}
      />
    </div>
  {/if}
</main>

<style>
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
    /* Increased top padding to give more breathing room between header and document */
    padding-top: calc(var(--height-header) + var(--space-xl));
    display: flex;
    justify-content: center;
  }
  .main-content.is-tree-view .view-wrapper {
    top: var(--height-header);
    height: calc(100% - var(--height-header));
    box-sizing: border-box;
  }
  .sheet-container {
    width: 100%;
    max-width: var(--sheet-max-width);
    height: fit-content;
    margin: 0;
    padding: var(--sheet-padding-y) var(--sheet-padding-x);
    border-radius: var(--radius-lg);
    transition: var(--transition-fast);
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

  /* --- Styles for the new error panel --- */
  .status-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 2rem;
    box-sizing: border-box;
  }
  .error-content {
    text-align: center;
    max-width: 450px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    color: var(--color-text-secondary);
  }
  .error-content h2 {
    color: var(--color-text-primary);
    margin: 0;
    font-size: var(--font-size-xl);
  }
  .error-content p {
    margin: 0;
    line-height: 1.6;
  }
  .error-actions {
    margin-top: var(--space-lg);
    display: flex;
    justify-content: center;
    gap: var(--space-md);
  }
</style>
