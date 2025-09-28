// src/lib/services/ai/prompts.ts

/**
 * Este archivo es la librería central de "recetas de IA" para la aplicación.
 * Proporciona plantillas de prompts de alta calidad que el usuario puede copiar
 * para usar en su propio servicio de LLM (ChatGPT, Claude, etc.).
 *
 * La clave es el formato de salida JSON estrictamente definido, que permite
 * a la aplicación integrar las respuestas de forma automática.
 */

// --- 1. Creación de Esquemas ---
export const CREATE_SCHEMA_FROM_TEXT_PROMPT = `
Eres un experto en estructuración de conocimiento. Tu tarea es convertir el siguiente texto en un esquema jerárquico y conciso.

Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido que siga esta interfaz TypeScript:
\`\`\`typescript
interface AISchemaNode {
  content: string;
  children?: AISchemaNode[];
}
interface AISchemaResponse {
  title: string;
  nodes: AISchemaNode[];
}
\`\`\`

Texto a procesar:
---
{{TEXT_INPUT}}
---
`;

// --- 2. Expansión de Nodos ---
export const EXPAND_NODE_PROMPT = `
Eres un asistente de escritura. Tu tarea es expandir el siguiente concepto con 2 o 3 sub-puntos relevantes en una lista anidada.

Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido que siga esta interfaz TypeScript:
\`\`\`typescript
// Representa una lista de nuevos nodos hijos a añadir.
type AIExpansionResponse = AISchemaNode[];

interface AISchemaNode {
  content: string;
  children?: AISchemaNode[];
}
\`\`\`

Concepto a expandir:
---
{{NODE_TEXT}}
---
`;

// --- 3. Generación de Tarjetas de Estudio (Flashcards) ---
export const GENERATE_FLASHCARDS_PROMPT = `
Eres un experto en técnicas de aprendizaje como el recuerdo activo. Basado en el siguiente texto, genera 2 o 3 preguntas y respuestas clave para crear tarjetas de estudio.

Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido, un array de objetos que siga esta interfaz TypeScript:
\`\`\`typescript
interface DomainCard {
  q: string; // La pregunta
  a: string; // La respuesta
}
type AIFlashcardResponse = DomainCard[];
\`\`\`

Texto base para las tarjetas:
---
{{NODE_TEXT}}
---
`;

// --- 4. Cambio de Tono ---
export const CHANGE_TONE_PROMPT = `
Eres un editor experto. Reescribe el siguiente texto para que tenga un tono más {{TONE}}.

Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido que siga esta interfaz TypeScript:
\`\`\`typescript
interface AIToneChangeResponse {
  // El texto completo reescrito en el tono solicitado.
  rewrittenText: string;
}
\`\`\`

Texto a reescribir:
---
{{TEXT_INPUT}}
---
`;
