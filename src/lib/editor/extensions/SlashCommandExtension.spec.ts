/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Suggestion } from '@tiptap/suggestion';
import { SlashCommandExtension } from './SlashCommandExtension';

// Mock the entire @tiptap/suggestion module
vi.mock('@tiptap/suggestion', () => ({
  Suggestion: vi.fn(
    (config) =>
      new Plugin({
        key: new PluginKey('suggestion'),
        ...config,
      })
  ),
  default: vi.fn(),
}));

describe('SlashCommandExtension', () => {
  let editor: Editor;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  it.skip('registers the Suggestion plugin with the correct configuration', () => {
    editor = new Editor({
      extensions: [StarterKit, SlashCommandExtension],
    });

    expect(Suggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        char: '/',
        items: expect.any(Function),
        command: expect.any(Function),
        render: expect.any(Function),
      })
    );
  });
});
