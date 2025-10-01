<!-- src/lib/components/editor/BubbleMenu.svelte -->
<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import type { Editor } from '@tiptap/core';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { computePosition, flip, shift, offset } from '@floating-ui/dom';

  export let editor: Editor;

  let menuElement: HTMLElement;
  let isVisible = false;
  let style = 'top: -1000px; left: -1000px;';

  // Usamos 'version' como una clave para forzar el re-renderizado de los botones
  // y asegurar que su estado 'is-active' se actualice correctamente.
  let version = 0;

  // --- Definición Modular de Acciones ---
  // Cada acción ahora es un objeto que contiene todo lo que necesita:
  // su nombre, icono, el comando a ejecutar, y cómo determinar si está activo.
  const actions = [
    {
      name: 'bold',
      icon: 'bold' as const,
      command: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      name: 'italic',
      icon: 'italic' as const,
      command: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      name: 'bulletList',
      icon: 'list' as const,
      // *** USAREMOS NUESTRO COMANDO PERSONALIZADO ***
      command: () => editor.chain().focus().toggleSchemaList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      name: 'heading',
      icon: 'type' as const,
      // *** LÓGICA CORREGIDA ***
      // Usamos `setNode` para ser explícitos sobre las transformaciones,
      // en lugar del `toggleHeading` que asume la existencia de 'paragraph'.
      command: () => {
        if (editor.isActive('heading', { level: 2 })) {
          // Si ya es un heading, lo convertimos de vuelta a un 'schemaTerm'.
          editor.chain().focus().setNode('schemaTerm').run();
        } else {
          // Si es cualquier otra cosa (probablemente un 'schemaTerm'),
          // lo convertimos en un 'heading' de nivel 2.
          editor.chain().focus().setNode('heading', { level: 2 }).run();
        }
      },
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
  ];

  async function updateMenuPosition() {
    const { view } = editor;
    const { state } = view;

    // Oculta el menú si no hay selección o el elemento del menú no existe
    if (state.selection.empty || !menuElement) {
      isVisible = false;
      return;
    }

    // Crea un elemento virtual que representa la selección del usuario
    const virtualEl = {
      getBoundingClientRect: () => {
        const { from, to } = state.selection;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        return new DOMRect(
          start.left,
          start.top,
          end.right - start.left,
          end.bottom - start.top
        );
      },
    };

    isVisible = true;
    await tick(); // Espera al próximo ciclo de renderizado para que el menú sea visible

    // Calcula la posición óptima del menú usando @floating-ui/dom
    const { x, y } = await computePosition(virtualEl, menuElement, {
      placement: 'top',
      middleware: [
        offset(8),
        // Evita que el menú se solape con el header (aprox. 60px de alto)
        flip({ padding: 60 }),
        // Evita que el menú se salga de los bordes de la pantalla
        shift({ padding: 10 }),
      ],
    });

    style = `left: ${x}px; top: ${y}px;`;
  }

  // Hook que se ejecuta cada vez que el contenido o la selección del editor cambian
  const handleUpdate = () => {
    updateMenuPosition();
    version++; // Incrementa para forzar el re-renderizado
  };

  onMount(() => {
    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);
  });

  onDestroy(() => {
    editor.off('update', handleUpdate);
    editor.off('selectionUpdate', handleUpdate);
  });
</script>

<div
  class="bubble-menu-container"
  class:is-visible={isVisible}
  {style}
  bind:this={menuElement}
>
  {#key version}
    {#each actions as action}
      <button
        class="menu-button"
        class:is-active={action.isActive()}
        onclick={action.command}
        aria-label={action.name}
      >
        <Icon name={action.icon} size={18} />
      </button>
    {/each}
  {/key}
</div>

<style>
  .bubble-menu-container {
    position: absolute;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs);
    border-radius: var(--space-sm);

    /* Z-index mayor que el AppHeader (50) para que aparezca por encima */
    z-index: 60;

    will-change: top, left, opacity;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 0.15s ease-in-out,
      visibility 0.15s ease-in-out;

    /* Estilos por defecto para tema oscuro */
    background-color: var(--color-gray-100);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  }

  .bubble-menu-container.is-visible {
    opacity: 1;
    visibility: visible;
    pointer-events: all;
  }

  /* Estilos para tema claro */
  @media (prefers-color-scheme: light) {
    .bubble-menu-container {
      background-color: var(--color-text);
      color: var(--color-background);
      border: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  .menu-button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    color: inherit;
    opacity: 0.7;
    border-radius: var(--space-xs);
    cursor: pointer;
    transition:
      opacity 0.2s,
      background-color 0.2s,
      color 0.2s;
  }

  .menu-button:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.1);
  }

  .menu-button.is-active {
    opacity: 1;
    color: var(--color-accent);
  }
</style>
