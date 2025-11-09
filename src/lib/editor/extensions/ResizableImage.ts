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
 * REFINEMENT: A dedicated class for the Image Node View.
 * This encapsulates all DOM manipulation and event handling logic,
 * keeping the Tiptap extension definition clean and focused.
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
    this.dom.contentEditable = 'false';

    this.img = document.createElement('img');
    this.img.setAttribute('src', this.node.attrs.src);
    this.img.style.width = this.node.attrs.width;
    this.dom.append(this.img);

    if (editor.isEditable) {
      this.createResizeHandles();
    } else {
      this.dom.classList.add('non-editable');
    }
  }

  private createResizeHandles() {
    const directions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    directions.forEach((dir) => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${dir}`;
      this.dom.append(handle);
      handle.addEventListener('mousedown', this.startResize.bind(this));
    });
  }

  private startResize(e: MouseEvent) {
    e.preventDefault();
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
      // Draggable is handled by the Node View, so it's not needed here.
    };
  },

  addNodeView() {
    // REFINEMENT: The Node View is now clean, simply instantiating our dedicated class.
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
              return false; // Let Tiptap handle non-image pastes
            }

            event.preventDefault(); // Stop default paste behavior

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

            return true; // We handled the paste
          },
        },
      }),
    ];
  },
});
