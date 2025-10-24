/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NodeIdExtension } from './NodeIdExtension';

describe('NodeIdExtension', () => {
  let editor: Editor;

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  it('assigns a nodeId to list items on creation', async () => {
    editor = new Editor({
      extensions: [StarterKit, NodeIdExtension],
      content: `
        <ul>
          <li><p>Item 1</p></li>
          <li><p>Item 2</p></li>
        </ul>
      `,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    editor.state.doc.descendants((node) => {
      if (node.type.name === 'listItem') {
        expect(node.attrs.nodeId).toEqual(expect.any(String));
      }
    });
  });

  it('assigns a nodeId to new list items in a transaction', () => {
    editor = new Editor({
      extensions: [StarterKit, NodeIdExtension],
      content: `<ul><li><p>Item 1</p></li></ul>`,
    });

    // Correctly insert a new list item into the existing list
    editor.chain().focus().insertContentAt(10, '<li><p>New Item</p></li>').run();

    let foundNewItem = false;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'listItem' && node.textContent.includes('New Item')) {
        expect(node.attrs.nodeId).toEqual(expect.any(String));
        foundNewItem = true;
      }
    });
    expect(foundNewItem).toBe(true);
  });
});
