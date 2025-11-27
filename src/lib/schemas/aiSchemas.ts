/**
 * @file Centralizes all Zod validation schemas for AI-generated responses.
 *
 * This file defines a set of robust, type-safe validators using the Zod library.
 * Each schema is tailored to a specific AI-driven feature, ensuring that the data
 * received from the AI model conforms to the expected structure before it is
 * processed and integrated into the application. This practice is crucial for
 * maintaining data integrity and preventing runtime errors.
 *
 * The schemas cover various use cases, including:
 * - Structuring entire Tiptap/ProseMirror documents.
 * - Generating fragments of content to be inserted into the editor.
 * - Handling simple text transformations.
 * - Validating complex, polymorphic data structures like different types of flashcards.
 */

import { z } from 'zod';

/**
 * A recursive Zod schema for validating a generic Tiptap/ProseMirror node.
 *
 * This schema is fundamental for validating any content that conforms to the ProseMirror
 * document model. It uses `z.lazy()` to handle the recursive definition, where a node's
 * `content` property can contain an array of other nodes.
 *
 * @property {string} [type] - The type of the node (e.g., 'paragraph', 'heading').
 * @property {object} [attrs] - A record of attributes for the node.
 * @property {Array<tiptapNodeSchema>} [content] - An array of child nodes.
 * @property {Array<any>} [marks] - An array of marks (e.g., for bold, italic).
 * @property {string} [text] - The textual content of a text node.
 * @type {z.ZodType<any>}
 */
export const tiptapNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    attrs: z.record(z.string(), z.any()).optional(),
    content: z.array(tiptapNodeSchema).optional(),
    marks: z.array(z.any()).optional(),
    text: z.string().optional(),
  })
);

/**
 * Zod schema for validating the AI response for the "Create Schema" feature.
 *
 * This validator ensures the AI returns a complete and valid Tiptap document.
 * The root node must be of type 'doc' and must contain at least one child node.
 */
export const CreateSchemaAiResponseSchema = z.object({
  type: z.literal('doc'),
  content: z.array(tiptapNodeSchema).min(1, 'The document cannot be empty'),
});

/**
 * Zod schema for validating the AI response for the "Expand Node" feature.
 *
 * This validator ensures the AI returns a Tiptap fragment that is a bullet list.
 * The root node must be 'bulletList'. The list can be empty.
 */
export const ExpandNodeAiResponseSchema = z.object({
  type: z.literal('bulletList'),
  content: z.array(tiptapNodeSchema).optional(),
});

/**
 * Zod schema for validating the AI response for the "Change Tone" feature.
 *
 * This validator ensures the AI returns a simple object containing the rewritten text,
 * which must be a non-empty string.
 */
export const ChangeToneAiResponseSchema = z.object({
  rewrittenText: z.string().min(1, 'The rewritten text cannot be empty.'),
});

// --- Schemas for Polymorphic Flashcard Generation ---

/**
 * Content schema for a basic "Question/Answer" flashcard.
 */
const basicCardContentSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

/**
 * Schema for a complete basic flashcard, identified by `type: 'basic'`.
 */
const basicCardSchema = z.object({
  type: z.literal('basic'),
  content: basicCardContentSchema,
});

/**
 * Content schema for an "Input" flashcard, where the user types the answer.
 */
const inputCardContentSchema = z.object({
  prompt: z.string().min(1),
  expected: z.string().min(1),
});

/**
 * Schema for a complete input flashcard, identified by `type: 'input'`.
 */
const inputCardSchema = z.object({
  type: z.literal('input'),
  content: inputCardContentSchema,
});

/**
 * Content schema for a "Sequencing" flashcard, where the user orders items.
 */
const sequencingCardContentSchema = z.object({
  prompt: z.string().min(1),
  items: z
    .array(z.string())
    .min(2, 'Sequencing card must have at least 2 items.'),
});

/**
 * Schema for a complete sequencing flashcard, identified by `type: 'sequencing'`.
 */
const sequencingCardSchema = z.object({
  type: z.literal('sequencing'),
  content: sequencingCardContentSchema,
});

/**
 * Content schema for a "True/False" flashcard.
 */
const trueFalseCardContentSchema = z.object({
  statement: z.string().min(1),
  isTrue: z.boolean(),
});

/**
 * Schema for a complete True/False flashcard, identified by `type: 'true_false'`.
 */
const trueFalseCardSchema = z.object({
  type: z.literal('true_false'),
  content: trueFalseCardContentSchema,
});

/**
 * Content schema for a "Multiple Choice" flashcard.
 */
const multipleChoiceCardContentSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2, 'Multiple choice must have at least 2 options.'),
  correctOptionIndex: z.number().int().min(0),
});

/**
 * Schema for a complete Multiple Choice flashcard, identified by `type: 'multiple_choice'`.
 */
const multipleChoiceCardSchema = z.object({
  type: z.literal('multiple_choice'),
  content: multipleChoiceCardContentSchema,
});

/**
 * Zod schema for validating the AI response for the "Generate Flashcards" feature.
 *
 * This validator expects an array of flashcard objects. It uses a `discriminatedUnion`
 * based on the `type` property ('basic', 'input', 'sequencing', 'true_false', 'multiple_choice') to dynamically apply
 * the correct validation schema for each card in the array. This allows for handling
 * a polymorphic array of different card structures in a type-safe manner.
 */
export const FlashcardResponseSchema = z.array(
  z.discriminatedUnion('type', [
    basicCardSchema,
    inputCardSchema,
    sequencingCardSchema,
    trueFalseCardSchema,
    multipleChoiceCardSchema,
  ])
);
