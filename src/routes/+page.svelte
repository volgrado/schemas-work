<!-- src/routes/+page.svelte -->
<!-- NO CHANGES NEEDED IN THIS FILE. -->
<!-- With the updated `modalStore.ts`, the errors here are resolved. -->

<script lang="ts">
  // --- Svelte Core y Entorno ---
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';
  import { Toaster } from 'svelte-sonner';

  // --- Componentes ---
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
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  // --- NEW: Modal Imports ---
  import FormulaEditModal from '$lib/components/editor/FormulaEditModal.svelte';
  import MediaEditModal from '$lib/components/editor/MediaEditModal.svelte';

  // --- Stores y Servicios ---
  import { documentStore } from '$lib/stores/documentStore';
  import { editorStore } from '$lib/stores/editorStore';
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { ttsStore } from '$lib/stores/ttsStore';
  import * as directoryService from '$lib/services/core/directoryService';
  import * as schemaService from '$lib/services/features/schemaService';
  import { reviewStore } from '$lib/stores/reviewStore';
  // --- NEW: Modal Store Import ---
  import { modalStore } from '$lib/stores/modalStore';

  // --- PROPS Y ESTADO LOCAL ---
  let { data }: { data: { showWelcome: boolean } } = $props();

  let showWelcome = $state(data.showWelcome);
  let isRevealingContent = $state(!data.showWelcome);
  let currentView = $state<'editor' | 'tree'>('editor');
  let nodeToFocus = $state<number | null>(null);
  let isMobile = $state(browser ? window.innerWidth <= 768 : false);

  // --- ESTADO DERIVADO REACTIVO (CON REACTIVIDAD EXPLÍCITA) ---
  let treeData = $state<TreeNodeData | null>(null);

  $effect(() => {
    const version = $editorStore.contentVersion;
    const currentDoc = $editorStore.doc;
    if (currentDoc) {
      treeData = schemaService.documentToTreeData(currentDoc);
    } else {
      treeData = null;
    }
  });

  let selectedNodeId = $derived(
    ($ttsStore.status === 'playing' || $ttsStore.status === 'paused') &&
      $ttsStore.nodesToRead[$ttsStore.currentNodeIndex]
      ? `node-${$ttsStore.nodesToRead[$ttsStore.currentNodeIndex].pos}`
      : $editorStore.selectedNodePos !== null
        ? `node-${$editorStore.selectedNodePos}`
        : 'root-title'
  );

  let hasNodeSelected = $derived($editorStore.selectedNodePos !== null);

  // --- EFECTOS SECUNDARIOS Y CICLO DE VIDA ---
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

  // --- MANEJADORES DE EVENTOS Y ACCIONES ---
  function handleGlobalKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "'") {
      event.preventDefault();
      openCardEditor();
    }
  }

  function handleResize() {
    isMobile = window.innerWidth <= 768;
  }

  async function onAnimationComplete() {
    localStorage.setItem('schemas-work-has-seen-welcome', 'true');
    showWelcome = false;
    isRevealingContent = true;
    await loadInitialDocument();
  }

  function handleShowWelcome() {
    currentView = 'editor';
    showWelcome = true;
    isRevealingContent = false;
  }

  function handleNodeClickInTree(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail;
    if (id === 'root-title') return;
    const pos = parseInt(id.replace('node-', ''), 10);
    if (!isNaN(pos)) {
      nodeToFocus = pos;
      currentView = 'editor';
    }
  }

  function openCardEditor() {
    const editor = get(editorStore).instance;
    const pos = get(editorStore).selectedNodePos;
    if (!editor || pos === null) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node || !node.attrs.nodeId) return;
    cardEditorStore.open(node.attrs.nodeId);
  }

  function openCommandBar() {
    commandBarStore.open();
  }

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
        'Mi Primer Esquema',
        undefined,
        null
      );
    }
  }

  // --- Modal Save Handlers ---
  function handleModalSave(event: CustomEvent) {
    const { nodePos, newAttrs } = event.detail;
    const editor = get(editorStore).instance;
    if (!editor) return;
    // TypeScript now knows that `config` in the store has a `nodePos` property
    // because both FormulaModalConfig and MediaModalConfig have it.
    const pos = get(modalStore).config?.nodePos;
    if (pos === undefined) return;

    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;

    editor.chain().focus(pos).updateAttributes(node.type, newAttrs).run();
    modalStore.close();
  }
</script>

