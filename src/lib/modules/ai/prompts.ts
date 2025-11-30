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
import cefrStandards from '$lib/data/cefr_standards.json';

/**
 * Generates a prompt for the "Create Schema from Text" command.
 * Instructs the AI to act as an Information Architect and create a deeply hierarchical
 * Tiptap document from a block of unstructured text.
 */
export function getCreateSchemaPrompt(settings: {}, rawText: string): string {
  return `
**ROLE AND OBJECTIVE:**
You are a world-class Information Architect and Science Communicator. Your mission is to meticulously analyze unstructured text and transform it into a perfectly organized, deeply hierarchical Tiptap JSON document. Your structure must reflect the true relationships between concepts (main topics, sub-topics, details).

**PHILOSOPHY:**
- **MAXIMUM DEPTH:** Do not summarize. If the text contains a detail, it MUST be represented.
- **DEEP HIERARCHY:** Use every available heading level (h1-h6) to show structure. A flat list is a failure.
- **EXHAUSTIVE:** Squeeze every ounce of information from the source text.

**TASK & CONSTRAINTS:**
- Convert the provided raw text into a hierarchical knowledge schema.
- Identify the main title (\`h1\`).
- Identify all major topics and represent them as \`h2\` headings.
- **Crucially, identify all sub-topics and details that belong under a major topic, and represent them using nested \`h3\`, \`h4\`, \`h5\`, and \`h6\` headings.**
- For each heading, write a clear, didactic paragraph explaining the concept in full detail.

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
- **NO FLUFF:** Every sentence must add value.
- **EXAMPLES:** Where appropriate, include concrete examples to illustrate the point.

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
  // If specific types are requested, use them. Otherwise, default to the "God-Level" preference.
  // We prioritize Cloze and Matching as per "Antigravity" rules.
  const typeList =
    settings.types.length > 0
      ? settings.types.join(', ')
      : 'cloze, matching';

  return `
**ROLE AND OBJECTIVE:**
You are an expert Learning Scientist (Sovereign University). Your objective is to create high-efficacy study materials that adhere to the principles of Spaced Repetition (SRS).

**PHILOSOPHY:**
- **ATOMIC DESIGN:** Each card must test exactly ONE concept. Do not bundle multiple facts into one card.
- **CONTEXT IS KING:** For vocabulary, always provide a sentence context. Never test words in isolation.
- **ACTIVE RECALL:** Ensure the user has to produce the answer, not just recognize it.

**CARD TYPES & SCHEMA (STRICT):**
1.  **CLOZE (Context & Grammar):**
    - **Goal:** Test grammar or vocabulary in a full sentence context.
    - **Schema:** { type: 'cloze', content: { text: "Full sentence with {{c1::cloze}}", clozes: ["cloze"], hint: "optional" } }
    - **Rule:** Hide the critical operator or word. The sentence must provide context clues.
2.  **MATCHING (Vocabulary Speed):**
    - **Goal:** Rapid association of terms/definitions or L1/L2 pairs.
    - **Schema:** { type: 'matching', content: { prompt: "Match items", pairs: [{left: "A", right: "B"}] } }
    - **Rule:** Ensure pairs are distinct. No ambiguity.
3.  **BASIC (Conceptual):**
    - **Goal:** Deep understanding questions ("Why?", "How?").
    - **Schema:** { type: 'basic', content: { question: "Q", answer: "A" } }

**ALTE ITEM WRITING RULES:**
- **No Ambiguity:** There must be only one correct answer.
- **Self-Contained:** Cards must be answerable without opening the book.

**VARIETY & UNIQUENESS:**
- **NO DUPLICATES:** Do not test the same word or concept twice.
- **BALANCED MIX:** You MUST generate a mix of card types.
- **DIVERSE PATTERNS:** Avoid using the exact same sentence structure for every card.

**TASK & CONSTRAINTS:**
- Generate **exactly ${settings.quantity}** study cards.
- The cards MUST be a mix of the following types: **[${typeList}]**.

**OUTPUT:**
- Return ONLY a valid JSON array of card objects conforming to the schemas above. Do not wrap it in a parent object.

**DOCUMENT TEXT TO ANALYZE:**
---
${documentText}
---

**BEGIN CARD GENERATION:**
Now, create the JSON array of study cards. Ensure VARIETY, UNIQUENESS, and HIGH EFFICACY.
`;
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

**PHILOSOPHY:**
- **THOROUGHNESS:** Do not just make a superficial change. Deeply integrate the user's instruction into the content.
- **CONTEXT-AWARE:** Ensure the refined section flows seamlessly with the surrounding text.
- **NO SHORTCUTS:** If the user asks for an explanation, provide a complete, detailed one.

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

**PHILOSOPHY:**
- **COMPREHENSIVE:** Apply the instruction to every relevant part of the document. Do not miss anything.
- **CONSISTENCY:** Ensure the tone and style remain consistent throughout the document after the changes.
- **QUALITY:** The final document must be better than the original.

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
 * Generates a prompt for creating a deep, insightful language lesson from provided documents.
 * The user's instruction provides the specific topic or focus.
 */
export function getCreateLessonFromDocsPrompt(instruction: string): string {
  return `
**ROLE:** You are the world's greatest Linguistics Professor and Polyglot Tutor. You have a gift for explaining complex concepts simply, deeply, and insightfully.

**TASK:**
The user has provided reference material (books/documents). Your goal is to transform this raw content into a **Masterpiece Language Lesson**.

**USER INSTRUCTION:**
"${instruction}"

**PHILOSOPHY:**
- **MAXIMUM DEPTH & LENGTH:** Your goal is to be EXHAUSTIVE. Do not summarize. Squeeze every ounce of value from the source material.
- **Elevate the Content:** Expand, clarify, and enrich. If the source mentions a concept briefly, you must explain it fully.
- **Complete & Thorough:** Do not leave important details untouched. If a concept is introduced, explain it.
- **Self-Explanatory:** The lesson must be usable for self-study. Assume the student has no other teacher.
- **Insightful:** Provide cultural context, etymological notes, and "aha!" moments.

**NARRATIVE FLOW:**
- **Seamless Transitions:** Connect every section. Do not just jump from 'Grammar' to 'Vocabulary'. Explain *how* the grammar enables the vocabulary.
- **Lecture Style:** Write as if you are speaking continuously to the student. Use transitional phrases like 'Now that we understand X, let's see how it applies to Y...'
- **No Disjointed Hops:** Avoid making the lesson feel like a list of isolated facts. Weave them into a story of discovery.

**REQUIRED SECTIONS (TIPTAP JSON):**
1.  **Title & Concept:** A clear, engaging title.
2.  **The Core Text/Dialogue:** (Derived from the source). If it's a dialogue, ensure it's natural.
3.  **Phonetic Breakdown:**
    - For every key phrase, provide a detailed phonetic explanation (IPA is good, but also intuitive pronunciation tips).
    - Explain *why* it sounds that way (liaisons, silent letters, tone rules).
4.  **Deep Grammar Analysis:**
    - **Context-First:** Teach grammar through *context* and *examples* first, not abstract rules.
    - **Logic & Bridges:** Explain the *logic* of the grammar and compare it to English (or L1) to create mental bridges.
    - Use color-coding or bolding in your explanation to highlight patterns.
    - **Tables:** Use tables to show conjugations, declensions, or comparisons clearly.
5.  **Cultural & Usage Insights:**
    - **Cultural Reflection:** Compare the target culture to the learner's culture regarding this topic.
    - When is this used? Who uses it? (Formal/Informal).
6.  **Practice & Application:**
    - Create 5-7 high-quality exercises (Cloze, Translation, or Transformation) to test understanding immediately.
    - Provide the answers at the very end with explanations.

**PEDAGOGICAL STRATEGIES:**
- **Plurilingual Bridge:** Explicitly point out similarities between the target language and English (or L1). Use cognates to accelerate learning.
- **Input Hypothesis:** Ensure the text is challenging but accessible (i+1).
- **No Abstract Grammar:** Avoid dry rule lists. Show, then explain.

**OUTPUT:**
Return the lesson content as a VALID Tiptap JSON object. The root object must be of type \`doc\`. Ensure the content is LONG, DETAILED, and COMPREHENSIVE.
`;
}
