/**
 * @file prompts.ts
 * @library
 *
 * @description
 * This file is the central library of highly-engineered prompts for the AI Action Workbench.
 * Each function in this file is a "prompt factory," responsible for generating a precise,
 * context-aware set of instructions for the language model to perform a specific task.
 */

// REFINEMENT: Import the SRS namespace for card-related types.
import type { SRS } from '$lib/types';

/**
 * Generates a prompt for the "Create Schema from Text" command.
 * Instructs the AI to act as an Information Architect and create a deeply hierarchical
 * Tiptap document from a block of unstructured text.
 */
export function getCreateSchemaPrompt(settings: {}, rawText: string): string {
  return `
**ROLE AND OBJECTIVE:**
You are a world-class Information Architect and Science Communicator. Your mission is to meticulously analyze unstructured text and transform it into a perfectly organized, deeply hierarchical Tiptap JSON document. Your structure must reflect the true relationships between concepts (main topics, sub-topics, details).

**TASK & CONSTRAINTS:**
- Convert the provided raw text into a hierarchical knowledge schema.
- Identify the main title (\`h1\`).
- Identify all major topics and represent them as \`h2\` headings.
- **Crucially, identify all sub-topics and details that belong under a major topic, and represent them using nested \`h3\`, \`h4\`, etc., headings.**
- For each heading, write a clear, didactic paragraph explaining the concept.

**RULES AND OUTPUT STRUCTURE:**
1.  Your entire response MUST be a single, valid Tiptap JSON object.
2.  The root object must be of type \`doc\`.
3.  The \`doc\` must start with a level 1 \`heading\`.
4.  **You MUST create a nested structure. Do NOT produce a flat list.** Use headings of different levels (\`"level": 2\`, \`"level": 3\`, etc.) to show how concepts are related.
5.  Every \`heading\` node, regardless of its level, MUST be immediately followed by a \`paragraph\` node containing its explanation.
6.  Do NOT include comments, markdown, or any other text outside of the final JSON object.

**RAW TEXT TO PROCESS:**
---
${rawText}
---

**BEGIN TASK:**
Now, generate the deeply hierarchical Tiptap JSON document based on the provided text and all rules.
`;
}

/**
 * Generates a prompt for the "Expand Node" command.
 * Instructs the AI to act as an expert tutor and generate relevant sub-points
 * for a specific concept within an existing document.
 */
export function getExpandNodePrompt(
  settings: { quantity: number; tone: string; depth: string },
  nodeText: string,
  breadcrumb: string
): string {
  return `
**ROLE AND OBJECTIVE:**
You are an expert tutor and Tiptap JSON specialist. Your task is to expand upon a given concept by generating relevant sub-points. Your explanations must be exceptionally clear, enriching, and tailored to the specified tone and depth, as if you are guiding a student towards deeper understanding.

**CONTEXT:**
- The main concept to expand is: "${nodeText}"
- The concept's location within the user's knowledge schema is: \`${breadcrumb}\`

**TASK & CONSTRAINTS:**
- Generate **exactly ${settings.quantity}** distinct and relevant sub-points.
- The tone of the descriptions must be strictly **${settings.tone}**.
- The level of detail for each description should be **${settings.depth}**.

**RULES AND OUTPUT STRUCTURE:**
1.  Your entire response MUST be a single, valid JSON object with a single root key: "content".
2.  The value of "content" MUST be a JSON array of Tiptap node objects.
3.  Within the array, each sub-point must be represented by a \`heading\` node with \`"level": 3\`.
4.  Each \`heading\` node MUST be immediately followed by a \`paragraph\` node containing its explanation.
5.  Do NOT include comments or any other text outside of the primary JSON object.

**BEGIN TASK:**
Now, expand the concept "${nodeText}" according to all rules and constraints.
`;
}

/**
 * Generates a prompt for the "Generate Study Cards" command.
 * Instructs the AI to act as a pedagogical expert and create a set of high-quality,
 * varied flashcards from the text of an entire document.
 */
export function getGenerateCardsPrompt(
  settings: {
    quantity: number;
    // REFINEMENT: Use the namespaced SRS.CardType.
    types: SRS.CardType[];
  },
  documentText: string
): string {
  const typeList =
    settings.types.length > 0 ? settings.types.join(', ') : 'any';

  return `
**ROLE AND OBJECTIVE:**
You are an expert in pedagogical science, specializing in creating effective, high-quality study materials based on the principles of active recall. Your objective is to analyze the provided document text and generate a set of study cards that are conceptually significant and promote deep learning.

**TASK & CONSTRAINTS:**
- Generate **exactly ${settings.quantity}** study cards.
- The cards MUST be a mix of the following types: **[${typeList}]**.
- The cards must be of exceptional quality, targeting the most critical concepts, relationships, and processes within the document. Avoid trivial information.

**RULES & OUTPUT STRUCTURE:**
1.  Your response must be ONLY a valid JSON array of card objects. Do not wrap it in a parent object or include any explanatory text.
2.  Each object in the array must conform to one of the following TypeScript interfaces:

\`\`\`typescript
interface BasicCard { type: 'basic'; content: { question: string; answer: string; }; }
interface InputCard { type: 'input'; content: { prompt: string; expected: string; }; }
interface SequencingCard { type: 'sequencing'; content: { prompt: string; items: string[]; }; }
\`\`\`

**DOCUMENT TEXT TO ANALYZE:**
---
${documentText}
---

**BEGIN CARD GENERATION:**
Now, create the JSON array of study cards based on the document and all the rules provided.
`;
}

/**
 * The "Master" prompt for the Interactive Document Workbench.
 * It provides the full document for context, but can be given a specific
 * selection to operate on, along with a user instruction.
 */
export function getInteractiveRefinementPrompt(
  fullDocumentText: string,
  selectedText: string | null,
  instruction: string
): string {
  const selectionBlock = selectedText
    ? `
**TEXT TO MODIFY (ONLY THIS PART):**
---
${selectedText}
---
`
    : '';

  const mainInstruction =
    instruction ||
    (selectedText
      ? 'Refine the selected text based on my next instruction.'
      : 'Analyze the full document and await my instruction.');

  return `
**ROLE AND OBJECTIVE:**
You are a world-class editor and Tiptap JSON specialist. Your task is to act as a writing partner. You will receive an entire document for context and a specific user instruction. If a "TEXT TO MODIFY" block is present, you must apply your changes ONLY to that part of the document, ensuring it integrates seamlessly. Your output must ALWAYS be the complete, rewritten Tiptap JSON for the entire document.

**USER INSTRUCTION:**
"${mainInstruction}"

${selectionBlock}

**RULES AND OUTPUT STRUCTURE:**
1.  Your entire response MUST be a single, valid Tiptap JSON object for the **entire document**.
2.  The root object must be of type \`doc\`.
3.  Apply the user's instruction precisely. If a "TEXT TO MODIFY" block is present, apply the changes ONLY to that part of the document, ensuring it integrates perfectly with the surrounding, unchanged content.
4.  Do NOT include comments, markdown, or any text outside of the final JSON object.

**FULL DOCUMENT CONTEXT:**
---
${fullDocumentText}
---

**BEGIN TASK:**
Now, return the complete and revised Tiptap JSON for the entire document based on the instruction.
`;
}
