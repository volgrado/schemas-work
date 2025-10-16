<!-- src/lib/components/editor/DocumentView.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';

  // --- Tiptap Core ---
  import { Editor, findParentNode } from '@tiptap/core';
  import * as Y from 'yjs';

  // --- Tiptap Extensions (Nativas) ---
  import Collaboration from '@tiptap/extension-collaboration';
  import Document from '@tiptap/extension-document';
  import Text from '@tiptap/extension-text';
  import Heading from '@tiptap/extension-heading';
  import Bold from '@tiptap/extension-bold';
  import Italic from '@tiptap/extension-italic';
  import Placeholder from '@tiptap/extension-placeholder';
  import Paragraph from '@tiptap/extension-paragraph';
  import ListItem from '@tiptap/extension-list-item';
  import BulletList from '@tiptap/extension-bullet-list';
  import OrderedList from '@tiptap/extension-ordered-list';
  import HorizontalRule from '@tiptap/extension-horizontal-rule';

  // --- Tiptap Extensions (Personalizadas) ---
  import { RoleExtension } from '$lib/editor/extensions/RoleExtension';
  import { SmartEnter } from '$lib/editor/extensions/SmartEnter';
  import { DynamicHighlighter } from '$lib/editor/extensions/DynamicHighlighter';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import { PositionSyncExtension } from '$lib/editor/extensions/PositionSyncExtension';
  import { NodeIdExtension } from '$lib/editor/extensions/NodeIdExtension';
  import { CardIndicatorExtension } from '$lib/editor/extensions/CardIndicatorExtension'; // *** 1. IMPORTAMOS LA NUEVA EXTENSIÓN ***

  // --- Stores y Lógica de la Aplicación ---
  import { editorStore } from '$lib/stores/editorStore';
  import { documentStore } from '$lib/stores/documentStore';
  import { debounce } from '$lib/utils/debounce';

  // --- Props y Eventos ---
  let {
    ydoc,
    initialContent = null,
    focusedNodePos = null,
  }: {
    ydoc: Y.Doc;
    initialContent?: object | null;
    focusedNodePos?: number | null;
  } = $props();

  const dispatch = createEventDispatcher<{ focusApplied: void }>();

  let element: HTMLDivElement;
  let editor = $state<Editor | null>(null);

  const syncTitleWithStore = debounce((editorInstance: Editor) => {
    if (!editorInstance || editorInstance.isDestroyed) return;

    const firstNode = editorInstance.state.doc.firstChild;

    if (
      firstNode &&
      firstNode.type.name === 'heading' &&
      firstNode.attrs.level === 1
    ) {
      const newTitle = firstNode.textContent.trim() || 'Esquema sin título';

      const currentTitleInStore = get(documentStore).metadata?.title;

      if (newTitle !== currentTitleInStore) {
        documentStore.updateTitle(newTitle);
      }
    } else {
      const currentTitleInStore = get(documentStore).metadata?.title;
      if (currentTitleInStore !== 'Esquema sin título') {
        documentStore.updateTitle('Esquema sin título');
      }
    }
  }, 750);

  $effect(() => {
    if (focusedNodePos !== null && editor && editor.isEditable) {
      const currentSelection = editor.state.selection;
      const parentListItem = findParentNode(
        (node) => node.type.name === 'listItem'
      )(currentSelection);
      if (!parentListItem || parentListItem.pos !== focusedNodePos) {
        editor.chain().focus().setNodeSelection(focusedNodePos).run();
      }
      import('svelte').then(({ tick }) =>
        tick().then(() => dispatch('focusApplied'))
      );
    }
  });

  onMount(() => {
    const editorInstance = new Editor({
      element: element,
      extensions: [
        Document,
        Paragraph,
        ListItem,
        BulletList,
        OrderedList,
        HorizontalRule,
        Text,
        Heading.configure({ levels: [1, 2, 3] }),
        Bold,
        Italic,
        RoleExtension,
        SmartEnter,
        PositionSyncExtension,
        NodeIdExtension,
        CardIndicatorExtension, // *** 2. AÑADIMOS LA EXTENSIÓN AL EDITOR ***
        Placeholder.configure({
          placeholder: ({ editor, node, pos }) => {
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              return '¿Cuál es el título de tu esquema?';
            }
            if (node.type.name === 'paragraph' && !node.textContent) {
              const parent = editor.state.doc.resolve(pos).parent;
              if (parent.firstChild === node) {
                return 'Escribe un término... (usa / para comandos)';
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
      onUpdate({ editor: updatedEditor }) {
        syncTitleWithStore(updatedEditor);

        const { selection } = updatedEditor.state;
        const listItemNode = findParentNode(
          (node) => node.type.name === 'listItem'
        )(selection);
        const newSelectedPos = listItemNode ? listItemNode.pos : null;

        editorStore.update((s) => ({
          ...s,
          doc: updatedEditor.state.doc,
          selectedNodePos: newSelectedPos,
          contentVersion: s.contentVersion + 1,
        }));
      },
    });

    editor = editorInstance;

    syncTitleWithStore(editor);

    if (initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
      documentStore.clearInitialContent();
    }

    editorStore.update((s) => ({ ...s, instance: editor }));

    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
      editorStore.set({
        instance: null,
        selectedNodePos: null,
        contentVersion: 0,
        doc: null,
      });
    };
  });
</script>

<div class="document-layout-container">
  <div bind:this={element}></div>
</div>

<style>
  .document-layout-container {
    width: 100%;
    max-width: 960px; /* Alineado con el header */
    margin: 0 auto;
    padding: var(--space-xxl) var(--space-md) 50vh var(--space-md);
  }

  :global(.prose) {
    font-family: var(--font-main);
    color: var(--color-text);
    max-width: 720px;
    margin: 0 auto;
    padding: var(--space-xl) var(--space-xxl);
    min-height: 100vh;
    outline: none;
    background-color: var(--color-background);
    border-radius: var(--space-sm);
    border: 1px solid var(--color-gray-100);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  @media (prefers-color-scheme: dark) {
    :global(.prose) {
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    }
  }

  @media (max-width: 960px) {
    .document-layout-container {
      padding: var(--space-xl) 0 50vh 0;
    }
    :global(.prose) {
      border-radius: 0;
      border-left: none;
      border-right: none;
    }
  }

  :global(.prose p),
  :global(.prose li) {
    line-height: 1.7;
  }

  :global(.prose h1) {
    font-size: 2.25rem;
    margin-top: 0;
    margin-bottom: var(--space-md);
  }

  :global(.prose h2) {
    font-size: 1.5rem;
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }

  :global(.prose h3) {
    font-size: 1.25rem;
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }

  :global(.prose hr) {
    border: none;
    border-top: 1px solid var(--color-gray-200);
    margin: var(--space-lg) 0;
  }

  :global(.prose .is-empty::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-gray-500);
    pointer-events: none;
    height: 0;
  }
</style>
