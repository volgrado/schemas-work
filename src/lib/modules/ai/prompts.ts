/**
 * @file prompts.ts
 * @library
 *
 * @description
 * This file is the central library of highly-engineered prompts for the AI Action Workbench.
 * Each function in this file is a "prompt factory," responsible for generating a precise,
 * context-aware set of instructions for the language model to perform a specific task.
 */

import type { JSONContent } from '@tiptap/core';
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
interface TrueFalseCard { type: 'true_false'; content: { statement: string; isTrue: boolean; }; }
interface MultipleChoiceCard { type: 'multiple_choice'; content: { question: string; options: string[]; correctOptionIndex: number; }; }
interface ClozeCard { type: 'cloze'; content: { text: string; clozes: string[]; }; }
interface MatchingCard { type: 'matching'; content: { prompt: string; pairs: { left: string; right: string; }[]; }; }
\`\`\`

**TYPE-SPECIFIC INSTRUCTIONS:**
- **Cloze**: The \`text\` must contain the full sentence. The \`clozes\` array must contain the exact words from the text that should be hidden. Example: text="The capital of France is Paris.", clozes=["Paris"].
- **Matching**: Create 3-5 pairs of related items (e.g., Term/Definition, Country/Capital).
- **Multiple Choice**: Provide 3-4 plausible options.


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
 * It provides the current draft of a document for context and can be given a
 * specific selection to operate on, along with a user instruction.
 */
export function getInteractiveRefinementPrompt(
  fullDocumentJSON: JSONContent,
  selectedText: string | null,
  instruction: string
): string {
  // --- NEW: Define the KaTeX rule to be used in both cases ---
  const katexRule = `
**MATHEMATICAL NOTATION RULE:**
- When you need to include mathematical formulas or symbols, you MUST format them using KaTeX syntax.
- For **inline math**, like mentioning π in a sentence, use the \`\\( ... \\)\` delimiters. Example: "The formula is \\( E = mc^2 \\)."
- For **block-level math**, which should be on its own line, use the \`\\[ ... \\]\` delimiters. Example: "The Pythagorean theorem is expressed as: \\[ a^2 + b^2 = c^2 \\]"
`;

  // Case 1: The user has selected a specific piece of text to refine.
  if (selectedText && selectedText.trim() !== '') {
    return `
You are an expert editor and Tiptap JSON specialist. Your task is to refine a specific part of a larger document based on the user's instruction.

${katexRule}

USER'S INSTRUCTION:
"${instruction}"

SELECTED TEXT TO REFINE:
The user has selected the following text block to apply the instruction to:
---
${selectedText}
---

FULL DOCUMENT CONTEXT (CURRENT DRAFT):
For context, here is the full document in Tiptap JSON format. The "SELECTED TEXT" is a part of this document. Do not modify any other part of the document.
\`\`\`json
${JSON.stringify(fullDocumentJSON, null, 2)}
\`\`\`

YOUR TASK:
1.  Locate the content that corresponds to the "SELECTED TEXT" within the full document.
2.  Apply the user's instruction ONLY to that specific part, following all formatting rules.
3.  Return the ENTIRE, complete document in the exact same Tiptap JSON format, with only the relevant section modified. Your output must be a single, valid JSON object that can be parsed directly.
`;
  }

  // Case 2: No text is selected. The instruction applies to the entire document.
  else {
    return `
You are an expert editor and Tiptap JSON specialist. Your task is to refine an entire document based on the user's instruction.

${katexRule}

USER'S INSTRUCTION:
"${instruction}"

FULL DOCUMENT (CURRENT DRAFT):
Here is the full document in Tiptap JSON format:
\`\`\`json
${JSON.stringify(fullDocumentJSON, null, 2)}
\`\`\`

YOUR TASK:
1.  Apply the user's instruction to the entire document, following all formatting rules.
2.  Return the ENTIRE, complete document in the exact same Tiptap JSON format. Your output must be a single, valid JSON object that can be parsed directly.
`;
  }
}

/**
 * NEW: Generates a prompt specifically for converting a natural language
 * math description into a clean KaTeX string.
 */
export function getGenerateFormulaPrompt(description: string): string {
  return `
**ROLE AND OBJECTIVE:**
You are a mathematics professor and a world-class LaTeX expert. Your sole mission is to convert the user's plain text description of a mathematical concept into a single, clean, and syntactically perfect KaTeX string.

**TASK & CONSTRAINTS:**
- Analyze the user's request: "${description}"
- Generate ONLY the corresponding KaTeX formula.

**RULES AND OUTPUT STRUCTURE:**
1.  Your entire response MUST be ONLY the raw KaTeX string.
2.  Do NOT include any delimiters like \`\\(\`, \`\\[\`, or \`$\`.
3.  Do NOT include any JSON, markdown, or explanatory text. Just the formula itself.

**EXAMPLES:**
- User Request: "the quadratic formula" -> Your Output: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"
- User Request: "the integral of x squared" -> Your Output: "\\int x^2 \\,dx"
- User Request: "einstein's mass energy equivalence" -> Your Output: "E = mc^2"

**BEGIN TASK:**
Now, convert the user's request into a single KaTeX string.
`;
}
