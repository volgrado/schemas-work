/**
 * @file EditorController.ts
 * @module editor
 * @description
 * The main controller logic for the Tiptap editor instance.
 *
 * This class handles:
 * - Editor initialization and configuration (extensions, props).
 * - Reactivity bindings to the `editorStore`.
 * - State synchronization (title, neural index, persistence).
 * - Handling of collaborative editing updates via Yjs.
 * - Dynamic extension loading for performance.
 * - View updates for highlighting and color modes.
 */

import { Editor } from '@tiptap/core';
import type { EditorEvents } from '@tiptap/core';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { i18n } from '$lib/utils/i18n.svelte';
import Collaboration from '@tiptap/extension-collaboration';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Placeholder from '@tiptap/extension-placeholder';
import Paragraph from '@tiptap/extension-paragraph';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { NodeIdExtension } from '$lib/modules/editor/infra/extensions/NodeIdExtension';
import { SlashCommandExtension } from '$lib/modules/editor/infra/extensions/SlashCommandExtension';
import {
  DynamicHighlighter,
  DYNAMIC_HIGHLIGHTER_PLUGIN_KEY,
} from '$lib/modules/editor/infra/extensions/DynamicHighlighter';
import { ColorModeExtension } from '$lib/modules/editor/infra/extensions/ColorModeExtension';
import {
  setInstance,
  updateSelection,
  syncState,
  destroyEditor,
} from '$lib/modules/editor/ui/editorStore.svelte';
import {
  documentState,
  updateTitle,
  clearInitialContent,
} from '$lib/modules/editor/ui/documentStore.svelte';
import { neuralIndexService } from '$lib/modules/ai/neuralIndexService';
import { debounce } from '$lib/core/utils/debounce';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Configuration options for the EditorController.
 */
export interface EditorControllerOptions {
  /** The HTML element to mount the editor into. */
  element: HTMLElement;
  /** The Y.js document for collaboration/persistence. */
  ydoc: Y.Doc;
  /** The Y-IndexedDB provider (optional, for offline sync status). */
  provider: IndexeddbPersistence | null;
  /** Initial content to seed the document with (e.g., from a template or AI). */
  initialContent?: object | null;
}

export class EditorController {
  public editor: Editor | null = null;
  private options: EditorControllerOptions;
  private cleanupProvider: (() => void) | undefined;

  constructor(options: EditorControllerOptions) {
    this.options = options;
  }

