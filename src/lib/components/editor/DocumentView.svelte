<!-- src/lib/components/editor/DocumentView.svelte (VERSIÓN REACTIVA Y DESACOPLADA) -->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';

  // --- Tiptap Core ---
  import { Editor, findParentNode } from '@tiptap/core';
  import * as Y from 'yjs';

  // --- Tiptap Extensions (Nativas) ---
  import Collaboration from '@tiptap/extension-collaboration';
  import Document from '@tiptap/extension-document';
  import Text from '@tiptap/extension-text';
  import History from '@tiptap/extension-history';
  import Heading from '@tiptap/extension-heading';
  import Bold from '@tiptap/extension-bold';
  import Italic from '@tiptap/extension-italic';
  import Placeholder from '@tiptap/extension-placeholder';
  import Paragraph from '@tiptap/extension-paragraph';
  import ListItem from '@tiptap/extension-list-item';
  import BulletList from '@tiptap/extension-bullet-list';

  // --- Tiptap Extensions (Personalizadas) ---
  import { RoleExtension } from '$lib/editor/extensions/RoleExtension';
  import { SmartEnter } from '$lib/editor/extensions/SmartEnter';
  import { DynamicHighlighter } from '$lib/editor/extensions/DynamicHighlighter';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import { PositionSyncExtension } from '$lib/editor/extensions/PositionSyncExtension';

  // --- Stores y Lógica de la Aplicación ---
  import { editorStore } from '$lib/stores/editorStore';
  import { documentStore } from '$lib/stores/documentStore';

  // --- Componentes de UI ---
  import BubbleMenu from './BubbleMenu.svelte';

  // --- Props y Eventos ---
  let {
    ydoc,
    initialContent = null,
    focusedNodePos = null,
  }: {
    ydoc: Y.Doc;
    initialContent?: object | null;
    focusedNodePos?: number | null; // Prop para controlar el foco desde fuera
  } = $props();

  const dispatch = createEventDispatcher<{ focusApplied: void }>();

  let element: HTMLDivElement;
  let editor: Editor;

  // --- EFECTO REACTIVO para manejar las solicitudes de foco ---
  $effect(() => {
    // Solo actuar si se nos pide enfocar un nodo y el editor está listo.
    if (focusedNodePos !== null && editor && editor.isEditable) {
      // Comprobamos si ya estamos en el nodo correcto para evitar bucles.
      const currentSelection = editor.state.selection;
      const parentListItem = findParentNode(
        (node) => node.type.name === 'listItem'
      )(currentSelection);

      if (!parentListItem || parentListItem.pos !== focusedNodePos) {
        editor.chain().focus().setNodeSelection(focusedNodePos).run();
      }

      // Notificamos al padre que hemos completado la acción, para que pueda resetear la prop.
      // Usamos tick() para asegurar que se despacha después de la actualización del DOM.
      import('svelte').then(({ tick }) =>
        tick().then(() => dispatch('focusApplied'))
      );
    }
  });

  onMount(() => {
    editor = new Editor({
      element: element,
      extensions: [
        Document,
        Paragraph,
        ListItem,
        BulletList,
        Text,
        History,
        Heading.configure({ levels: [1, 2, 3] }),
        Bold,
        Italic,
        RoleExtension,
        SmartEnter,
        PositionSyncExtension,
        Placeholder.configure({
          placeholder: ({ editor, node, pos }) => {
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              return '¿Cuál es el título de tu esquema?';
            }
            if (node.type.name === 'paragraph' && !node.textContent) {
              const parent = editor.state.doc.resolve(pos).parent;
              if (parent.firstChild === node) {
                return 'Escribe un término... (usa Tab para anidar)';
              }
            }
            if (
              node.type.name === 'paragraph' &&
              !node.textContent &&
              node.attrs.role === 'description'
            ) {
              return 'Añade una descripción (opcional)';
            }
            return '';
          },
        }),
        DynamicHighlighter,
        SlashCommandExtension,
        Collaboration.configure({ document: ydoc }),
      ],
      editorProps: {
        attributes: {
          class: 'prose',
        },
      },
      onUpdate({ editor }) {
        const { selection } = editor.state;
        const listItemNode = findParentNode(
          (node) => node.type.name === 'listItem'
        )(selection);

        // Actualizamos el store global con la posición del nodo seleccionado actualmente.
        const currentSelectedPos = get(editorStore).selectedNodePos;
        const newSelectedPos = listItemNode ? listItemNode.pos : null;

        if (currentSelectedPos !== newSelectedPos) {
          editorStore.update((s) => ({
            ...s,
            selectedNodePos: newSelectedPos,
          }));
        }
      },
    });

    if (initialContent) {
      editor.commands.setContent(initialContent);
      documentStore.clearInitialContent();
    }

    editorStore.update((s) => ({ ...s, instance: editor }));
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
    editorStore.set({ instance: null, selectedNodePos: null });
  });
</script>

{#if editor}
  <BubbleMenu {editor} />
{/if}

<div bind:this={element}></div>

<style>
  :global(.prose) {
    font-family: var(--font-main);
    color: var(--color-text);
    max-width: 720px;
    margin: 0 auto;
    padding: var(--space-xxl) var(--space-md);
    padding-bottom: 50vh;
    min-height: 100vh;
    outline: none;
  }

  :global(.prose p),
  :global(.prose li) {
    line-height: 1.7;
  }

  :global(.prose h1) {
    font-size: 2.25rem;
    margin-top: var(--space-xl);
    margin-bottom: var(--space-md);
  }

  :global(.prose h2) {
    font-size: 1.5rem;
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }

  :global(.prose .is-empty::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-gray-500);
    pointer-events: none;
    height: 0;
  }
</style>
