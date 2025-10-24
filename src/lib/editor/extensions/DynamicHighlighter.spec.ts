/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DynamicHighlighter, DYNAMIC_HIGHLIGHTER_PLUGIN_KEY } from './DynamicHighlighter';
import { reviewStore } from '$lib/stores/reviewStore';
import { ttsStore } from '$lib/stores/ttsStore';
import { Decoration, DecorationSet } from 'prosemirror-view';

vi.mock('$lib/stores/reviewStore', () => ({
  reviewStore: {
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('$lib/stores/ttsStore', () => ({
  ttsStore: {
    subscribe: vi.fn(() => () => {}),
  },
}));

describe('DynamicHighlighter', () => {
  let editor: Editor;

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  it('applies review decorations when the review store updates', async () => {
    editor = new Editor({
      extensions: [StarterKit, DynamicHighlighter],
      content: `<p>Hello world</p>`,
    });

    const decoration = Decoration.inline(0, 5, { class: 'highlight' });
    const decorationSet = DecorationSet.create(editor.state.doc, [decoration]);

    // Get the latest subscriber and call it
    const lastReviewSubscriber = (reviewStore as any).subscribe.mock.calls.pop()[0];
    lastReviewSubscriber({ decorationSet });

    // Wait for the prosemirror view update
    await new Promise((r) => setTimeout(r, 0));

    const plugin = DYNAMIC_HIGHLIGHTER_PLUGIN_KEY.get(editor.state);
    const decorations = plugin?.props.decorations?.(editor.state);
    expect(decorations).toBe(decorationSet);
  });

  it('applies TTS decorations when the TTS store updates', async () => {
    editor = new Editor({
      extensions: [StarterKit, DynamicHighlighter],
      content: `<p>Hello world</p>`,
    });

    // Ensure review decorations are empty for this test
    const lastReviewSubscriber = (reviewStore as any).subscribe.mock.calls.pop()[0];
    lastReviewSubscriber({ decorationSet: DecorationSet.empty });

    const decoration = Decoration.inline(0, 5, { class: 'highlight' });
    const decorationSet = DecorationSet.create(editor.state.doc, [decoration]);

    // Update TTS decorations
    const lastTtsSubscriber = (ttsStore as any).subscribe.mock.calls.pop()[0];
    lastTtsSubscriber({ decorationSet });

    // Wait for the prosemirror view update
    await new Promise((r) => setTimeout(r, 0));

    const plugin = DYNAMIC_HIGHLIGHTER_PLUGIN_KEY.get(editor.state);
    const decorations = plugin?.props.decorations?.(editor.state);
    expect(decorations).toBe(decorationSet);
  });

  it('prioritizes review decorations over TTS decorations', async () => {
    editor = new Editor({
      extensions: [StarterKit, DynamicHighlighter],
      content: `<p>Hello world</p>`,
    });

    const reviewDecoration = Decoration.inline(0, 5, { class: 'review-highlight' });
    const reviewDecorationSet = DecorationSet.create(editor.state.doc, [reviewDecoration]);

    const ttsDecoration = Decoration.inline(6, 11, { class: 'tts-highlight' });
    const ttsDecorationSet = DecorationSet.create(editor.state.doc, [ttsDecoration]);

    // Update both stores
    const lastReviewSubscriber = (reviewStore as any).subscribe.mock.calls.pop()[0];
    lastReviewSubscriber({ decorationSet: reviewDecorationSet });

    const lastTtsSubscriber = (ttsStore as any).subscribe.mock.calls.pop()[0];
    lastTtsSubscriber({ decorationSet: ttsDecorationSet });

    // Wait for the prosemirror view update
    await new Promise((r) => setTimeout(r, 0));

    // Check that review decorations are returned
    const plugin = DYNAMIC_HIGHLIGHTER_PLUGIN_KEY.get(editor.state);
    const decorations = plugin?.props.decorations?.(editor.state);
    expect(decorations).toBe(reviewDecorationSet);
  });
});