  /**
   * Initializes and mounts the Tiptap editor.
   * Dynamically imports heavy extensions (Math, YouTube) to optimize initial load.
   */
  public async mount(): Promise<void> {
    const { element, ydoc, provider, initialContent } = this.options;

    // Performance Optimization: Lazy load heavy/optional extensions.
    const [
      { default: YouTube },
      { ResizableImage },
      { MathInline, MathBlock },
    ] = await Promise.all([
      import('@tiptap/extension-youtube'),
      import('$lib/modules/editor/infra/extensions/ResizableImage'),
      import('$lib/modules/editor/infra/extensions/Math'),
    ]);

    this.editor = new Editor({
      element: element,
      extensions: [
        // Basic Nodes
        Document,
        Paragraph,
        HorizontalRule,
        Text,
        Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),

        // Basic Marks
        Bold,
        Italic,

        // Rich Content
        YouTube.configure({}),
        MathInline,
        MathBlock,
        ResizableImage.configure({}),

        // Infrastructure
        NodeIdExtension, // Ensures every node has a unique ID
        DynamicHighlighter, // Handles TTS and Search highlighting
        SlashCommandExtension, // Handles "/" menu triggers
        ColorModeExtension, // Handles node coloring visualization

        // Collaboration & State
        Collaboration.configure({ document: ydoc }),

        // UX
        Placeholder.configure({
          placeholder: ({ editor, node, pos }) => {
            const tValue = i18n.t;
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              return tValue('doc_view.placeholder.title');
            }
            if (node.type.name === 'paragraph' && !node.textContent) {
              const before = editor.state.doc.resolve(pos).nodeBefore;
              // If it's the first paragraph or follows a heading, it's a description.
              if (pos === 1 || before?.type.name === 'heading') {
                return tValue('doc_view.placeholder.description');
              }
              return tValue('doc_view.placeholder.term');
            }
            return '';
          },
        }),
      ],
      editorProps: { attributes: { class: 'prose' } },
      onUpdate: this.handleUpdate.bind(this),
      onSelectionUpdate: this.handleSelectionUpdate.bind(this),
    });

    // Register the instance in the global store
    setInstance(this.editor);

    // Seed initial content if provided (e.g. from "Create from Text" AI command)
    if (initialContent) {
      this.editor.commands.setContent(initialContent, { emitUpdate: false });
      const currentDocId = documentState.docId;
      // Immediately index the new content for search
      if (currentDocId) {
        neuralIndexService.indexDocument(currentDocId, this.editor.state.doc);
      }
      clearInitialContent();
    }

    // Critical: Ensure structural integrity by forcing IDs on all headings
    this.editor.commands.ensureNodeIds();

    // Initial title sync
    this.syncTitleWithStore(this.editor);

    // Sync editing permissions with data availability
    const onSync = (event: { synced: boolean }) => {
      if (this.editor && !this.editor.isDestroyed) {
        this.editor.setEditable(event.synced);
      }
    };

    if (provider) {
      this.editor.setEditable(provider.synced);
      provider.on('synced', onSync);
      this.cleanupProvider = () => provider.off('synced', onSync);
    } else {
      this.editor.setEditable(true);
    }
  }

  /**
   * Cleans up the editor instance and store bindings.
   */
  public destroy(): void {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    destroyEditor();
    if (this.cleanupProvider) {
      this.cleanupProvider();
    }
  }

  /**
   * Handler for Tiptap's `update` event.
   * Manages reactivity syncing, title updates, and search indexing.
   */
  private handleUpdate({ editor, transaction }: EditorEvents['update']) {
    // Ignore internal plugin updates (like highlighting) to prevent loops
    if (transaction.getMeta('isHighlighterUpdate')) {
      return;
    }
    if (transaction.docChanged) {
      syncState(); // Notify Svelte components
      this.syncTitleWithStore(editor);

      const currentDocId = documentState.docId;
      if (currentDocId) {
        neuralIndexService.indexDocument(currentDocId, editor.state.doc);
      }
    }
  }

  /**
   * Handler for Tiptap's `selectionUpdate` event.
   * Updates the `editorStore` with the currently active node.
   */
  private handleSelectionUpdate({
    editor,
    transaction,
  }: EditorEvents['selectionUpdate']) {
    if (transaction.getMeta('isHighlighterUpdate')) {
      return;
    }
    const { selection } = editor.state;
    let newSelectedNode: ProseMirrorNode | null = null;
    let newSelectedPos: number | null = null;

    // Case 1: Node Selection (e.g., clicked on a handle)
    if (
      selection.constructor.name === 'NodeSelection' &&
      (selection as any).node.type.name === 'heading' &&
      !(selection as any).empty
    ) {
      newSelectedNode = (selection as any).node;
      newSelectedPos = selection.from;
    }
    // Case 2: Text Cursor inside a heading
    else if (selection.empty) {
      const { $from: resolvedPos } = selection;
      const parentNode = resolvedPos.parent;
      if (parentNode.type.name === 'heading') {
        newSelectedNode = parentNode;
        newSelectedPos = resolvedPos.before(resolvedPos.depth);
      }
    }
    updateSelection(newSelectedNode, newSelectedPos);
  }

  /**
   * Syncs the document's H1 title with the application metadata store.
   * Debounced to prevent thrashing the database on every keystroke.
   */
  private syncTitleWithStore = debounce((editorInstance: Editor) => {
    const titleNode = editorInstance.state.doc.firstChild;
    if (
      titleNode &&
      titleNode.type.name === 'heading' &&
      titleNode.attrs.level === 1
    ) {
      updateTitle(titleNode.textContent);
    } else {
      updateTitle('');
    }
  }, 750);

  /**
   * Dispatch a transaction to update the Dynamic Highlighter plugin state.
   * Used by TTS and Search to visualize active ranges.
   * @param meta - The metadata payload for the plugin.
   */
  public updateHighlighter(meta: any) {
    if (!this.editor || this.editor.isDestroyed) return;
    const tr = this.editor.state.tr
      .setMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY, meta)
      .setMeta('isHighlighterUpdate', true);
    this.editor.view.dispatch(tr);
  }

  /**
   * Dispatch a transaction to update the Color Mode plugin.
   * @param mode - The current visualization mode (e.g., 'by-level').
   */
  public updateColorMode(mode: string) {
    if (!this.editor || this.editor.isDestroyed) return;
    const tr = this.editor.state.tr.setMeta('COLOR_MODE_UPDATE', mode);
    this.editor.view.dispatch(tr);
  }

  /**
   * Smoothly scrolls the editor to keep the currently highlighted TTS element in view.
   * Uses smart thresholds to avoid unnecessary scrolling if the user is reading comfortably.
   */
  public autoscrollToHighlight() {
    if (!this.editor) return;

    const targetEl =
      this.editor.view.dom.querySelector('.is-current-tts-word') ||
      this.editor.view.dom.querySelector('.is-current-tts-node');

    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    // Define a "comfortable reading zone" in the middle of the screen
    const topThreshold = viewportHeight * 0.3;
    const bottomThreshold = viewportHeight * 0.7;

    if (rect.top < topThreshold || rect.bottom > bottomThreshold) {
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }
}
