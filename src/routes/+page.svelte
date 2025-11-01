<!--
  @file src/routes/+page.svelte
  @description The main page component for the single-page application. It orchestrates the entire user experience,
  from the initial welcome screen to the main document editor view or the full-screen review session.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';

  // --- UI Components ---
  import WelcomeAnimator from '$lib/components/layout/WelcomeAnimator.svelte';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import DocumentView from '$lib/components/editor/DocumentView.svelte';
  import SchemaTree from '$lib/components/tree/SchemaTree.svelte';
  import type { TreeNodeData } from '$lib/components/tree/SchemaTree.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import FloatingActionButton from '$lib/components/ui/FloatingActionButton.svelte';
  import FirstTimeHint from '$lib/components/ui/FirstTimeHint.svelte';
  import ReviewController from '$lib/components/review/ReviewController.svelte';
  import CardEditorPanel from '$lib/components/card/CardEditorPanel.svelte';
  import TTSController from '$lib/components/tts/TTSController.svelte';
  import SlashMenuController from '$lib/components/editor/SlashMenuController.svelte';

  // --- Stores & Services ---
  import { documentStore } from '$lib/stores/documentStore';
  import { editorStore } from '$lib/stores/editorStore';
  import { reviewStore } from '$lib/stores/reviewStore';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import * as schemaService from '$lib/services/features/schemaService';
  import { t } from '$lib/utils/i18n';
  import * as directoryService from '$lib/services/core/directoryService';

  // --- Local State ---
  let showWelcomeUI = false;
  let showMainUI = false;
  let currentView: 'editor' | 'tree' = 'editor';
  let showHint = false;
  let treeData: TreeNodeData | null = null;

  const WELCOME_KEY = 'schemas-work-has-seen-welcome';
  const HINT_KEY = 'schemas-work-has-seen-command-hint';

  // Unsubscribe functions for store subscriptions
  let unsubDocStore = () => {};
  let unsubEditorStore = () => {};

  onMount(async () => {
    // --- Initial Load Logic ---
    if (!localStorage.getItem(WELCOME_KEY)) {
      showWelcomeUI = true;
    } else {
      showMainUI = true;
      loadInitialDocument();
    }

    // --- First-Time Hint Logic ---
    if (!localStorage.getItem(HINT_KEY)) {
      showHint = true;
    }

    // --- Store Subscriptions ---
    unsubDocStore = documentStore.subscribe((state) => {
      // Logic dependent on documentStore state
    });

    unsubEditorStore = editorStore.subscribe((state) => {
      // Logic dependent on editorStore state
    });
  });

  onDestroy(() => {
    unsubDocStore();
    unsubEditorStore();
  });

  async function loadInitialDocument() {
    const lastActiveId = await directoryService.getLastActiveDocId();
    if (lastActiveId) {
      await documentStore.loadDocument(lastActiveId);
    } else {
      const allSchemas = (await directoryService.getAllItems()).filter(
        (i) => i.type === 'schema'
      );
      if (allSchemas.length > 0) {
        await documentStore.loadDocument(allSchemas[0].id);
      } else {
        await documentStore.createNewDocument(
          get(t)('document.first_schema_title')
        );
      }
    }
  }

  function onWelcomeAnimationComplete() {
    showWelcomeUI = false;
    showMainUI = true;
    localStorage.setItem(WELCOME_KEY, 'true');
    loadInitialDocument();
  }

  function dismissHint() {
    showHint = false;
    localStorage.setItem(HINT_KEY, 'true');
  }

  function toggleView() {
    currentView = currentView === 'editor' ? 'tree' : 'editor';
  }

  // Derived state with DEBUGGING: Convert the ProseMirror document to tree data whenever content changes.
  $: {
    if ($editorStore.doc) {
      console.log(
        '%c[DEBUG] Source ProseMirror Document:',
        'color: blue; font-weight: bold;',
        $editorStore.doc.toJSON()
      );
      treeData = schemaService.documentToTreeData($editorStore.doc);
      console.log(
        '%c[DEBUG] Resulting treeData sent to component:',
        'color: green; font-weight: bold;',
        JSON.parse(JSON.stringify(treeData || null))
      );
    }
  }
