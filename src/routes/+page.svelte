<!-- src/routes/+page.svelte (VERSIÓN SIMPLE Y ROBUSTA) -->
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

  // --- Stores y Servicios ---
  import { documentStore } from '$lib/stores/documentStore';
  import { editorStore } from '$lib/stores/editorStore';
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import * as directoryService from '$lib/services/core/directoryService';
  import * as schemaService from '$lib/services/features/schemaService';

  import { debounce } from '$lib/utils/debounce';

  let { data }: { data: { showWelcome: boolean } } = $props();
  const docState = documentStore;

  let showWelcome = $state(data.showWelcome);
  let isRevealingContent = $state(!data.showWelcome);
  let currentView = $state<'editor' | 'tree'>('editor');
  let treeData: TreeNodeData | null = $state(null);
  let selectedNodeId: string | null = $state(null);
  let nodeToFocus: number | null = $state(null);
  let hasNodeSelected = $state(false);
  let isMobile = $state(browser ? window.innerWidth <= 768 : false);

  const selectedPos = $derived(get(editorStore).selectedNodePos);

  $effect(() => {
    hasNodeSelected = selectedPos !== null;
    selectedNodeId = selectedPos !== null ? `node-${selectedPos}` : null;
  });

  // Efecto que se suscribe al editor y actualiza `treeData` de forma reactiva
  $effect(() => {
    const editor = get(editorStore).instance;
    if (editor && get(documentStore).status === 'ready') {
      // La función original que hace el trabajo pesado
      const handleUpdate = () => {
        treeData = schemaService.documentToTreeData(editor.state.doc);
      };

      // **AQUÍ ESTÁ LA MAGIA: Creamos una versión "debounced" de nuestra función**
      const debouncedHandleUpdate = debounce(handleUpdate, 300); // 300ms de retraso

      // Nos suscribimos al evento del editor usando la versión debounced
      editor.on('update', debouncedHandleUpdate);

      // Hacemos una llamada inicial INMEDIATA para que el árbol se cargue la primera vez
      handleUpdate();

      // La función de limpieza se desuscribe de la versión debounced
      return () => editor.off('update', debouncedHandleUpdate);
    } else {
      treeData = null;
    }
  });

  // Efecto que actualiza el nodo seleccionado para pasarlo al árbol
  $effect(() => {
    const pos = get(editorStore).selectedNodePos;
    hasNodeSelected = pos !== null;
    selectedNodeId = pos !== null ? `node-${pos}` : null;
  });

  // Efecto para la carga inicial del documento
  $effect(() => {
    if (!showWelcome) {
      loadInitialDocument();
    }
  });

  // --- Manejadores de Eventos y Acciones ---

  function handleResize() {
    isMobile = window.innerWidth <= 768;
  }

  async function onAnimationComplete() {
    localStorage.setItem('schemas-work-has-seen-welcome', 'true');
    showWelcome = false;
    isRevealingContent = true;
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
    cardEditorStore.open(pos, node.attrs.cards || []);
  }

  function openCommandBar() {
    commandBarStore.open();
  }

  async function loadInitialDocument() {
    if (get(docState).status === 'ready') return;
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

  onMount(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<Toaster position="bottom-center" />

{#if !showWelcome}
  <AppHeader
    on:showWelcome={handleShowWelcome}
    class={isRevealingContent ? 'reveal' : ''}
  >
    {#if !isMobile}
      <Button
        variant="secondary"
        size="sm"
        on:click={() =>
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

<div class="view-wrapper">
  <div
    class="view-content"
    style:display={currentView === 'editor' ? 'block' : 'none'}
  >
    <div class="main-content" class:reveal={isRevealingContent}>
      {#if !showWelcome}
        {#if $docState.status === 'loading' || $docState.status === 'idle'}
          <div class="status-container"><p>Cargando jardín...</p></div>
        {:else if $docState.status === 'ready' && $docState.ydoc}
          {#key $docState.docId}
            <DocumentView
              ydoc={$docState.ydoc}
              initialContent={$docState.initialContent}
              focusedNodePos={nodeToFocus}
              on:focusApplied={() => (nodeToFocus = null)}
            />
          {/key}
        {:else if $docState.status === 'error'}
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
    {:else if !showWelcome}
      <div class="status-container">
        <p>Tu esquema debe contener una lista para generar la visualización.</p>
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
  .status-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-style: italic;
    color: var(--color-gray-500);
    padding: 0 var(--space-lg);
    text-align: center;
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
