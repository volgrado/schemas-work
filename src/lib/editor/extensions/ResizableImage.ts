import { Image } from '@tiptap/extension-image';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import imageCompression from 'browser-image-compression';

console.log('ResizableImage.ts module loaded.'); // <-- LOG #A: Confirms the file is being loaded by the bundler

/**
 * Converts a File object to a Base64 data URL.
 * @param file The file to convert.
 * @returns A promise that resolves with the Base64 data URL.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Compresses an image file in the browser before processing.
 * @param file The image file to compress.
 * @returns A promise that resolves with the compressed file.
 */
async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  try {
    console.log(
      `Original image size: ${(file.size / 1024 / 1024).toFixed(2)} MB`
    );
    const compressedFile = await imageCompression(file, options);
    console.log(
      `Compressed image size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`
    );
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed, using original file:', error);
    return file;
  }
}

export const ResizableImage = Image.extend({
  addOptions() {
    console.log('ResizableImage addOptions() called.'); // <-- LOG #B
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: true,
    };
  },

  addAttributes() {
    console.log('ResizableImage addAttributes() called.'); // <-- LOG #C
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: (attributes) => ({
          width:
            typeof attributes.width === 'number'
              ? `${attributes.width}px`
              : attributes.width,
        }),
        parseHTML: (element) =>
          element.style.width || element.getAttribute('width'),
      },
      draggable: {
        default: true,
      },
    };
  },

  addNodeView() {
    console.log('ResizableImage addNodeView() called.'); // <-- LOG #D
    return ({ editor, node, getPos }) => {
      // (NodeView logic remains the same, no extra logging needed here unless resizing fails)
      const { view } = editor;
      const isEditable = view.editable;

      const container = document.createElement('div');
      container.className = 'resizable-image-wrapper';

      container.contentEditable = 'false';

      if (!isEditable) {
        container.classList.add('non-editable');
      }

      const img = document.createElement('img');
      img.setAttribute('src', node.attrs.src);
      img.style.width =
        typeof node.attrs.width === 'number'
          ? `${node.attrs.width}px`
          : node.attrs.width;

      container.append(img);

      if (isEditable) {
        const handles: HTMLDivElement[] = [];
        const directions = [
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
        ];
        directions.forEach((dir) => {
          const handle = document.createElement('div');
          handle.className = `resize-handle ${dir}`;
          container.append(handle);
          handles.push(handle);
        });

        let startX: number, startWidth: number;

        const startResize = (e: MouseEvent) => {
          e.preventDefault();
          startX = e.clientX;
          startWidth = img.clientWidth;

          const onMouseMove = (e: MouseEvent) => {
            const newWidth = startWidth + (e.clientX - startX);
            img.style.width = `${newWidth}px`;
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            const pos = getPos();
            if (pos === undefined) return;

            const transaction = view.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              width: img.style.width,
            });
            view.dispatch(transaction);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        };

        handles.forEach((handle) => {
          handle.addEventListener('mousedown', startResize);
        });
      }

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'image') return false;
          img.setAttribute('src', updatedNode.attrs.src);
          img.style.width =
            typeof updatedNode.attrs.width === 'number'
              ? `${updatedNode.attrs.width}px`
              : updatedNode.attrs.width;
          return true;
        },
      };
    };
  },

  addProseMirrorPlugins() {
    console.log(
      'ResizableImage addProseMirrorPlugins() called. Plugin is being registered!'
    ); // <-- LOG #E

    return [
      new Plugin({
        key: new PluginKey('imagePasteAndCompress'),
        props: {
          handlePaste: (view: EditorView, event: ClipboardEvent) => {
            console.log(
              '%c--- PASTE EVENT TRIGGERED ---',
              'font-weight: bold; color: blue;'
            ); // <-- BREADCRUMB #1

            const items = Array.from(event.clipboardData?.items || []);
            console.log('Clipboard items:', items); // <-- BREADCRUMB #2

            const imageItems = items.filter((item) =>
              item.type.startsWith('image/')
            );
            console.log('Found image items:', imageItems); // <-- BREADCRUMB #3

            if (imageItems.length === 0) {
              console.log(
                'No image items found in clipboard. Aborting paste handler.'
              ); // <-- BREADCRUMB #4
              return false; // Let Tiptap handle non-image pastes
            }

            event.preventDefault(); // Stop the default paste behavior
            console.log('Default paste event prevented.'); // <-- BREADCRUMB #5

            imageItems.forEach(async (item) => {
              const file = item.getAsFile();
              if (!file) {
                console.error('Could not get file from clipboard item.');
                return;
              }

              console.log('Processing file:', file); // <-- BREADCRUMB #6

              const { schema } = view.state;

              try {
                console.log('Step 1: Compressing image...'); // <-- BREADCRUMB #7
                const compressedFile = await compressImage(file);
                console.log(
                  '%cStep 1 SUCCESS: Image compressed.',
                  'color: green;'
                ); // <-- BREADCRUMB #8

                console.log('Step 2: Converting to Base64...'); // <-- BREADCRUMB #9
                const base64Url = await fileToBase64(compressedFile);
                console.log(
                  '%cStep 2 SUCCESS: Base64 created (string is long, only showing start):',
                  'color: green;',
                  base64Url.substring(0, 50) + '...'
                ); // <-- BREADCRUMB #10

                if (!schema.nodes.image) {
                  console.error(
                    'FATAL ERROR: `image` node type not found in schema. Is the extension registered correctly?'
                  );
                  return;
                }
                const node = schema.nodes.image.create({
                  src: base64Url,
                });
                console.log('Step 3: ProseMirror node created:', node); // <-- BREADCRUMB #11

                const transaction = view.state.tr.replaceSelectionWith(node);
                console.log('Step 4: Transaction created:', transaction); // <-- BREADCRUMB #12

                view.dispatch(transaction);
                console.log(
                  '%cStep 5 SUCCESS: Transaction dispatched. Image should appear!',
                  'font-weight: bold; color: green;'
                ); // <-- BREADCRUMB #13
              } catch (error) {
                console.error(
                  '%c--- FATAL ERROR during image processing ---:',
                  'font-weight: bold; color: red;',
                  error
                );
              }
            });

            return true; // We handled the paste
          },
        },
      }),
    ];
  },
});
