/**
 * @file nodeDetailService.ts
 * @module editor.domain
 * @description
 * Encapsulates the business logic for the Node Detail panel.
 * Handles interactions with the editor instance, such as scrolling to nodes,
 * aligning the view, and updating node content.
 */

import { DOMParser } from 'prosemirror-model';

export class NodeDetailService {
  /**
   * Aligns the editor view with the currently active node without changing focus.
   */
  static async alignEditorWithNode(nodeId: string): Promise<void> {
    const { editorState } = await import(
      '$lib/modules/editor/ui/editorStore.svelte'
    );
    const editor = editorState.instance;
    if (!editor) return;

    let targetPos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs.nodeId === nodeId) {
        targetPos = pos;
        return false;
      }
    });

    if (targetPos !== -1) {
      const domNode = editor.view.nodeDOM(targetPos);
      if (domNode && domNode instanceof HTMLElement) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.highlightNode(domNode);
      }
    }
  }

  /**
   * Scrolls the editor to the node, focuses it, and selects the text.
   */
  static async scrollToNodeInEditor(nodeId: string): Promise<void> {
    const { editorState } = await import(
      '$lib/modules/editor/ui/editorStore.svelte'
    );
    const editor = editorState.instance;
    if (!editor) return;

    let targetPos = -1;
    let targetNode: any = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs.nodeId === nodeId) {
        targetPos = pos;
        targetNode = node;
        return false;
      }
    });

    if (targetPos !== -1 && targetNode) {
      editor.commands.focus();
      const headingEnd = targetPos + targetNode.nodeSize;
      editor.commands.setTextSelection({ from: targetPos, to: headingEnd });

      const domNode = editor.view.nodeDOM(targetPos);
      if (domNode && domNode instanceof HTMLElement) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.highlightNode(domNode);
      }
    }
  }

  /**
   * Updates the content of a specific node in the editor based on a DOM element.
   */
  static async updateNodeAtPos(
    pos: number,
    domElement: HTMLElement
  ): Promise<void> {
    const { editorState } = await import(
      '$lib/modules/editor/ui/editorStore.svelte'
    );
    const editor = editorState.instance;
    if (!editor) return;

    const { state, view } = editor;
    const tr = state.tr;
    const node = state.doc.nodeAt(pos);

    if (!node) {
      console.warn(`[NodeDetail] No node found at pos ${pos}`);
      return;
    }

    try {
      const parser = DOMParser.fromSchema(state.schema);
      const slice = parser.parseSlice(domElement, { preserveWhitespace: true });

      if (node.isTextblock) {
        const start = pos + 1;
        const end = pos + node.nodeSize - 1;
        tr.replace(start, end, slice);
      } else {
        tr.replaceWith(pos, pos + node.nodeSize, slice.content);
      }

      if (tr.docChanged) {
        view.dispatch(tr);
      }
    } catch (e) {
      console.error('[NodeDetail] Failed to update node content:', e);
    }
  }

  private static highlightNode(domNode: HTMLElement) {
    setTimeout(() => {
      domNode.classList.add('focus-highlight');
      setTimeout(() => {
        domNode.classList.remove('focus-highlight');
      }, 2000);
    }, 100);
  }
}
