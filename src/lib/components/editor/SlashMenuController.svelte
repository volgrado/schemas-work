<!-- src/lib/components/editor/SlashMenuController.svelte -->
<script lang="ts">
  import { slashMenuStore } from '$lib/stores/slashMenuStore';
  import Icon from '$lib/components/ui/Icon.svelte';

  let menuElement: HTMLElement;
  let style = $state('');

  const VIEWPORT_PADDING = 10;
  const CURSOR_OFFSET = 5; // Espacio entre el cursor y el menú

  $effect(() => {
    if ($slashMenuStore.isOpen && $slashMenuStore.clientRect && menuElement) {
      const rect = $slashMenuStore.clientRect();
      if (!rect) {
        style = 'opacity: 0; pointer-events: none;';
        return;
      }

      const menuHeight = menuElement.offsetHeight;
      const menuWidth = menuElement.offsetWidth;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      // --- LÓGICA DE POSICIONAMIENTO CON PREFERENCIAS Y FLIP ---

      // Posición preferida: Debajo del cursor
      const posBelow = rect.bottom + window.scrollY + CURSOR_OFFSET;
      // Posición alternativa: Encima del cursor
      const posAbove = rect.top + window.scrollY - menuHeight - CURSOR_OFFSET;

      let top: number;

      // Decidimos la posición vertical
      // ¿Hay suficiente espacio abajo?
      const hasSpaceBelow =
        posBelow + menuHeight < windowHeight - VIEWPORT_PADDING;
      // ¿Hay suficiente espacio arriba?
      const hasSpaceAbove = posAbove > VIEWPORT_PADDING;

      if (hasSpaceBelow) {
        // La preferencia es ponerlo abajo si hay espacio.
        top = posBelow;
      } else if (hasSpaceAbove) {
        // Si no hay espacio abajo pero sí arriba, hacemos "flip".
        top = posAbove;
      } else {
        // No hay espacio ni arriba ni abajo (pantalla muy pequeña).
        // Lo ponemos abajo y dejaremos que la lógica de 'shift' lo ajuste.
        top = posBelow;
      }

      // --- LÓGICA DE DESPLAZAMIENTO (SHIFT) ---

      // La posición horizontal inicial es la del cursor
      let left = rect.left + window.scrollX;

      // Ajustar si se sale por la izquierda
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
      }

      // Ajustar si se sale por la derecha
      if (left + menuWidth > windowWidth - VIEWPORT_PADDING) {
        left = windowWidth - menuWidth - VIEWPORT_PADDING;
      }

      // Ajustar si se sale por arriba O por abajo (después de todo lo anterior)
      // Esto es crucial para el caso de "no hay espacio en ningún lado".
      if (top < VIEWPORT_PADDING) {
        top = VIEWPORT_PADDING;
      }
      if (top + menuHeight > windowHeight - VIEWPORT_PADDING) {
        // Si aún se desborda por abajo, lo anclamos al borde inferior.
        // Esto puede pasar si el contenido del editor es más alto que la ventana.
        top = windowHeight - menuHeight - VIEWPORT_PADDING;
      }

      style = `opacity: 1; transform: translate(${left}px, ${top}px);`;
    } else {
      style = 'opacity: 0; pointer-events: none;';
    }
  });
</script>

<!-- El resto del componente (HTML y CSS) no necesita cambios -->

<!-- El resto del componente (HTML y CSS) no necesita cambios -->
{#if $slashMenuStore.isOpen}
  <div
    class="slash-menu-container"
    bind:this={menuElement}
    style="position: absolute; top: 0; left: 0; {style}"
  >
    {#if $slashMenuStore.items.length > 0}
      {#each $slashMenuStore.items as item, index (item.title)}
        <button
          class="menu-item"
          class:is-selected={index === $slashMenuStore.selectedIndex}
          onclick={() => slashMenuStore.triggerCommandByIndex(index)}
        >
          <div class="icon-wrapper"><Icon name={item.icon} size={20} /></div>
          <span>{item.title}</span>
        </button>
      {/each}
    {:else}
      <div class="empty-state">No hay resultados</div>
    {/if}
  </div>
{/if}

<style>
  /* Copiamos los estilos exactos de `SlashMenu.svelte` aquí, ya que la UI no cambia */
  .slash-menu-container {
    will-change: transform, opacity;
    transition: opacity 0.1s ease-in-out;
    outline: none;
    background-color: var(--color-background);
    border: 1px solid var(--color-gray-100);
    border-radius: var(--space-sm);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 180px;
    z-index: 70;
  }
  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: var(--space-sm);
    border-radius: var(--space-xs);
    cursor: pointer;
    color: var(--color-text);
  }
  .menu-item.is-selected {
    background-color: var(--color-gray-100);
  }
  .icon-wrapper {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    background-color: var(--color-gray-100);
    border-radius: var(--space-xs);
    transition:
      background-color 0.2s,
      color 0.2s;
  }
  .menu-item.is-selected .icon-wrapper {
    background-color: var(--color-accent);
    color: white;
  }
  .empty-state {
    padding: var(--space-sm);
    color: var(--color-gray-500);
    font-style: italic;
    font-size: 0.9rem;
  }
  @media (prefers-color-scheme: dark) {
    .menu-item.is-selected {
      background-color: var(--color-gray-100);
    }
    .icon-wrapper {
      background-color: var(--color-gray-100);
    }
    .menu-item.is-selected .icon-wrapper {
      background-color: var(--color-accent);
      color: var(--color-background);
    }
  }
</style>
