<!--
  @component
  DocumentView

  This is the core component of the application's rich text editor. It is responsible for
  instantiating the Tiptap editor, loading all the necessary extensions (including the
  custom Math, Image, and NodeID extensions), and binding it to the DOM. It also handles
  editor events to sync state with various Svelte stores.
-->
<script lang="ts">
  import { onMount, createEventDispatcher, onDestroy } from 'svelte';
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
  import YouTube from '@tiptap/extension-youtube';
  import Gapcursor from '@tiptap/extension-gapcursor';

  // --- Custom Application-Specific Extensions ---
  import { ResizableImage } from '$lib/editor/extensions/ResizableImage';
  import { DynamicHighlighter } from '$lib/editor/extensions/DynamicHighlighter';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import { NodeIdExtension } from '$lib/editor/extensions/NodeIdExtension';
  // This import now points to our refactored Math.ts with the modal logic.
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
    console.log('[LOG] DocumentView.svelte: onMount hook triggered.');
    let selectionUpdateTimeout: ReturnType<typeof setTimeout>;
    let clearSelectionTimeout: ReturnType<typeof setTimeout>;

    const extensionsToLoad = [
      Document,
      Paragraph,
      HorizontalRule,
      Text,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      Bold,
      Italic,
      YouTube.configure({}),
      MathInline, // Our refactored inline math node
      MathBlock, // Our refactored block math node
      NodeIdExtension,
      DynamicHighlighter,
      SlashCommandExtension,
      Collaboration.configure({ document: ydoc }),
      Gapcursor,
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
      ResizableImage.configure({}),
    ];

    const extensionNames = extensionsToLoad.map(
      (ext) => ext.name || 'UnknownExtension'
    );
    console.log(
      '[LOG] DocumentView.svelte: Initializing Tiptap editor with these extensions:',
      extensionNames
    );
    if (!extensionNames.includes('math_block')) {
      console.error(
        '[CRITICAL] DocumentView.svelte: "math_block" extension is NOT in the extensions list! This is the cause of the problem.'
      );
    }

    const editorInstance = new Editor({
      element: element,
      extensions: extensionsToLoad,
      editorProps: {
        attributes: { class: 'prose' },
      },
      onUpdate({ editor: updatedEditor }) {
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

    console.log(
      '[LOG] DocumentView.svelte: Tiptap editor instance has been created.'
    );
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
      console.log(
        '[LOG] DocumentView.svelte: Cleanup function running. Destroying editor instance.'
      );
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
  .document-layout-container {
    width: 100%;
    max-width: 960px;
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
    box-shadow: var(--shadow-md);
  }

  :global(.prose strong),
  :global(.prose b) {
    font-weight: bold;
  }

  :global(.prose em),
  :global(.prose i) {
    font-style: italic;
  }

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

  :global(.prose .resizable-image-wrapper) {
    position: relative;
    display: inline-block;
    line-height: 0;
    max-width: 100%;
    clear: both;
  }
  :global(.prose .resizable-image-wrapper img) {
    max-width: 100%;
    height: auto;
    cursor: grab;
  }
  :global(.prose .ProseMirror-selectednode .resizable-image-wrapper) {
    outline: 3px solid #68b4f2;
  }
  :global(.prose .resize-handle) {
    display: none;
  }
  :global(.prose .ProseMirror-selectednode .resize-handle) {
    display: block;
    position: absolute;
    width: 12px;
    height: 12px;
    background: #68b4f2;
    border: 2px solid white;
    border-radius: 2px;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }
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

  :global(.prose .math-block-node-view-wrapper) {
    position: relative;
    margin: 1em 0;
  }

  :global(.prose .katex-preview) {
    padding: var(--space-md);
    border: 1px dashed var(--color-gray-200);
    border-radius: var(--space-sm);
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :global(.prose .katex-preview:hover) {
    background-color: var(--color-gray-50);
    border-color: var(--color-gray-400);
  }
  :global(.prose .katex) {
    color: inherit;
  }
  .dark-theme :global(.prose .katex-preview:hover) {
    background-color: var(--color-gray-800);
    border-color: var(--color-gray-600);
  }

  :global(.prose .editor-container) {
    background: var(--color-background-raised);
    border: 1px solid var(--color-accent);
    border-radius: var(--space-sm);
    box-shadow: var(--shadow-md);
  }

  :global(.prose .latex-editor-textarea) {
    width: 100%;
    font-family: var(--font-mono);
    padding: var(--space-md);
    border: none;
    border-top: 1px solid var(--color-border);
    background-color: transparent;
    resize: vertical;
    outline: none;
    color: inherit;
  }

  :global(.prose .symbol-toolbar) {
    display: flex;
    padding: var(--space-xs);
    gap: var(--space-xs);
  }
  :global(.prose .symbol-toolbar button) {
    font-family: var(--font-main);
    font-size: 1rem;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--space-xs);
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    color: var(--color-text-tertiary);
  }
  :global(.prose .symbol-toolbar button:hover) {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }

  :global(.prose .help-pane) {
    position: absolute;
    top: 0;
    left: calc(100% + var(--space-md));
    width: 220px;
    background-color: var(--color-background-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--space-md);
    padding: var(--space-md);
    font-size: 0.8rem;
    box-shadow: var(--shadow-lg);
    z-index: var(--z-slash-menu);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease-in-out;
  }

  :global(.prose .math-block-node-view-wrapper:focus-within .help-pane) {
    opacity: 1;
    visibility: visible;
  }

  :global(.prose .help-pane h4) {
    margin: 0 0 var(--space-sm) 0;
    font-weight: 600;
    font-size: inherit;
  }
  :global(.prose .help-pane ul) {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-md) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  :global(.prose .help-pane code) {
    background: var(--color-gray-100);
    padding: 2px 4px;
    border-radius: 4px;
  }
  :global(.prose .help-pane a) {
    font-size: 0.75rem;
    color: var(--color-accent);
    text-decoration: none;
  }
  .dark-theme :global(.prose .help-pane code) {
    background-color: var(--color-gray-700);
  }

  @media (max-width: 1024px) {
    :global(.prose .help-pane) {
      display: none;
    }
  }
</style>
