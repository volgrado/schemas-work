/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { CardIndicatorExtension, CARD_INDICATOR_PLUGIN_KEY } from './CardIndicatorExtension';
import { NodeIdExtension } from './NodeIdExtension';
import * as cardService from '$lib/services/features/cardService';

vi.mock('$lib/services/features/cardService');

describe('CardIndicatorExtension', () => {
  it('adds a card indicator to nodes with cards', async () => {
    // Mock the card service to return a card for a specific node
    vi.mocked(cardService).getAllCards.mockResolvedValue([
      { id: '1', nodeId: 'node1', content: { q: 'q', a: 'a' }, srs: {} },
    ] as any);

    const editor = new Editor({
      extensions: [StarterKit, NodeIdExtension, CardIndicatorExtension],
      content: `
        <ul>
          <li data-node-id="node1"><p>Term 1</p></li>
          <li data-node-id="node2"><p>Term 2</p></li>
        </ul>
      `,
    });

    // Wait for the extension to update
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Check for the decoration
    const plugin = CARD_INDICATOR_PLUGIN_KEY.get(editor.state);
    const decorations = plugin?.props.decorations?.(editor.state);
    expect(decorations?.find().length).toBe(1);
  });
});
