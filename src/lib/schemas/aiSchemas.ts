import { z } from 'zod';

/**
 * Este archivo centraliza todos los esquemas de validación de Zod
 * para las respuestas generadas por la IA. Cada esquema corresponde
 * a un prompt específico en `prompts.ts`.
 */

// --- 1. Esquemas para la Estructura de Tiptap ---

/**
 * Esquema base y recursivo para un nodo genérico de Tiptap/ProseMirror.
 * Utiliza z.lazy() para manejar la naturaleza recursiva donde un nodo
 * puede contener un array de otros nodos en su propiedad 'content'.
 */
export const tiptapNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    // ✅ CORRECCIÓN AQUÍ: z.record() necesita el tipo de la clave (string) y el tipo del valor (any).
    attrs: z.record(z.string(), z.any()).optional(),
    content: z.array(tiptapNodeSchema).optional(),
    marks: z.array(z.any()).optional(),
    text: z.string().optional(),
  })
);

/**
 * Validador para la respuesta de "Crear Esquema".
 * Espera un documento Tiptap completo, cuyo nodo raíz debe ser de tipo 'doc'.
 */
export const CreateSchemaAiResponseSchema = z.object({
  type: z.literal('doc'),
  content: z
    .array(tiptapNodeSchema)
    .min(1, 'El documento no puede estar vacío'),
});

/**
 * Validador para la respuesta de "Expandir Nodo".
 * Espera un fragmento de Tiptap que es una lista, cuyo nodo raíz debe ser 'bulletList'.
 */
export const ExpandNodeAiResponseSchema = z.object({
  type: z.literal('bulletList'),
  content: z.array(tiptapNodeSchema).optional(), // El contenido puede ser una lista vacía
});

// --- 2. Esquemas para Otras Funcionalidades de IA ---

/**
 * Validador para la respuesta de "Cambio de Tono".
 * Espera un objeto simple con el texto reescrito.
 */
export const ChangeToneAiResponseSchema = z.object({
  rewrittenText: z.string().min(1, 'El texto reescrito no puede estar vacío.'),
});

/**
 * Validador para la respuesta de "Generar Flashcards".
 * Espera un array de objetos, cada uno con una pregunta ('q') y una respuesta ('a').
 */
export const FlashcardResponseSchema = z.array(
  z.object({
    q: z.string().min(1, 'La pregunta de la tarjeta no puede estar vacía.'),
    a: z.string().min(1, 'La respuesta de la tarjeta no puede estar vacía.'),
  })
);
