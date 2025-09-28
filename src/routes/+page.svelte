<!-- src/routes/+page.svelte (VERSIÓN CORREGIDA Y COMPLETA) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  // --- Componentes ---
  import DocumentView from '$lib/components/editor/DocumentView.svelte';
  import WelcomeAnimator from '$lib/components/layout/WelcomeAnimator.svelte';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  // --- *** AÑADIDO: Importamos los componentes de UI globales *** ---
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import CardEditorPanel from '$lib/components/review/CardEditorPanel.svelte';
  import ReviewController from '$lib/components/review/ReviewController.svelte';
  import TTSController from '$lib/components/features/TTSController.svelte';

  // --- Stores y Servicios ---
  import { documentStore } from '$lib/stores/documentStore';
  import * as directoryService from '$lib/services/core/directoryService';

  // --- Props y Estado ---
  export let data: { showWelcome: boolean };
  const state = documentStore;

  let showWelcome = data.showWelcome;

  let isRevealingContent = !showWelcome;

  onMount(() => {
    if (!showWelcome) {
      loadInitialDocument();
    }
  });

  function onAnimationComplete() {
    localStorage.setItem('schemas-work-has-seen-welcome', 'true');
    showWelcome = false;
    isRevealingContent = true;
    loadInitialDocument();
  }

  // --- *** AÑADIDO: Manejador para el evento del AppHeader *** ---
  function handleShowWelcome() {
    showWelcome = true;
    isRevealingContent = false; // Ocultamos el contenido principal de nuevo
  }

  async function loadInitialDocument() {
    if (get(state).status === 'ready') {
      return;
    }
    const schemas = await directoryService.listSchemas();
    if (schemas.length > 0) {
      const lastActiveId = await directoryService.getLastActiveDocId();
      const docToLoadId = lastActiveId || schemas[0].id;
      documentStore.loadDocument(docToLoadId);
    } else {
      documentStore.createNewDocument('Mi Primer Esquema');
    }
  }
</script>

<!-- 
  *** CORRECCIÓN: Añadimos el listener on:showWelcome ***
-->
{#if !showWelcome}
  <AppHeader
    class={isRevealingContent ? 'reveal' : ''}
    on:showWelcome={handleShowWelcome}
  />
{/if}

{#if showWelcome}
  <WelcomeAnimator on:animationComplete={onAnimationComplete} />
{/if}

<div class="main-content" class:reveal={isRevealingContent}>
  {#if !showWelcome}
    {#if $state.status === 'loading' || $state.status === 'idle'}
      <div class="status-container">
        <p>Cargando jardín...</p>
      </div>
    {:else if $state.status === 'ready' && $state.ydoc}
      {#key $state.docId}
        <DocumentView
          ydoc={$state.ydoc}
          initialContent={$state.initialContent}
        />
      {/key}
    {:else if $state.status === 'error'}
      <div class="status-container">
        <p>Hubo un error al cargar el documento.</p>
      </div>
    {/if}
  {/if}
</div>

<!-- 
  *** AÑADIDO: Renderizamos aquí todos los componentes de UI flotantes/globales. ***
  Estos componentes ya contienen su propia lógica para mostrarse u ocultarse,
  así que solo necesitamos asegurarnos de que existen en el DOM.
-->
{#if !showWelcome}
  <CommandBar />
  <CardEditorPanel />
  <ReviewController />
  <TTSController />
{/if}

<style>
  .status-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-style: italic;
    color: var(--color-gray-500);
  }

  .main-content,
  :global(.app-header) {
    opacity: 0;
    will-change: transform, opacity;
  }

  .main-content.reveal {
    animation: fadeInUp 0.8s ease-out forwards;
  }

  :global(.app-header.reveal) {
    animation: fadeInUp 0.6s ease-out 0.2s forwards;
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
