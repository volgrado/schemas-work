<!-- src/lib/components/editor/DocumentView.svelte (SOLUCIÓN FINAL DE DESACOPLAMIENTO) -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store'; // Importamos 'get' para leer el store

  // --- Tiptap Core ---
  import { Editor, findParentNode } from '@tiptap/core';

  // --- Tiptap Extensions (todas las que ya tenías) ---
  import Collaboration from '@tiptap/extension-collaboration';
  import Document from '@tiptap/extension-document';
  import Paragraph from '@tiptap/extension-paragraph';
  import Text from '@tiptap/extension-text';
  import Heading from '@tiptap/extension-heading';
  import Bold from '@tiptap/extension-bold';
  import Italic from '@tiptap/extension-italic';
  import BulletList from '@tiptap/extension-bullet-list';
  import OrderedList from '@tiptap/extension-ordered-list';
  import * as Y from 'yjs';

  // --- Lógica de la Aplicación ---
  import { FlippableListItem } from '$lib/editor/extensions/FlippableListItem';
  import { DynamicHighlighter } from '$lib/editor/extensions/DynamicHighlighter';
  import { editorStore } from '$lib/stores/editorStore';
  import { documentStore } from '$lib/stores/documentStore';
  // *** ELIMINADO ***: Ya no importamos 'cardEditorStore' aquí.
  // import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import BubbleMenu from './BubbleMenu.svelte';

  export let ydoc: Y.Doc;
  export let initialContent: object | null = null;

  let element: HTMLDivElement;
  let editor: Editor;

  // Ya no necesitamos 'lastActiveListItemPos' porque la lógica se ha simplificado
  // let lastActiveListItemPos: number | null = null;

  onMount(() => {
    editor = new Editor({
      element: element,
      extensions: [
        Document,
        Paragraph,
        Text,
        Heading.configure({ levels: [1, 2, 3] }),
        Bold,
        Italic,
        BulletList,
        OrderedList,
        FlippableListItem,
        DynamicHighlighter,
        Collaboration.configure({ document: ydoc }),
      ],
      editorProps: {
        attributes: {
          class: 'prose',
        },
      },

      // *** LÓGICA DE onUpdate COMPLETAMENTE SIMPLIFICADA ***
      onUpdate({ editor }) {
        const { selection } = editor.state;
        const listItemNode = findParentNode(
          (node) => node.type.name === 'listItem'
        )(selection);

        if (listItemNode) {
          // Si estamos en un nodo de lista, actualizamos el store con su posición.
          // Comparamos con el valor actual para evitar actualizaciones innecesarias.
          if (listItemNode.pos !== get(editorStore).selectedNodePos) {
            editorStore.update((s) => ({
              ...s,
              selectedNodePos: listItemNode.pos,
            }));
          }
        } else {
          // Si no estamos en un nodo de lista, reseteamos el store.
          if (get(editorStore).selectedNodePos !== null) {
            editorStore.update((s) => ({ ...s, selectedNodePos: null }));
          }
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
    // Reseteamos el editorStore, pero ya no necesitamos tocar el cardEditorStore.
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
    min-height: 100vh;
    outline: none;
  }

  :global(.prose p),
  :global(.prose li) {
    line-height: 1.7;
  }

  :global(.prose h1) {
    margin-top: var(--space-xl);
    margin-bottom: var(--space-md);
  }
  :global(.prose h2) {
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }
</style>
