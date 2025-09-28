<!-- src/routes/+page.svelte (VERSIÓN COMPLETA - FIN DE SPRINT 1) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { Toaster } from 'svelte-sonner';

  // --- Componentes de Layout y UI ---
  import DocumentView from '$lib/components/editor/DocumentView.svelte';
  import WelcomeAnimator from '$lib/components/layout/WelcomeAnimator.svelte';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';

  // --- Componentes de UI Globales (Controladores) ---
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

  // El estado inicial de la bienvenida viene de `+layout.ts`
  let showWelcome = data.showWelcome;

  // Controla la animación de entrada del contenido principal
  let isRevealingContent = !showWelcome;

  onMount(() => {
    // Si el usuario ya ha visto la bienvenida, cargamos su documento al iniciar.
    if (!showWelcome) {
      loadInitialDocument();
    }
  });

  /**
   * Se dispara cuando la animación de WelcomeAnimator termina.
   * Marca la bienvenida como vista, la oculta, y comienza a mostrar el editor.
   */
  function onAnimationComplete() {
    localStorage.setItem('schemas-work-has-seen-welcome', 'true');
    showWelcome = false;
    isRevealingContent = true; // Activa la animación de entrada del contenido
    loadInitialDocument();
  }

  /**
   * Se dispara cuando el usuario hace clic en el logo en el AppHeader.
   * Vuelve a mostrar la pantalla de bienvenida.
   */
  function handleShowWelcome() {
    showWelcome = true;
    isRevealingContent = false;
  }

  /**
   * Carga el último documento en el que trabajó el usuario.
   * Si no hay ninguno, crea un nuevo documento por defecto.
   */
  async function loadInitialDocument() {
    // Evita recargar si ya hay un documento listo
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

<!-- Componente para mostrar notificaciones (toasts) en toda la app -->
<Toaster position="bottom-center" />

<!-- El header solo se muestra si NO estamos en la bienvenida -->
{#if !showWelcome}
  <AppHeader
    class={isRevealingContent ? 'reveal' : ''}
    on:showWelcome={handleShowWelcome}
  />
{/if}

<!-- El animador de bienvenida solo se muestra SI es la primera visita -->
{#if showWelcome}
  <WelcomeAnimator on:animationComplete={onAnimationComplete} />
{/if}

<!-- Contenedor principal del editor -->
<div class="main-content" class:reveal={isRevealingContent}>
  {#if !showWelcome}
    {#if $state.status === 'loading' || $state.status === 'idle'}
      <div class="status-container">
        <p>Cargando jardín...</p>
      </div>
    {:else if $state.status === 'ready' && $state.ydoc}
      <!-- La directiva #key es crucial para que Svelte remonte
           DocumentView cuando cambiamos de documento, evitando bugs. -->
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
  Hogar de todos los componentes de UI globales y flotantes.
  Solo se montan cuando la aplicación principal es visible.
  Cada uno de ellos gestiona su propia visibilidad internamente
  basándose en el estado de sus respectivos stores.
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

  /* --- Animaciones de Entrada --- */

  /* Por defecto, el contenido principal y el header están ocultos */
  .main-content,
  :global(.app-header) {
    opacity: 0;
    will-change: transform, opacity;
  }

  /* La clase 'reveal' activa las animaciones de aparición */
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
