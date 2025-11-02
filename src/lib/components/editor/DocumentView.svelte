<!--
  @component
  DocumentView

  This is the core component of the application's rich text editor.
  This version uses a store-based command system to handle deep-linking from search,
  avoiding any changes to the URL.
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import type { Node as ProseMirrorNode } from 'prosemirror-model';

  // --- Tiptap Core & Extensions ---
  import { Editor } from '@tiptap/core';
  import { NodeSelection } from 'prosemirror-state';
  import * as Y from 'yjs';
  import Collaboration from '@tiptap/extension-collaboration';
  import Document from '@tiptap/extension-document';
  import Text from '@tiptap/extension-text';
  import Heading from '@tiptap/extension-heading';
  import Bold from '@tiptap/extension-bold';
  import Italic from '@tiptap/extension-italic';
  import Placeholder from '@tiptap/extension-placeholder';
  import Paragraph from '@tiptap/extension-paragraph';
  import HorizontalRule from '@tiptap/extension-horizontal-rule';
  // Image from tiptap/extension-image is no longer directly used. We use our custom one.
  import YouTube from '@tiptap/extension-youtube';
  import Gapcursor from '@tiptap/extension-gapcursor'; // <-- ADDED: For better block-level node interaction

  // --- Custom Application-Specific Extensions ---
  import { ResizableImage } from '$lib/editor/extensions/ResizableImage'; // <-- ADDED: Our new custom image extension
  import { DynamicHighlighter } from '$lib/editor/extensions/DynamicHighlighter';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import { NodeIdExtension } from '$lib/editor/extensions/NodeIdExtension';
  import { MathInline, MathBlock } from '$lib/editor/extensions/Math';

  // --- Stores & Utilities ---
  import { editorStore } from '$lib/stores/editorStore';
  import { documentStore } from '$lib/stores/documentStore';
  import { modalStore } from '$lib/stores/modalStore';
  import { debounce } from '$lib/utils/debounce';
  import { t } from '$lib/utils/i18n';
  import * as neuralIndexService from '$lib/services/ai/neuralIndexService';

  // --- Component Properties ---
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
    // ... (This function is unchanged)
    if (!editorInstance || editorInstance.isDestroyed) return;
    const firstNode = editorInstance.state.doc.firstChild;
    let newTitle = get(t)('doc_view.untitled_schema');
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
  }, 750);

  // --- This effect for store-based focus commands is unchanged ---
  $effect(() => {
    const nodeIdToFocus = $documentStore.focusedNodeId;
    if (editor && nodeIdToFocus) {
      let targetPos: number | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.attrs.nodeId === nodeIdToFocus) {
          targetPos = pos;
          return false;
        }
      });
      if (targetPos !== null) {
        editor.chain().focus().setNodeSelection(targetPos).run();
        const domNode = editor.view.dom.querySelector(
          `[data-node-id="${nodeIdToFocus}"]`
        );
        domNode?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        documentStore.clearFocusCommand();
      }
    }
  });

  // --- This effect for internal focus is unchanged ---
  $effect(() => {
    if (focusedNodePos !== null && editor && editor.isEditable) {
      const { selection } = editor.state;
      const targetNode = editor.state.doc.nodeAt(focusedNodePos);
      if (!targetNode) return;
      const nodeStart = focusedNodePos;
      const nodeEnd = focusedNodePos + targetNode.nodeSize;

      if (selection.from >= nodeStart && selection.to <= nodeEnd) {
        return;
      }
      if (targetNode.type.name === 'heading') {
        editor.chain().focus().setNodeSelection(focusedNodePos).run();
      }
      import('svelte').then(({ tick }) =>
        tick().then(() => dispatch('focusApplied'))
      );
    }
  });

  onMount(() => {
    let selectionUpdateTimeout: ReturnType<typeof setTimeout>;
    let clearSelectionTimeout: ReturnType<typeof setTimeout>;

    const editorInstance = new Editor({
      element: element,
      extensions: [
        Document,
        Paragraph,
        HorizontalRule,
        Text,
        Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
        Bold,
        Italic,
        YouTube.configure({}),
        MathInline,
        MathBlock,
        NodeIdExtension,
        DynamicHighlighter,
        SlashCommandExtension,
        Collaboration.configure({ document: ydoc }),
        Gapcursor, // <-- ADDED
        Placeholder.configure({
          placeholder: ({ editor, node, pos }) => {
            const _t = get(t);
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              return _t('doc_view.placeholder.title');
            }
            if (node.type.name === 'paragraph' && !node.textContent) {
              if (pos > 0) {
                const nodeBefore = editor.state.doc.resolve(pos - 1).nodeBefore;
                if (nodeBefore && nodeBefore.type.name === 'heading') {
                  return _t('doc_view.placeholder.description');
                }
              }
              return _t('doc_view.placeholder.term');
            }
            return '';
          },
        }),
        // --- VVVV  CHANGED: The old Image.extend block has been replaced  VVVV ---
        ResizableImage.configure({
          // We can add configuration here later if needed
        }),
        // --- ^^^^ Your old Image.extend block is now removed. ^^^^ ---
      ],
      editorProps: {
        attributes: { class: 'prose' },
      },
      onUpdate({ editor: updatedEditor }) {
        // (This function is unchanged)
        syncTitleWithStore(updatedEditor);
        const currentDocId = get(documentStore).docId;
        if (currentDocId) {
          neuralIndexService.indexDocument(
            currentDocId,
            updatedEditor.state.doc
          );
        }
        editorStore.update((s) => ({
          ...s,
          doc: updatedEditor.state.doc,
          contentVersion: s.contentVersion + 1,
        }));
      },
      onSelectionUpdate({ editor: updatedEditor }) {
        // (This function is unchanged)
        const { selection } = updatedEditor.state;
        let newSelectedNode: ProseMirrorNode | null = null;
        let newSelectedPos: number | null = null;
        if (
          selection instanceof NodeSelection &&
          selection.node.type.name === 'heading' &&
          !selection.empty
        ) {
          newSelectedNode = selection.node;
          newSelectedPos = selection.from;
        } else if (selection.empty) {
          const { $from: resolvedPos } = selection;
          const parentNode = resolvedPos.parent;
          if (parentNode.type.name === 'heading') {
            const headingStart = resolvedPos.start();
            const headingEnd = resolvedPos.end();
            if (selection.from > headingStart && selection.to < headingEnd) {
              newSelectedNode = parentNode;
              newSelectedPos = resolvedPos.before(resolvedPos.depth);
            }
          }
        }
        if (newSelectedPos !== null) {
          clearTimeout(clearSelectionTimeout);
          clearTimeout(selectionUpdateTimeout);
          selectionUpdateTimeout = setTimeout(() => {
            if (get(editorStore).selectedNodePos !== newSelectedPos) {
              editorStore.update((s) => ({
                ...s,
                selectedNode: newSelectedNode,
                selectedNodePos: newSelectedPos,
              }));
            }
          }, 50);
        } else {
          clearTimeout(selectionUpdateTimeout);
          clearTimeout(clearSelectionTimeout);
          clearSelectionTimeout = setTimeout(() => {
            if (get(editorStore).selectedNodePos !== null) {
              editorStore.update((s) => ({
                ...s,
                selectedNode: null,
                selectedNodePos: null,
              }));
            }
          }, 150);
        }
      },
    });

    editor = editorInstance;
    syncTitleWithStore(editor);

    if (initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
      const currentDocId = get(documentStore).docId;
      if (currentDocId) {
        neuralIndexService.indexDocument(currentDocId, editor.state.doc);
      }
      documentStore.clearInitialContent();
    }
    editorStore.update((s) => ({ ...s, instance: editor }));

    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
      if (get(editorStore).instance === editor) {
        editorStore.set({
          instance: null,
          selectedNodePos: null,
          selectedNode: null,
          contentVersion: 0,
          doc: null,
        });
      }
    };
  });
