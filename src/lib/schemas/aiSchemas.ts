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
  }),
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

/**
 * Validator for the "Generate Flashcards" response.
 * Expects an array of objects, each with a question ('q') and an answer ('a').
 */
export const FlashcardResponseSchema = z.array(
  z.object({
    q: z.string().min(1, 'The card question cannot be empty.'),
    a: z.string().min(1, 'The card answer cannot be empty.'),
  }),
);
