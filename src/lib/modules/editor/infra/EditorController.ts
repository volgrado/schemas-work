import { Editor } from '@tiptap/core';
import type { EditorEvents } from '@tiptap/core';
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
  destroyEditor,
  syncState,
} from '$lib/modules/editor/ui/editorStore.svelte';
import {
  updateTitle,
  clearInitialContent,
  documentState,
} from '$lib/stores/documentStore.svelte';
import { debounce } from '$lib/core/utils/debounce';
import { t } from '$lib/utils/i18n';
import { get } from 'svelte/store';
import * as neuralIndexService from '$lib/services/ai/neuralIndexService';
import type { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';

export interface EditorControllerOptions {
  element: HTMLElement;
  ydoc: Y.Doc;
  provider: IndexeddbPersistence | null;
  initialContent?: object | null;
}

export class EditorController {
  public editor: Editor | null = null;
  private options: EditorControllerOptions;
  private cleanupProvider: (() => void) | undefined;

  constructor(options: EditorControllerOptions) {
    this.options = options;
  }

  public async mount(): Promise<void> {
    const { element, ydoc, provider, initialContent } = this.options;

    // Dynamically import heavy extensions
    const [
      { default: YouTube },
      { ResizableImage },
      { MathInline, MathBlock }
    ] = await Promise.all([
      import('@tiptap/extension-youtube'),
      import('$lib/modules/editor/infra/extensions/ResizableImage'),
      import('$lib/modules/editor/infra/extensions/Math')
    ]);

    this.editor = new Editor({
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
        Placeholder.configure({
          placeholder: ({ editor, node, pos }) => {
            const tValue = get(t);
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              return tValue('doc_view.placeholder.title');
            }
            if (node.type.name === 'paragraph' && !node.textContent) {
              const before = editor.state.doc.resolve(pos).nodeBefore;
              if (pos === 1 || before?.type.name === 'heading') {
                return tValue('doc_view.placeholder.description');
              }
              return tValue('doc_view.placeholder.term');
            }
            return '';
          },
        }),
        ResizableImage.configure({}),
        ColorModeExtension,
      ],
      editorProps: { attributes: { class: 'prose' } },
      onUpdate: this.handleUpdate.bind(this),
      onSelectionUpdate: this.handleSelectionUpdate.bind(this),
    });

    setInstance(this.editor);

    if (initialContent) {
      this.editor.commands.setContent(initialContent, { emitUpdate: false });
      const currentDocId = documentState.docId;
      if (currentDocId) {
        neuralIndexService.indexDocument(currentDocId, this.editor.state.doc);
      }
      clearInitialContent();
    }

    // Ensure all headings have IDs
    this.editor.commands.ensureNodeIds();

    this.syncTitleWithStore(this.editor);

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

  private handleUpdate({ editor, transaction }: EditorEvents['update']) {
    if (transaction.getMeta('isHighlighterUpdate')) {
      return;
    }
    if (transaction.docChanged) {
      syncState();
      this.syncTitleWithStore(editor);
      const currentDocId = documentState.docId;
      if (currentDocId) {
        neuralIndexService.indexDocument(currentDocId, editor.state.doc);
      }
    }
  }

  private handleSelectionUpdate({ editor, transaction }: EditorEvents['selectionUpdate']) {
    if (transaction.getMeta('isHighlighterUpdate')) {
      return;
    }
    const { selection } = editor.state;
    let newSelectedNode: ProseMirrorNode | null = null;
    let newSelectedPos: number | null = null;
    if (
      selection.constructor.name === 'NodeSelection' &&
      (selection as any).node.type.name === 'heading' &&
      !(selection as any).empty
    ) {
      newSelectedNode = (selection as any).node;
      newSelectedPos = selection.from;
    } else if (selection.empty) {
      const { $from: resolvedPos } = selection;
      const parentNode = resolvedPos.parent;
      if (parentNode.type.name === 'heading') {
        newSelectedNode = parentNode;
        newSelectedPos = resolvedPos.before(resolvedPos.depth);
      }
    }
    updateSelection(newSelectedNode, newSelectedPos);
  }

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
   * Updates the dynamic highlighter plugin state.
   */
  public updateHighlighter(meta: any) {
    if (!this.editor || this.editor.isDestroyed) return;
    const tr = this.editor.state.tr
      .setMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY, meta)
      .setMeta('isHighlighterUpdate', true);
    this.editor.view.dispatch(tr);
  }

  /**
   * Updates the color mode plugin state.
   */
  public updateColorMode(mode: string) {
    if (!this.editor || this.editor.isDestroyed) return;
    const tr = this.editor.state.tr.setMeta('COLOR_MODE_UPDATE', mode);
    this.editor.view.dispatch(tr);
  }

  /**
   * Smoothly scrolls the editor to keep the currently highlighted element
   * in a comfortable reading position.
   */
  public autoscrollToHighlight() {
    if (!this.editor) return;

    const targetEl =
      this.editor.view.dom.querySelector('.is-current-tts-word') ||
      this.editor.view.dom.querySelector('.is-current-tts-node');

    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
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
