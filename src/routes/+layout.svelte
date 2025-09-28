<!-- src/routes/+layout.svelte (SOLUCIÓN FINAL DE REGRESIONES) -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';

  import '$lib/styles/app.css';

  // --- Componentes Globales ---
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import CardEditorPanel from '$lib/components/review/CardEditorPanel.svelte';
  import WelcomeAnimator from '$lib/components/layout/WelcomeAnimator.svelte';
  import FloatingActionButton from '$lib/components/ui/FloatingActionButton.svelte';

  // --- Stores ---
  import { editorStore } from '$lib/stores/editorStore';
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  // *** CORRECCIÓN #1 ***: Importamos el store de la CommandBar
  import { commandBarStore } from '$lib/stores/commandBarStore';

  export let data;
  let showWelcomeScreen = data.showWelcome;

  let hasNodeSelected = false;
  const unsubscribeEditor = editorStore.subscribe((value) => {
    hasNodeSelected = value.selectedNodePos !== null;
  });

  let isMobile = browser ? window.innerWidth <= 768 : false;

  function handleResize() {
    isMobile = window.innerWidth <= 768;
  }

  function onAnimationComplete() {
    localStorage.setItem('schemas-work-has-seen-welcome', 'true');
    showWelcomeScreen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "'") {
      event.preventDefault();
      openCardEditor();
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

  // *** CORRECCIÓN #1 ***: La función ahora llama a la acción del store.
  function openCommandBar() {
    commandBarStore.open();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleResize);
      unsubscribeEditor();
    };
  });
</script>

{#if !showWelcomeScreen}
  <AppHeader />
{/if}

{#if showWelcomeScreen}
  <WelcomeAnimator on:animationComplete={onAnimationComplete} />
{/if}

<main>
  <slot />
</main>

{#if !showWelcomeScreen}
  <CardEditorPanel />

  <!-- Lógica de los Botones Flotantes en Móvil -->
  {#if isMobile}
    <!-- Botón de CommandBar: SIEMPRE visible en móvil, a la derecha -->
    <FloatingActionButton
      icon="command"
      label="Menú"
      position="right"
      on:click={openCommandBar}
    />

    <!-- *** CORRECCIÓN #2 ***: RESTAURAMOS el botón de Editar Tarjetas -->
    <!-- Este botón SOLO es visible si hay un nodo seleccionado, y se posiciona en el centro -->
    {#if hasNodeSelected}
      <FloatingActionButton
        icon="copy"
        label="Editar Tarjetas"
        position="center"
        on:click={openCardEditor}
      />
    {/if}
  {/if}
{/if}