<svelte:head>
  {#if $documentStore.metadata?.title}
    <title>{$documentStore.metadata.title} - Schemas.work</title>
  {:else}
    <title>Schemas.work</title>
  {/if}
</svelte:head>

<Toaster position="bottom-center" theme="system" />

<!-- Render Modals based on modalStore -->
{#if $modalStore.isOpen}
  {@const config = $modalStore.config}
  {#if config?.type === 'formula'}
    <!-- TS now understands `config.attrs` is `{ formula: string }` -->
    <FormulaEditModal
      show={true}
      initialAttrs={config.attrs as { formula: string }}
      onClose={modalStore.close}
      on:close={modalStore.close}
      on:save={handleModalSave}
    />
  {:else if config?.type === 'media'}
    <!-- TS now understands `config.nodeType` exists and `config.attrs` is `{ src: string, mediaType: ... }` -->
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

{#if !showWelcome}
  <AppHeader
    on:showWelcome={handleShowWelcome}
    class={isRevealingContent ? 'reveal' : ''}
  >
    {#if !isMobile}
      <Button
        variant="secondary"
        size="sm"
        onclick={() =>
          (currentView = currentView === 'editor' ? 'tree' : 'editor')}
        aria-label={currentView === 'editor'
          ? 'Cambiar a vista de árbol'
          : 'Cambiar a vista de editor'}
      >
        <Icon
          name={currentView === 'editor' ? 'git-branch' : 'edit-3'}
          size={16}
        />
      </Button>
    {/if}
  </AppHeader>
{/if}

{#if showWelcome}
  <WelcomeAnimator on:animationComplete={onAnimationComplete} />
{/if}

<div class="view-wrapper" class:is-reviewing={$reviewStore.isReviewing}>
  {#if !showWelcome && currentView === 'editor'}
    <div class="editor-background-canvas">
      <OrganicCanvas />
    </div>
  {/if}

  <div
    class="view-content"
    style:display={currentView === 'editor' ? 'block' : 'none'}
  >
    <div
      class="main-content"
      class:reveal={isRevealingContent}
      class:is-reading-aloud={$ttsStore.status === 'playing' ||
        $ttsStore.status === 'paused'}
    >
      {#if !showWelcome}
        {#if $documentStore.status === 'loading' || $documentStore.status === 'idle'}
          <div class="status-container">
            <Icon name="loader" size={24} class="spinner" />
            <p>Cargando esquema...</p>
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
            <p>Hubo un error al cargar el documento.</p>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <div
    class="view-content"
    style:display={currentView === 'tree' ? 'block' : 'none'}
  >
    {#if treeData}
      <div class="tree-view-content" class:reveal={isRevealingContent}>
        <SchemaTree
          {treeData}
          {selectedNodeId}
          on:nodeClick={handleNodeClickInTree}
        />
      </div>
    {:else if !showWelcome && $documentStore.status === 'ready'}
      <div class="status-container">
        <p>Tu esquema debe contener una lista para generar la visualización.</p>
        <span
          >Empieza a escribir y usa '*' o '-' seguido de un espacio para crear
          un ítem.</span
        >
      </div>
    {/if}
  </div>
</div>

{#if !showWelcome}
  <CommandBar />
  <CardEditorPanel />
  <ReviewController />
  <TTSController />
  <SlashMenuController />

  {#if isMobile}
    <FloatingActionButton
      icon={currentView === 'editor' ? 'git-branch' : 'edit-3'}
      label={currentView === 'editor' ? 'Árbol' : 'Editor'}
      position="right"
      on:click={() =>
        (currentView = currentView === 'editor' ? 'tree' : 'editor')}
    />
    <FloatingActionButton
      icon="command"
      label="Menú"
      position="center"
      on:click={openCommandBar}
    />
    {#if hasNodeSelected && currentView === 'editor'}
      <FloatingActionButton
        icon="pen-tool"
        label="Tarjetas"
        position="left"
        on:click={openCardEditor}
      />
    {/if}
  {/if}
{/if}

<style>
  .view-wrapper.is-reviewing .main-content,
  .view-wrapper.is-reviewing .tree-view-content {
    opacity: 0;
    pointer-events: none;
  }

  .view-wrapper.is-reviewing + :global(.app-header) {
    opacity: 0;
    pointer-events: none;
  }

  .editor-background-canvas {
    position: fixed;
    inset: 0;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }

  @media (min-width: 1200px) {
    .editor-background-canvas {
      opacity: 1;
    }
  }

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
  .view-wrapper,
  .view-content {
    width: 100%;
    height: 100%;
  }
  .view-wrapper {
    position: relative;
    width: 100%;
    height: 100vh;
    transition: opacity 0.3s ease;
  }
  .view-content {
    position: absolute;
    inset: 0;
  }
  .tree-view-content {
    width: 100%;
    height: 100%;
    opacity: 0;
  }
  .main-content,
  :global(.app-header) {
    opacity: 0;
    will-change: transform, opacity;
    transition: opacity 0.3s ease;
  }
  .main-content.reveal,
  .tree-view-content.reveal {
    animation: fadeInUp 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }
  :global(.app-header.reveal) {
    animation: fadeInUp 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.2s forwards;
  }
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  :global(.spinner) {
    animation: spin 1s linear infinite;
  }
</style>
