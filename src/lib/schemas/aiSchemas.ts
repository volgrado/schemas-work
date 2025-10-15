import { z } from 'zod';

/**
 * This file centralizes all Zod validation schemas
 * for AI-generated responses. Each schema corresponds
 * to a specific prompt in `prompts.ts`.
 */

/**
 * Base and recursive schema for a generic Tiptap/ProseMirror node.
 * Uses z.lazy() to handle the recursive nature where a node
 * can contain an array of other nodes in its 'content' property.
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
 * Validator for the "Create Schema" response.
 * Expects a complete Tiptap document, whose root node must be of type 'doc'.
 */
export const CreateSchemaAiResponseSchema = z.object({
  type: z.literal('doc'),
  content: z.array(tiptapNodeSchema).min(1, 'The document cannot be empty'),
});

/**
 * Validator for the "Expand Node" response.
 * Expects a Tiptap fragment that is a list, whose root node must be 'bulletList'.
 */
export const ExpandNodeAiResponseSchema = z.object({
  type: z.literal('bulletList'),
  content: z.array(tiptapNodeSchema).optional(), // The content can be an empty list
});

/**
 * Validator for the "Change Tone" response.
 * Expects a simple object with the rewritten text.
 */
export const ChangeToneAiResponseSchema = z.object({
  rewrittenText: z.string().min(1, 'The rewritten text cannot be empty.'),
});

// --- NUEVOS ESQUEMAS PARA TARJETAS POLIMÓRFICAS ---

const basicCardContentSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});
const basicCardSchema = z.object({
  type: z.literal('basic'),
  content: basicCardContentSchema,
});

const inputCardContentSchema = z.object({
  prompt: z.string().min(1),
  expected: z.string().min(1),
});
const inputCardSchema = z.object({
  type: z.literal('input'),
  content: inputCardContentSchema,
});

const sequencingCardContentSchema = z.object({
  prompt: z.string().min(1),
  items: z
    .array(z.string())
    .min(2, 'Sequencing card must have at least 2 items.'),
});
const sequencingCardSchema = z.object({
  type: z.literal('sequencing'),
  content: sequencingCardContentSchema,
});

/**
 * Validator for the "Generate Flashcards" response.
 * Expects an array of objects, each being a valid Card type.
 * Uses a discriminated union to validate against the different card structures.
 */
export const FlashcardResponseSchema = z.array(
  z.discriminatedUnion('type', [
    basicCardSchema,
    inputCardSchema,
    sequencingCardSchema,
  ])
);
