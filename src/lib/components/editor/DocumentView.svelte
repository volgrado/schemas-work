<!--
  @component
  DocumentView

  This is the core component of the application, responsible for rendering the rich text editor.
  It leverages the Tiptap editor framework, configured with numerous extensions to provide a powerful
  and flexible editing experience.

  Key Responsibilities:
  - Instantiates and configures the Tiptap editor.
  - Binds the editor to a Yjs collaborative document (`ydoc`) for real-time sync.
  - Manages a wide array of Tiptap extensions, including custom-built ones for application-specific features
    (e.g., `RoleExtension`, `NodeIdExtension`, `SlashCommandExtension`, `CardIndicatorExtension`).
  - Synchronizes the document's title (the first H1 heading) with the `documentStore`.
  - Handles editor updates, propagating changes to the `editorStore`. This component is the *only* writer to the store.
  - Manages editor focus and selection, particularly when navigating from other parts of the UI.
  - Provides custom node views for enhanced rendering and interaction with elements like Images.
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import type { Node as ProseMirrorNode } from 'prosemirror-model'; // <-- Import ProseMirrorNode type

  // --- Tiptap Core & Extensions ---
  import { Editor, findParentNode } from '@tiptap/core';
  import { NodeSelection } from 'prosemirror-state'; // <-- Import NodeSelection type
  import * as Y from 'yjs';
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
  import Image from '@tiptap/extension-image';
  import YouTube from '@tiptap/extension-youtube';

  // --- Custom Application-Specific Extensions ---
  import { RoleExtension } from '$lib/editor/extensions/RoleExtension';
  import { SmartEnter } from '$lib/editor/extensions/SmartEnter';
  import { DynamicHighlighter } from '$lib/editor/extensions/DynamicHighlighter';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import { NodeIdExtension } from '$lib/editor/extensions/NodeIdExtension';
  import { CardIndicatorExtension } from '$lib/editor/extensions/CardIndicatorExtension';
  import { MathInline, MathBlock } from '$lib/editor/extensions/Math';

  // --- Stores & Utilities ---
  import { editorStore } from '$lib/stores/editorStore';
  import { documentStore } from '$lib/stores/documentStore';
  import { modalStore } from '$lib/stores/modalStore';
  import { debounce } from '$lib/utils/debounce';
  import { t } from '$lib/utils/i18n';

  // --- Component Properties ---
  let {
    ydoc, // The Yjs document for collaborative editing.
    initialContent = null, // The content to load if the Yjs doc is empty.
    focusedNodePos = null, // The position to focus on when the component mounts.
  }: {
    ydoc: Y.Doc;
    initialContent?: object | null;
    focusedNodePos?: number | null;
  } = $props();

  const dispatch = createEventDispatcher<{ focusApplied: void }>();

  let element: HTMLDivElement; // The DOM element where the editor will be mounted.
  let editor = $state<Editor | null>(null);

  /**
   * Debounced function to synchronize the document's title (the first h1 node)
   * with the global documentStore. This avoids excessive updates while typing.
   */
  const syncTitleWithStore = debounce((editorInstance: Editor) => {
    if (!editorInstance || editorInstance.isDestroyed) return;

    const firstNode = editorInstance.state.doc.firstChild;
    let newTitle = $t('doc_view.untitled_schema');

    if (
      firstNode &&
      firstNode.type.name === 'heading' &&
      firstNode.attrs.level === 1
    ) {
      newTitle = firstNode.textContent.trim() || newTitle;
    }

    const currentTitleInStore = get(documentStore).metadata?.title;
    if (newTitle !== currentTitleInStore) {
      documentStore.updateTitle(newTitle);
    }
  }, 750); // 750ms debounce interval

  /**
   * This effect hook is responsible for focusing a specific node when the component is loaded
   * with a `focusedNodePos` prop. This is used for navigating from other parts of the app
   * directly to a specific piece of content.
   */
  $effect(() => {
    if (focusedNodePos !== null && editor && editor.isEditable) {
      // Check if the desired node is already selected to avoid redundant focus calls.
      const currentSelection = editor.state.selection;
      const parentListItem = findParentNode(
        (node) => node.type.name === 'listItem'
      )(currentSelection);
      if (!parentListItem || parentListItem.pos !== focusedNodePos) {
        editor.chain().focus().setNodeSelection(focusedNodePos).run();
      }
      // Dispatch an event after focus is applied.
      import('svelte').then(({ tick }) =>
        tick().then(() => dispatch('focusApplied'))
      );
    }
  });

  onMount(() => {
    const editorInstance = new Editor({
      element: element,
      extensions: [
        // --- Standard Tiptap Extensions ---
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
        YouTube.configure({}),
        MathInline,
        MathBlock,

        // --- Custom Application Extensions ---
        RoleExtension, // Adds a 'role' attribute to nodes (e.g., 'description').
        SmartEnter, // Custom logic for Enter key presses.
        NodeIdExtension, // Ensures every node has a unique, persistent ID.
        CardIndicatorExtension, // Displays an icon on nodes that have flashcards.
        DynamicHighlighter, // Applies dynamic highlights based on certain criteria.
        SlashCommandExtension, // Powers the '/' command menu.

        // --- Collaboration ---
        Collaboration.configure({ document: ydoc }),

        // --- Placeholder Text ---
        Placeholder.configure({
          placeholder: ({ editor, node, pos }) => {
            const _t = get(t);
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              return _t('doc_view.placeholder.title');
            }
            if (node.type.name === 'paragraph' && !node.textContent) {
              const parent = editor.state.doc.resolve(pos).parent;
              if (parent.firstChild === node) {
                return _t('doc_view.placeholder.term');
              }
            }
            if (
              node.type.name === 'paragraph' &&
              !node.textContent &&
              node.attrs.role === 'description'
            ) {
              return _t('doc_view.placeholder.description');
            }
            return '';
          },
        }),

        // --- Custom Node View for Images ---
        Image.extend({
          addNodeView() {
            return ({ node, getPos, editor }) => {
              const container = document.createElement('div');
              container.classList.add('image-view');
              const img = document.createElement('img');
              img.setAttribute('src', node.attrs.src);
              container.append(img);

              if (editor.isEditable) {
                const button = document.createElement('button');
                button.classList.add('edit-button');
                button.innerText = get(t)('doc_view.media.edit_button');
                button.addEventListener('click', () => {
                  const pos = getPos();
                  if (pos === undefined) return;
                  modalStore.open({
                    type: 'media',
                    nodeType: 'image',
                    nodePos: pos,
                    attrs: node.attrs,
                  });
                });
                container.append(button);
              }
              return { dom: container };
            };
          },
        }).configure({}),
      ],
      editorProps: {
        attributes: { class: 'prose' },
      },
      onUpdate({ editor: updatedEditor }) {
        // On every update, sync the title and update the global editor store.
        syncTitleWithStore(updatedEditor);

        const { selection, doc } = updatedEditor.state;
        const listItemNode = findParentNode(
          (node) => node.type.name === 'listItem'
        )(selection);
        const newSelectedPos = listItemNode ? listItemNode.pos : null;

        // MODIFIED: Derive the selected node from the position
        const newSelectedNode: ProseMirrorNode | null =
          newSelectedPos !== null ? doc.nodeAt(newSelectedPos) || null : null;

        editorStore.update((s) => ({
          ...s,
          doc: doc,
          selectedNodePos: newSelectedPos,
          selectedNode: newSelectedNode, // <-- ADDED: Pass the selected node to the store
          contentVersion: s.contentVersion + 1,
        }));
      },
    });

    editor = editorInstance;

    // Sync title on initial load.
    syncTitleWithStore(editor);

    if (initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
      documentStore.clearInitialContent();
    }

    editorStore.update((s) => ({ ...s, instance: editor }));

    // --- Cleanup ---
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
      // MODIFIED: Reset the full editor store state on component destruction.
      editorStore.set({
        instance: null,
        selectedNodePos: null,
        selectedNode: null, // <-- ADDED: Reset the selected node
        contentVersion: 0,
        doc: null,
      });
    };
  });
</script>

<!-- The container where the Tiptap editor will be rendered -->
<div class="document-layout-container">
  <div bind:this={element}></div>
</div>

<style>
  /* Scoped styles for the document view layout */
  .document-layout-container {
    width: 100%;
    max-width: 960px; /* Provides max width for large screens */
    margin: 0 auto;
    padding: var(--space-xxl) var(--space-md) 50vh var(--space-md); /* Vertical padding to center content */
  }

  /* Global styles for the Tiptap .prose element */
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
    box-shadow: var(--shadow-md);
  }

  /* --- Dark Mode Styles --- */
  :global(.dark-theme .prose) {
    border-color: var(--color-border-dark);
    box-shadow: var(--shadow-dark-md);
  }

  /* --- Responsive Adjustments --- */
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

  /* --- Typography & Element Styling --- */
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

  /* --- Placeholder Styles --- */
  :global(.prose .is-empty::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-gray-400);
    pointer-events: none;
    height: 0;
  }
</style>
