/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { MathInline, MathBlock } from './Math';
import { modalStore } from '$lib/stores/modalStore';

vi.mock('$lib/stores/modalStore');

describe('Math nodes', () => {
  let editor: Editor;

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  it('renders an inline math node', () => {
    editor = new Editor({
      extensions: [StarterKit, MathInline],
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'math_inline',
                attrs: { formula: 'a^2+b^2=c^2' },
              },
            ],
          },
        ],
      },
    });

    const renderedDom = editor.view.dom;
    const inlineMathNode = renderedDom.querySelector('.math-inline');
    expect(inlineMathNode).not.toBeNull();
    expect(inlineMathNode?.querySelector('.katex')).not.toBeNull();
  });

  it('renders a block math node', () => {
    editor = new Editor({
      extensions: [StarterKit, MathBlock],
      content: {
        type: 'doc',
        content: [
          {
            type: 'math_block',
            attrs: { formula: 'a^2+b^2=c^2' },
          },
        ],
      },
    });

    const renderedDom = editor.view.dom;
    const blockMathNode = renderedDom.querySelector('.math-block');
    expect(blockMathNode).not.toBeNull();
    expect(blockMathNode?.querySelector('.katex')).not.toBeNull();
  });

  it('opens the formula modal on click', () => {
    editor = new Editor({
      extensions: [StarterKit, MathInline],
      editable: true,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'math_inline',
                attrs: { formula: 'a^2+b^2=c^2' },
              },
            ],
          },
        ],
      },
    });

    const openModal = vi.spyOn(modalStore, 'open');
    const mathNode = editor.view.dom.querySelector('.math-inline') as HTMLElement;
    expect(mathNode).not.toBeNull();
    mathNode.click();

    expect(openModal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'formula',
        attrs: { formula: 'a^2+b^2=c^2' },
      })
    );
  });
});
