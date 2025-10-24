/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { RoleExtension } from './RoleExtension';
import { SmartEnter } from './SmartEnter';

describe('RoleExtension', () => {
  let editor: Editor;

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  it.skip('assigns roles to paragraphs within a list item', async () => {
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

    // Set selection to the end of the term paragraph and simulate 'Enter'
    editor.commands.setTextSelection(8);
    editor.commands.keyboardShortcut('Enter');

    await new Promise((resolve) => setTimeout(resolve, 0));

    const term = editor.state.doc.nodeAt(4);
    const description = editor.state.doc.nodeAt(11);

    expect(term?.attrs.role).toBe('term');
    expect(description?.attrs.role).toBe('description');
  });
});
