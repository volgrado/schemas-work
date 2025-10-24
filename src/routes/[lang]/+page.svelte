<!--
  @file src/routes/[lang]/+page.svelte
  @description This is the main page component of the application, serving as the central hub for all user interactions.
  It acts as a "controller" component, orchestrating a large number of child components and stores to create the
  complete user experience.

  Key Responsibilities:
  - **Component Composition**: It imports and renders almost all major UI components, including the main `DocumentView`
    (the editor), the `AppHeader`, the `SchemaTree` for visualization, and all floating panels like the `CommandBar`,
    `CardEditorPanel`, and `TTSController`.
  - **State Management**: It is the primary consumer of many global Svelte stores (`documentStore`, `editorStore`,
    `modalStore`, etc.). It uses Svelte 5 runes (`$derived`, `$effect`) to reactively derive state (like `pageTitle`
    or `treeData`) and trigger side effects when the store values change.
  - **View Switching**: It manages the `currentView` state, allowing the user to toggle between the main editor
    (`DocumentView`) and the hierarchical tree visualization (`SchemaTree`).
  - **Initial Load Logic**: It handles the initial document loading sequence. If the user has not seen the welcome
    animation, it displays that first. Otherwise, it calls `loadInitialDocument` to either load the last active
    document or create a new one, ensuring the user always has a document to work with.
  - **Event Handling**: It contains a rich set of event handlers for user interactions, from global keydown events
    (e.g., for opening the card editor) to custom events from child components (e.g., clicking a node in the tree).
  - **SEO and Metadata**: It dynamically manages the page's metadata using `<svelte:head>`, including the title,
    description, canonical URL, Open Graph tags, and structured data (JSON-LD), all of which are reactively
    updated based on the current document's content.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';
  import { Toaster } from 'svelte-sonner';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DocumentView from '$lib/components/editor/DocumentView.svelte';
  import WelcomeAnimator from '$lib/components/layout/WelcomeAnimator.svelte';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import CardEditorPanel from '$lib/components/review/CardEditorPanel.svelte';
  import ReviewController from '$lib/components/review/ReviewController.svelte';
  import TTSController from '$lib/components/features/TTSController.svelte';
  import SlashMenuController from '$lib/components/editor/SlashMenuController.svelte';
  import FloatingActionButton from '$lib/components/ui/FloatingActionButton.svelte';
  import SchemaTree from '$lib/components/views/SchemaTree.svelte';
  import type { TreeNodeData } from '$lib/components/views/SchemaTree.svelte';
  import FormulaEditModal from '$lib/components/editor/FormulaEditModal.svelte';
  import MediaEditModal from '$lib/components/editor/MediaEditModal.svelte';
  import Screen from '$lib/components/ui/Screen.svelte';
  import { documentStore } from '$lib/stores/documentStore';
  import { editorStore } from '$lib/stores/editorStore';
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { ttsStore } from '$lib/stores/ttsStore';
  import * as directoryService from '$lib/services/core/directoryService';
  import * as schemaService from '$lib/services/features/schemaService';
  import { reviewStore } from '$lib/stores/reviewStore';
  import { modalStore } from '$lib/stores/modalStore';
  import { t } from '$lib/utils/i18n';
  import { page } from '$app/stores';

  // --- Props ---
  let { data }: { data: { showWelcome: boolean } } = $props();
  // --- State ---
  let showWelcome = $state(data.showWelcome);
  let isRevealingContent = $state(!data.showWelcome);
  let currentView = $state<'editor' | 'tree'>('editor');
  let nodeToFocus = $state<number | null>(null);
  let isMobile = $state(browser ? window.innerWidth <= 768 : false);
  let treeData = $state<TreeNodeData | null>(null);

  // --- Reactive SEO and Metadata ---
  const siteBaseUrl = 'https://schemas.work';
  let pageTitle = $derived($documentStore.metadata?.title || 'Schemas.work');
  let pageDescription = $derived(
    `Explore the "${pageTitle}" schema. Structure your knowledge, visualize ideas, and learn effectively with Schemas.work.`
  );
  let pageUrl = $derived(`${siteBaseUrl}${$page.url.pathname}`);
  let ogImageUrl = `${siteBaseUrl}/android-chrome-512x512.png`; // Using the large PWA icon

  let structuredData = $derived({
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    headline: pageTitle,
    description: pageDescription,
    image: ogImageUrl,
    author: {
      '@type': 'Organization',
      name: 'Schemas.work',
    },
    datePublished: $documentStore.metadata
      ? new Date($documentStore.metadata.createdAt).toISOString()
      : '',
    dateModified: $documentStore.metadata
      ? new Date($documentStore.metadata.updatedAt).toISOString()
      : '',
    url: pageUrl,
  });

  // --- Effects ---

  // Regenerates the schema tree whenever the document content changes.
  $effect(() => {
    const version = $editorStore.contentVersion;
    const currentDoc = $editorStore.doc;
    if (currentDoc) {
      treeData = schemaService.documentToTreeData(currentDoc);
    } else {
      treeData = null;
    }
  });
  // Determines which node in the tree view should be highlighted.
  let selectedNodeId = $derived(
    ($ttsStore.status === 'playing' || $ttsStore.status === 'paused') &&
      $ttsStore.nodesToRead[$ttsStore.currentNodeIndex]
      ? `node-${$ttsStore.nodesToRead[$ttsStore.currentNodeIndex].pos}`
      : $editorStore.selectedNodePos !== null
        ? `node-${$editorStore.selectedNodePos}`
        : 'root-title'
  );
  // A derived boolean to check if a node is currently selected in the editor.
  let hasNodeSelected = $derived($editorStore.selectedNodePos !== null);

  // Sets up global event listeners and loads the initial document if needed.
  onMount(() => {
    if (!showWelcome) {
      loadInitialDocument();
    }
    window.addEventListener('keydown', handleGlobalKeydown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeydown);
      window.removeEventListener('resize', handleResize);
    };
  });
  // --- Event Handlers ---

  /** Handles global keydown events, specifically for opening the card editor.
   */
  function handleGlobalKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "'") {
      event.preventDefault();
      openCardEditor();
    }
  }

  /** Updates the `isMobile` state based on window width.
   */
  function handleResize() {
    isMobile = window.innerWidth <= 768;
  }

  /** Triggered when the welcome animation completes. */
  async function onAnimationComplete() {
    localStorage.setItem('schemas-work-has-seen-welcome', 'true');
    showWelcome = false;
    isRevealingContent = true;
    await loadInitialDocument();
  }

  /** Resets the view to show the welcome screen again.
   */
  function handleShowWelcome() {
    isRevealingContent = false;
    setTimeout(() => {
      currentView = 'editor';
      showWelcome = true;
    }, 300); // Wait for the main screen to fade out
  }

  /** Handles clicks on nodes in the schema tree, switching to the editor and focusing the node.
   */
  function handleNodeClickInTree(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail;
    if (id === 'root-title') return;
    const pos = parseInt(id.replace('node-', ''), 10);
    if (!isNaN(pos)) {
      nodeToFocus = pos;
      currentView = 'editor';
    }
  }

  /** Opens the card editor panel for the currently selected node.
   */
  function openCardEditor() {
    const editor = get(editorStore).instance;
    const pos = get(editorStore).selectedNodePos;
    if (!editor || pos === null) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node || !node.attrs.nodeId) return;
    cardEditorStore.open(node.attrs.nodeId);
  }

  /** Opens the command bar. */
  function openCommandBar() {
    commandBarStore.open();
  }

  /** Loads the last active document or creates a new one.
   */
  async function loadInitialDocument() {
    if (get(documentStore).status === 'ready') return;
    const allItems = await directoryService.getAllItems();
    const schemas = allItems.filter((item) => item.type === 'schema');
    if (schemas.length > 0) {
      const lastActiveId = await directoryService.getLastActiveDocId();
      const docToLoadId =
        schemas.find((s) => s.id === lastActiveId)?.id || schemas[0].id;
      await documentStore.loadDocument(docToLoadId);
    } else {
      await documentStore.createNewDocument(
        $t('file_explorer.default_schema_name'),
        undefined,
        null
      );
    }
  }

  /** Handles the save event from modals, updating node attributes in the editor.
   */
  function handleModalSave(event: CustomEvent) {
    const { newAttrs } = event.detail;
    const editor = get(editorStore).instance;
    if (!editor) return;
    const pos = get(modalStore).config?.nodePos;
    if (pos === undefined) return;

    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    editor.chain().focus(pos).updateAttributes(node.type, newAttrs).run();
    modalStore.close();
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:image" content={ogImageUrl} />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content={pageUrl} />
  <meta property="twitter:title" content={pageTitle} />
  <meta property="twitter:description" content={pageDescription} />
  <meta property="twitter:image" content={ogImageUrl} />

  <link rel="canonical" href={pageUrl} />

  <!-- Structured Data (JSON-LD) for Rich Snippets -->
  <script type="application/ld+json">
    {JSON.stringify(structuredData)}
  </script>

  <!-- Hreflang tags for internationalization -->
  {#each ['en', 'es', 'el'] as lang}
    <link
      rel="alternate"
      hreflang={lang}
      href={`${siteBaseUrl}/${lang}${$page.url.pathname.substring(3)}`}
    />
  {/each}
  <link
    rel="alternate"
    hreflang="x-default"
    href={`${siteBaseUrl}/en${$page.url.pathname.substring(3)}`}
  />
</svelte:head>

<Toaster position="bottom-center" theme="system" />

{#if $modalStore.isOpen}
  {@const config = $modalStore.config}
  {#if config?.type === 'formula'}
    <FormulaEditModal
      show={true}
      initialAttrs={config.attrs as { formula: string }}
      onClose={modalStore.close}
      on:close={modalStore.close}
      on:save={handleModalSave}
    />
  {:else if config?.type === 'media'}
    <MediaEditModal
      show={true}
      initialAttrs={config.attrs as {
        src: string;
        mediaType: 'image' | 'youtube';
      }}
      onClose={modalStore.close}
      on:close={modalStore.close}
      on:save={handleModalSave}
    />
  {/if}
{/if}

<AppHeader show={isRevealingContent} on:showWelcome={handleShowWelcome}>
  {#if !isMobile}
    <Button
      variant="secondary"
      size="sm"
      onclick={() =>
        (currentView = currentView === 'editor' ? 'tree' : 'editor')}
      aria-label={currentView === 'editor'
        ? $t('page.view_toggle.aria_label.to_tree')
        : $t('page.view_toggle.aria_label.to_editor')}
    >
      <Icon
        name={currentView === 'editor' ? 'git-branch' : 'edit-3'}
        size={16}
      />
    </Button>
  {/if}
</AppHeader>

{#if showWelcome}
  <WelcomeAnimator on:animationComplete={onAnimationComplete} />
{/if}

<Screen show={isRevealingContent} let:isExiting>
  <main>
    <div
      class="view-content"
      style:display={currentView === 'editor' ? 'block' : 'none'}
    >
      <div
        class="main-content"
        class:is-reading-aloud={$ttsStore.status === 'playing' ||
          $ttsStore.status === 'paused'}
      >
        {#if $documentStore.status === 'loading' || $documentStore.status === 'idle'}
          <div class="status-container">
            <Icon name="loader" size={24} class="spinner" />
            <p>{$t('page.status.loading_schema')}</p>
          </div>
        {:else if $documentStore.status === 'ready' && $documentStore.ydoc}
          {#key $documentStore.docId}
            <DocumentView
              ydoc={$documentStore.ydoc}
              initialContent={$documentStore.initialContent}
              focusedNodePos={nodeToFocus}
              on:focusApplied={() => (nodeToFocus = null)}
            />
          {/key}
        {:else if $documentStore.status === 'error'}
          <div class="status-container">
            <p>{$t('page.status.load_error')}</p>
          </div>
        {/if}
      </div>
    </div>

    <div
      class="view-content"
      style:display={currentView === 'tree' ? 'block' : 'none'}
    >
      {#if treeData}
        <div class="tree-view-content">
          <SchemaTree
            {treeData}
            {selectedNodeId}
            on:nodeClick={handleNodeClickInTree}
          />
        </div>
      {:else if $documentStore.status === 'ready'}
        <div class="status-container">
          <p>{$t('page.status.empty_schema.message')}</p>
          <span>{$t('page.status.empty_schema.hint')}</span>
        </div>
      {/if}
    </div>
  </main>
</Screen>

{#if !showWelcome}
  <CommandBar />
  <CardEditorPanel />
  <ReviewController />
  <TTSController />
  <SlashMenuController />

  {#if isMobile}
    <FloatingActionButton
      icon={currentView === 'editor' ? 'git-branch' : 'edit-3'}
      label={currentView === 'editor'
        ? $t('page.fab.tree')
        : $t('page.fab.editor')}
      position="right"
      on:click={() =>
        (currentView = currentView === 'editor' ? 'tree' : 'editor')}
    />
    <FloatingActionButton
      icon="command"
      label={$t('page.fab.menu')}
      position="center"
      on:click={openCommandBar}
    />
    {#if hasNodeSelected && currentView === 'editor'}
      <FloatingActionButton
        icon="pen-tool"
        label={$t('page.fab.cards')}
        position="left"
        on:click={openCardEditor}
      />
    {/if}
  {/if}
{/if}

<style>
  /* Styles for loading/error status messages */
  .status-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: var(--space-md);
    min-height: 100vh;
    font-style: italic;
    color: var(--color-gray-500);
    padding: 0 var(--space-lg);
    text-align: center;
  }
  .status-container p {
    margin: 0;
    font-style: normal;
  }
  .status-container span {
    margin-top: var(--space-sm);
    font-style: normal;
    font-size: 0.9rem;
  }

  /* View content positioning */
  .view-content {
    position: absolute;
    inset: 0;
  }

  main {
    height: 100%;
    width: 100%;
    position: relative;
  }

  .main-content {
    /* Add any specific styles for the main content area here */
  }

  .tree-view-content {
    /* This padding pushes the tree view down to appear below the fixed header, matching the document view's layout.
     */
    padding-top: var(--space-xxl);
    height: 100vh;
    box-sizing: border-box;
  }

  /* Spinner animation for loading icon */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  :global(.spinner) {
    animation: spin 1s linear infinite;
  }
</style>
