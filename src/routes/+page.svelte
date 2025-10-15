<!-- src/routes/+page.svelte (VERSIÓN COMPLETA, CORREGIDA Y ROBUSTA) -->
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
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte'; // Importar el canvas

  // --- Stores y Servicios ---
  import { documentStore } from '$lib/stores/documentStore';
  import { editorStore } from '$lib/stores/editorStore';
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { ttsStore } from '$lib/stores/ttsStore'; // Importar ttsStore
  import * as directoryService from '$lib/services/core/directoryService';
  import * as schemaService from '$lib/services/features/schemaService';
  import { reviewStore } from '$lib/stores/reviewStore';

  // --- PROPS Y ESTADO LOCAL ---
  let { data }: { data: { showWelcome: boolean } } = $props();

  let showWelcome = $state(data.showWelcome);
  let isRevealingContent = $state(!data.showWelcome);
  let currentView = $state<'editor' | 'tree'>('editor');
  let nodeToFocus = $state<number | null>(null);
  let isMobile = $state(browser ? window.innerWidth <= 768 : false);

  // --- ESTADO DERIVADO REACTIVO (CON REACTIVIDAD EXPLÍCITA) ---

  // Creamos una variable de estado que contendrá los datos del árbol.
  let treeData = $state<TreeNodeData | null>(null);

  // Un `$effect` que escucha los cambios en `contentVersion` y recalcula `treeData`.
  $effect(() => {
    // 1. Dependencia explícita: Svelte re-ejecutará este bloque cuando `contentVersion` cambie.
    const version = $editorStore.contentVersion;

    // 2. Obtenemos el `doc` más reciente del store.
    const currentDoc = $editorStore.doc;

    // 3. Si hay un documento, recalculamos el árbol.
    if (currentDoc) {
      const newTreeData = schemaService.documentToTreeData(currentDoc);
      treeData = newTreeData;
    } else {
      // 4. Si no hay documento, nos aseguramos de que el árbol esté vacío.
      treeData = null;
    }
  });

  // *** LÓGICA DE RESALTADO SINCRONIZADO ***
  // El nodo seleccionado en el árbol ahora depende tanto de la selección del usuario
  // como del estado del lector de voz (TTS), dando prioridad al TTS.
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
    // CORRECCIÓN: La carga inicial se mueve a onMount para garantizar que el entorno
    // del navegador esté completamente listo, evitando condiciones de carrera con IndexedDB.
    if (!showWelcome) {
      loadInitialDocument();
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  // --- MANEJADORES DE EVENTOS Y ACCIONES ---

  function handleResize() {
    isMobile = window.innerWidth <= 768;
  }

  async function onAnimationComplete() {
    localStorage.setItem('schemas-work-has-seen-welcome', 'true');
    showWelcome = false;
    isRevealingContent = true;
    // La carga del documento se dispara aquí después de la animación de bienvenida.
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
    if (!node) return;

    const nodeId = node.attrs.nodeId;
    if (!nodeId) return;

    cardEditorStore.open(nodeId);
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
      const lastActiveSchema = schemas.find((s) => s.id === lastActiveId);
      const docToLoadId = lastActiveSchema
        ? lastActiveSchema.id
        : schemas[0].id;
      await documentStore.loadDocument(docToLoadId);
    } else {
      await documentStore.createNewDocument(
        'Mi Primer Esquema',
        undefined,
        null
      );
    }
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
          <div class="status-container"><p>Cargando esquema...</p></div>
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
  /*
	  CORRECCIÓN: Se han separado las reglas. El selector `:global(.app-header)`
	  ya no está agrupado con una coma, lo que causaba que siempre tuviera
	  `pointer-events: none`. Ahora, el encabezado solo se ocultará cuando
	  el modo de repaso esté activo.
	*/
  .view-wrapper.is-reviewing .main-content,
  .view-wrapper.is-reviewing .tree-view-content {
    /* Oculta el contenido principal durante el modo de repaso inmersivo */
    opacity: 0;
    pointer-events: none;
  }

  /* AÑADIDO: Regla específica para ocultar el header durante el repaso */
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
    min-height: 100vh;
    font-style: italic;
    color: var(--color-gray-500);
    padding: 0 var(--space-lg);
    text-align: center;
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
    transition: opacity 0.3s ease; /* Transición para el modo inmersivo */
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
    transition: opacity 0.3s ease; /* Transición para el modo inmersivo */
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
</style>