</script>

{#if showWelcomeUI}
  <WelcomeAnimator on:animationComplete={onWelcomeAnimationComplete} />
{/if}

{#if showMainUI}
  <!-- Main Logic: Show Review UI if a session is active and visible -->
  {#if $reviewStore.isReviewing && $reviewStore.isUiVisible}
    <ReviewController />
  {:else}
    <!-- Otherwise, show the main application view -->
    <div class="main-app-container">
      <AppHeader
        show={true}
        on:showWelcome={() => {
          showMainUI = false;
          showWelcomeUI = true;
        }}
      >
        <!-- Content for the center slot: Now with icon-only buttons -->
        <div class="header-actions">
          <!-- View Toggle Button -->
          <Button
            variant="ghost"
            iconOnly
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

          <!-- Study and Cards Buttons -->
          {#if $documentStore.docId && !$reviewStore.isReviewing}
            <Button
              variant="ghost"
              iconOnly
              aria-label={$t('page.header_actions.study')}
              on:click={() => reviewStore.startReview([$documentStore.docId!])}
            >
              <Icon name="zap" size={18} />
            </Button>
            <Button
              variant="ghost"
              iconOnly
              aria-label={$t('page.header_actions.cards')}
              on:click={() => cardEditorStore.open($documentStore.docId!)}
            >
              <Icon name="edit-3" size={18} />
            </Button>
          {/if}
        </div>
      </AppHeader>

      <main class="main-content page-container">
        {#if $documentStore.status === 'loading'}
          <div class="status-message">{$t('page.status.loading_schema')}</div>
        {:else if $documentStore.status === 'error'}
          <div class="status-message error">{$t('page.status.load_error')}</div>
        {:else if $documentStore.ydoc}
          {#if currentView === 'editor'}
            <DocumentView
              ydoc={$documentStore.ydoc}
              initialContent={$documentStore.initialContent}
              focusedNodePos={$editorStore.selectedNodePos}
            />
          {:else if currentView === 'tree'}
            <SchemaTree
              {treeData}
              selectedNodeId={$editorStore.selectedNode?.attrs.nodeId ?? null}
              on:nodeClick={(e) => {
                const editor = get(editorStore).instance;
                if (editor) {
                  let foundPos: number | null = null;
                  editor.state.doc.descendants((node, pos) => {
                    if (node.attrs.nodeId === e.detail.id) {
                      foundPos = pos;
                      return false;
                    }
                  });
                  if (foundPos !== null) {
                    editorStore.update((s) => ({
                      ...s,
                      selectedNodePos: foundPos,
                    }));
                    currentView = 'editor';
                  }
                }
              }}
            />
          {/if}
        {/if}

        {#if showHint}
          <FirstTimeHint on:close={dismissHint} />
        {/if}

        <!-- Floating Action Buttons are only visible when a document is active -->
        {#if $documentStore.docId}
          <!-- Show "Resume Study" FAB if a session is active but hidden -->
          {#if $reviewStore.isReviewing && !$reviewStore.isUiVisible}
            <FloatingActionButton
              icon="zap"
              label="Resume Study"
              position="right"
              on:click={reviewStore.resumeReviewUi}
            />
          {/if}

          <!-- The main Menu FAB. It's hidden if the "Resume Study" button is visible to prevent overlap. -->
          {#if !$reviewStore.isReviewing}
            <FloatingActionButton
              icon="command"
              label={$t('page.fab.menu')}
              position="right"
              on:click={() => commandBarStore.open()}
            />
          {/if}
        {/if}
      </main>

      <CardEditorPanel />
      <TTSController />
      <SlashMenuController />
    </div>
  {/if}
{/if}

<style>
  .main-app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .main-content {
    flex-grow: 1;
    padding-top: 60px; /* Space for the fixed header */
  }
  .page-container {
    height: 100%;
    position: relative;
  }
  .status-message {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: var(--color-text-secondary);
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