</script>

<div class="document-layout-container">
  <div bind:this={element}></div>
</div>

<style>
  /* This is the base layout container for the document view */
  .document-layout-container {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: var(--space-xxl) var(--space-md) 50vh var(--space-md);
  }

  /* This global selector targets the Tiptap editor element and its contents */
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

  /* --- Explicit styles for bold and italic text --- */
  :global(.prose strong),
  :global(.prose b) {
    font-weight: bold;
  }

  :global(.prose em),
  :global(.prose i) {
    font-style: italic;
  }

  /* --- Styles for additional heading levels --- */
  :global(.prose h4) {
    font-size: 1.25em;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  :global(.prose h5) {
    font-size: 1.1em;
    margin-top: 1.25em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  :global(.prose h6) {
    font-size: 1em;
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
    color: var(--color-gray-600);
  }

  /* --- CORRECTED & FINAL: CSS for Resizable Images --- */

  /* The wrapper our NodeView creates around the image */
  :global(.prose .resizable-image-wrapper) {
    position: relative; /* Crucial for positioning the handles */
    display: inline-block;
    line-height: 0; /* Removes extra space below the image */
    max-width: 100%;
    clear: both;
  }

  /* The actual image inside the wrapper */
  :global(.prose .resizable-image-wrapper img) {
    max-width: 100%;
    height: auto;
    cursor: grab; /* Indicates the image can be moved */
  }

  /* Add a visual outline when the image node is selected */
  :global(.prose .ProseMirror-selectednode .resizable-image-wrapper) {
    outline: 3px solid #68b4f2; /* Use your app's primary color variable if you have one */
  }

  /* Hide the resize handles by default */
  :global(.prose .resize-handle) {
    display: none;
  }

  /* Show handles ONLY when the parent node is selected */
  :global(.prose .ProseMirror-selectednode .resize-handle) {
    display: block;
    position: absolute;
    width: 12px;
    height: 12px;
    background: #68b4f2;
    border: 2px solid white;
    border-radius: 2px;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    z-index: 10; /* Ensures handles are always on top of the image */
  }

  /* Position each of the four handles */
  :global(.prose .resize-handle.top-left) {
    top: -6px;
    left: -6px;
    cursor: nwse-resize;
  }
  :global(.prose .resize-handle.top-right) {
    top: -6px;
    right: -6px;
    cursor: nesw-resize;
  }
  :global(.prose .resize-handle.bottom-left) {
    bottom: -6px;
    left: -6px;
    cursor: nesw-resize;
  }
  :global(.prose .resize-handle.bottom-right) {
    bottom: -6px;
    right: -6px;
    cursor: nwse-resize;
  }
</style>
