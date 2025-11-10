import { Image } from '@tiptap/extension-image';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';
import imageCompression from 'browser-image-compression';

// =================================================================
// --- HELPER FUNCTIONS ---
// =================================================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

async function compressImage(file: File): Promise<File> {
  const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed; using original file.', error);
    return file;
  }
}

// =================================================================
// --- REUSABLE RESIZABLE IMAGE NODE VIEW CLASS ---
// =================================================================

/**
 * A dedicated class for the Image Node View that correctly handles
 * resize handles based on editor state and node selection.
 */
class ResizableImageView {
  private dom: HTMLElement;
  private img: HTMLImageElement;
  private editor: Editor;
  private getPos: () => number | undefined;
  private node: ProseMirrorNode;

  constructor(
    node: ProseMirrorNode,
    view: EditorView,
    getPos: () => number | undefined,
    editor: Editor
  ) {
    this.node = node;
    this.editor = editor;
    this.getPos = getPos;

    this.dom = document.createElement('div');
    this.dom.className = 'resizable-image-wrapper';
    this.dom.contentEditable = 'false'; // The wrapper itself is not editable

    this.img = document.createElement('img');
    this.img.setAttribute('src', this.node.attrs.src);
    this.img.style.width = this.node.attrs.width;
    this.dom.append(this.img);
  }

  // --- LIFECYCLE METHODS (THE FIX) ---

  /**
   * Called by Tiptap/ProseMirror when the node is selected.
   * This is the correct place to add UI elements like resize handles.
   */
  selectNode() {
    this.dom.classList.add('ProseMirror-selectednode');
    // Only add handles if the editor is in an editable state.
    if (this.editor.isEditable) {
      this.createResizeHandles();
    }
  }

  /**
   * Called by Tiptap/ProseMirror when the node is deselected.
   * This is the correct place to clean up the UI elements.
   */
  deselectNode() {
    this.dom.classList.remove('ProseMirror-selectednode');
    this.removeResizeHandles();
  }

  // --- PRIVATE DOM HELPERS ---

  private createResizeHandles() {
    // Prevent adding handles if they already exist
    if (this.dom.querySelector('.resize-handle')) return;

    const directions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    directions.forEach((dir) => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${dir}`;
      this.dom.append(handle);
      handle.addEventListener('mousedown', this.startResize.bind(this));
    });
  }

  private removeResizeHandles() {
    const handles = this.dom.querySelectorAll('.resize-handle');
    handles.forEach((handle) => handle.remove());
  }

  private startResize(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation(); // Prevent editor from losing focus
    const startX = e.clientX;
    const startWidth = this.img.clientWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      this.img.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const pos = this.getPos();
      if (pos === undefined) return;

      const transaction = this.editor.view.state.tr.setNodeMarkup(
        pos,
        undefined,
        {
          ...this.node.attrs,
          width: this.img.style.width,
        }
      );
      this.editor.view.dispatch(transaction);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  update(updatedNode: ProseMirrorNode) {
    if (updatedNode.type.name !== this.node.type.name) return false;
    this.node = updatedNode;
    this.img.setAttribute('src', this.node.attrs.src);
    this.img.style.width = this.node.attrs.width;
    return true;
  }

  destroy() {
    this.removeResizeHandles();
  }
}

// =================================================================
// --- TIPTAP EXTENSION DEFINITION ---
// =================================================================

export const ResizableImage = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: true,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: (attrs) => ({ width: attrs.width }),
        parseHTML: (el) => el.style.width || el.getAttribute('width'),
      },
    };
  },

  addNodeView() {
    return ({ editor, node, getPos }) => {
      return new ResizableImageView(node, editor.view, getPos, editor);
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('imagePasteAndCompress'),
        props: {
          handlePaste: (view: EditorView, event: ClipboardEvent) => {
            const items = Array.from(event.clipboardData?.items || []);
            const imageItems = items.filter((item) =>
              item.type.startsWith('image/')
            );

            if (imageItems.length === 0) {
              return false;
            }

            event.preventDefault();

            imageItems.forEach(async (item) => {
              const file = item.getAsFile();
              if (!file) return;

              try {
                const compressedFile = await compressImage(file);
                const base64Url = await fileToBase64(compressedFile);
                const { schema } = view.state;

                if (!schema.nodes.image) return;

                const node = schema.nodes.image.create({ src: base64Url });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              } catch (error) {
                console.error('Error processing pasted image:', error);
              }
            });

            return true;
          },
        },
      }),
    ];
  },
});
