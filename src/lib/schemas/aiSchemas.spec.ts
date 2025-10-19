/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import {
  CreateSchemaAiResponseSchema,
  ExpandNodeAiResponseSchema,
  ChangeToneAiResponseSchema,
  FlashcardResponseSchema,
} from './aiSchemas';

describe('aiSchemas', () => {
  describe('CreateSchemaAiResponseSchema', () => {
    it('should validate a correct Tiptap document', () => {
      const validDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello World' }],
          },
        ],
      };
      const result = CreateSchemaAiResponseSchema.safeParse(validDoc);
      expect(result.success).toBe(true);
    });

    it('should fail if the root type is not "doc"', () => {
      const invalidDoc = {
        type: 'paragraph', // Invalid root type
        content: [{ type: 'text', text: 'Hello' }],
      };
      const result = CreateSchemaAiResponseSchema.safeParse(invalidDoc);
      expect(result.success).toBe(false);
    });

    it('should fail if the content array is empty', () => {
      const invalidDoc = {
        type: 'doc',
        content: [], // Schema requires min(1)
      };
      const result = CreateSchemaAiResponseSchema.safeParse(invalidDoc);
      expect(result.success).toBe(false);
    });
  });

  describe('ExpandNodeAiResponseSchema', () => {
    it('should validate a correct bulletList fragment', () => {
      const validList = {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Item 1' }],
              },
            ],
          },
        ],
      };
      const result = ExpandNodeAiResponseSchema.safeParse(validList);
      expect(result.success).toBe(true);
    });

    it('should validate an empty bulletList', () => {
      const emptyList = {
        type: 'bulletList',
        content: [],
      };
      const result = ExpandNodeAiResponseSchema.safeParse(emptyList);
      expect(result.success).toBe(true);
    });

    it('should fail if the root type is not "bulletList"', () => {
      const invalidList = {
        type: 'orderedList', // Invalid type
        content: [],
      };
      const result = ExpandNodeAiResponseSchema.safeParse(invalidList);
      expect(result.success).toBe(false);
    });
  });

  describe('ChangeToneAiResponseSchema', () => {
    it('should validate a correct rewritten text object', () => {
      const validResponse = {
        rewrittenText: 'This is the new and improved text.',
      };
      const result = ChangeToneAiResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should fail if rewrittenText is empty', () => {
      const invalidResponse = { rewrittenText: '' };
      const result = ChangeToneAiResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail if the key is incorrect', () => {
      const invalidResponse = { someOtherKey: 'text' };
      const result = ChangeToneAiResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('FlashcardResponseSchema (Discriminated Union)', () => {
    it('should validate an array of mixed, valid flashcard types', () => {
      const validMixedArray = [
        {
          type: 'basic',
          content: { question: 'What is Svelte?', answer: 'A framework.' },
        },
        {
          type: 'input',
          content: { prompt: 'Spell "schema"', expected: 'schema' },
        },
        {
          type: 'sequencing',
          content: { prompt: 'Order the numbers', items: ['1', '2', '3'] },
        },
      ];
      const result = FlashcardResponseSchema.safeParse(validMixedArray);
      expect(result.success).toBe(true);
    });

    it('should validate an empty array', () => {
      const result = FlashcardResponseSchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('should fail if an item has an invalid "type" discriminator', () => {
      const invalidArray = [
        {
          type: 'multiple-choice', // Not a valid type
          content: { question: 'Q', options: ['A', 'B'] },
        },
      ];
      const result = FlashcardResponseSchema.safeParse(invalidArray);
      expect(result.success).toBe(false);
    });

    it('should fail if an item\'s content does not match its "type"', () => {
      const invalidArray = [
        {
          type: 'basic',
          content: { prompt: 'This content belongs to an input card' }, // Mismatch
        },
      ];
      const result = FlashcardResponseSchema.safeParse(invalidArray);
      expect(result.success).toBe(false);
    });

    it('should fail if a sequencing card has fewer than 2 items', () => {
      const invalidArray = [
        {
          type: 'sequencing',
          content: { prompt: 'Order the numbers', items: ['1'] }, // Only 1 item
        },
      ];
      const result = FlashcardResponseSchema.safeParse(invalidArray);
      expect(result.success).toBe(false);
    });

    it('should fail if a basic card is missing a question', () => {
      const invalidArray = [
        {
          type: 'basic',
          content: { answer: 'An answer without a question' },
        },
      ];
      const result = FlashcardResponseSchema.safeParse(invalidArray);
      expect(result.success).toBe(false);
    });
  });
});
