<!-- src/lib/components/editor/BubbleMenu.svelte (SOLUCIÓN FINAL CON Z-INDEX Y FLIP CORREGIDOS) -->
<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import type { Editor } from '@tiptap/core';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { computePosition, flip, shift, offset } from '@floating-ui/dom';
  import { Toaster } from 'svelte-sonner';

  export let editor: Editor;

  let menuElement: HTMLElement;
  let isVisible = false;
  let style = 'top: -1000px; left: -1000px;';

  let version = 0;

  const actions = [
    {
      name: 'bold',
      icon: 'bold',
      command: () => editor.chain().focus().toggleBold().run(),
    },
    {
      name: 'italic',
      icon: 'italic',
      command: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      name: 'bulletList',
      icon: 'list',
      command: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      name: 'heading',
      icon: 'type',
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
  ] as const;

  async function updateMenuPosition() {
    const { view } = editor;
    const { state } = view;

    if (state.selection.empty || !menuElement) {
      isVisible = false;
      return;
    }

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
    await tick();

    const { x, y } = await computePosition(virtualEl, menuElement, {
      placement: 'top',
      middleware: [
        offset(8),
        // --- *** MEJORA DE POSICIONAMIENTO *** ---
        // El AppHeader tiene unos 50px de alto. Al poner un padding de 60px,
        // forzamos al menú a "voltearse" (flip) hacia abajo mucho antes,
        // evitando por completo el área del header.
        flip({ padding: 60 }),
        shift({ padding: 10 }),
      ],
    });

    style = `left: ${x}px; top: ${y}px;`;
  }

  const handleUpdate = () => {
    updateMenuPosition();
    version++;
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

<Toaster position="bottom-center" />

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
        class:is-active={editor.isActive(action.name) ||
          (action.name === 'heading' &&
            editor.isActive('heading', { level: 2 }))}
        on:click={action.command}
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

    /* --- *** CORRECCIÓN DE APILAMIENTO (Z-INDEX) *** --- */
    /* El AppHeader tiene z-index: 50. Este valor debe ser MAYOR. */
    z-index: 60;

    will-change: top, left, opacity;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 0.15s ease-in-out,
      visibility 0.15s ease-in-out;
    background-color: var(--color-gray-100);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  }

  /* El resto del CSS no necesita cambios */
  .bubble-menu-container.is-visible {
    opacity: 1;
    visibility: visible;
    pointer-events: all;
  }

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
