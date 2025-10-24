/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { SmartEnter } from './SmartEnter';
import { RoleExtension } from './RoleExtension';

describe('SmartEnter', () => {
  let editor: Editor;

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  it.skip('creates a new paragraph with the "description" role when Enter is pressed in the "term" paragraph', async () => {
    editor = new Editor({
      extensions: [StarterKit, RoleExtension, SmartEnter],
      content: `
        <ul>
          <li>
            <p>Term</p>
          </li>
        </ul>
      `,
    });

    editor.commands.setTextSelection(8);
    editor.commands.keyboardShortcut('Enter');

    await new Promise((resolve) => setTimeout(resolve, 0));

    const description = editor.state.doc.nodeAt(11);
    expect(description?.type.name).toBe('paragraph');
    expect(description?.attrs.role).toBe('description');
  });

  it.skip('splits the list item when Enter is pressed in an empty "term" paragraph', async () => {
    editor = new Editor({
      extensions: [StarterKit, RoleExtension, SmartEnter],
      content: `
        <ul>
          <li>
            <p></p>
          </li>
        </ul>
      `,
    });

    editor.commands.setTextSelection(5);
    editor.commands.keyboardShortcut('Enter');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(editor.state.doc.child(0).childCount).toBe(2);
  });

  it.skip('splits the list item when Enter is pressed in an empty "description" paragraph', async () => {
    editor = new Editor({
      extensions: [StarterKit, RoleExtension, SmartEnter],
      content: `
        <ul>
          <li>
            <p>Term</p>
            <p></p>
          </li>
        </ul>
      `,
    });

    editor.commands.setTextSelection(12);
    editor.commands.keyboardShortcut('Enter');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(editor.state.doc.child(0).childCount).toBe(2);
  });

  it.skip('outdents the list when Backspace is pressed in an empty list item', async () => {
    editor = new Editor({
      extensions: [StarterKit, RoleExtension, SmartEnter],
      content: `
        <ul>
          <li>
            <p></p>
          </li>
        </ul>
      `,
    });

    editor.commands.setTextSelection(5);
    editor.commands.keyboardShortcut('Backspace');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(editor.state.doc.child(0).type.name).toBe('paragraph');
  });
});
