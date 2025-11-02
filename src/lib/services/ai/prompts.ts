/**
 * @file Centralized Library of Prompts for AI-Powered Learning Tools
 *
 * @remarks
 * This file serves as the definitive library for all instructional prompts sent to the
 * generative AI model. Each prompt is meticulously engineered to elicit a specific,
 * structured response, almost always in a JSON format. This structured data approach
 * is critical for ensuring reliable and predictable integration between the AI's output
 * and the application's various components, such as the Tiptap editor for schema
 * generation and the Svelte components for rendering interactive study cards.
 *
 * The prompts are designed with a "Bring Your Own Key" (BYOK) model in mind, where the
 * end-user's API key is used for authentication with the AI service. This decentralizes
 * API usage and cost.
 *
 * The primary functionalities covered by these prompts include:
 * 1.  **Schema Creation**: Converting unstructured, free-form text into a hierarchical,
 *     editable schema document (Tiptap JSON).
 * 2.  **Node Expansion**: Elaborating on specific concepts within an existing schema to
 *     add depth and detail.
 * 3.  **Flashcard Generation**: Creating a variety of interactive study cards (e.g.,
 *     basic Q&A, fill-in-the-blank, sequencing) from a given piece of text.
 */

import type { CardType } from '$lib/types';

/**
 * A detailed, role-playing prompt that instructs the AI to act as an Information
 * Architect and Science Communicator. Its primary goal is to convert a blob of
 * unstructured text into a well-organized, pedagogically sound Tiptap JSON document.
 *
 * @remarks
 * The prompt is engineered to achieve two main objectives:
 * - **Structuring**: It must generate a valid Tiptap document with a root `heading`
 *   (serving as the title) followed by a linear sequence of level 2 `heading` nodes and `paragraph` nodes.
 * - **Explaining**: For each identified concept, it must provide a clear,
 *   didactic description suitable for learning, effectively applying the Feynman Technique
 *   (explaining a concept in simple terms).
 *
 * The `{{TEXT_INPUT}}` placeholder is intended to be replaced with the user's raw text input.
 */
export const CREATE_SCHEMA_FROM_TEXT_PROMPT_V4_PEDAGOGICAL = `
**ROLE AND OBJECTIVE:**
You are an exceptional hybrid: an Information Architect with the soul of an expert Science Communicator. Your mission is twofold:
1.  **Structure:** Convert unstructured text into a perfectly organized Tiptap JSON document.
2.  **Illuminate:** Write descriptions for each concept that are so clear, context-rich, and fluid that anyone can understand them, applying the Feynman Technique.

**TIPTAP STRUCTURE RULES:**
1.  Your response MUST be exclusively a valid JSON object, without comments.
2.  The root object must be of type \`doc\`.
3.  The content of the \`doc\` must start with a level 1 \`heading\` (the main title).
4.  After the title, create a flat, linear sequence of nodes.
5.  Each key concept should be a level 2 \`heading\`.
6.  Immediately following each level 2 \`heading\`, add a \`paragraph\` node containing its didactic explanation.

**QUALITY EXAMPLE:**
- **Example Input:** "The Solar System is composed of the Sun and the planets. The planets are divided into inner, like Earth, and outer, like Jupiter."
- **Example JSON Output:**
\`\`\`json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Composition of the Solar System" }]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Inner Planets" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Known as the rocky planets, they are the four closest to the Sun and are characterized by their solid surface." }]
    },
    {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Outer Planets" }]
    },
    {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Known as the gas giants, these are the four planets furthest from the Sun and are primarily composed of hydrogen, helium, and methane." }]
    }
  ]
}
\`\`\`

**BEGIN TASK:**

<TEXT>
{{TEXT_INPUT}}
</TEXT>
`;

/**
 * A prompt that directs the AI to act as an expert tutor and expand upon a specific
 * concept node within an existing schema.
 *
 * @remarks
 * This prompt is used to add hierarchical depth to the user's knowledge schema by generating
 * 2-3 relevant sub-points for a given node. The expected output is a Tiptap JSON
 * array of nodes, which can be seamlessly inserted into the existing Tiptap document.
 *
 * Placeholders:
 * - `{{NODE_TEXT}}`: The text content of the node that the user wishes to expand.
 * - `{{CONTEXT_BREADCRUMB}}`: The hierarchical path to the node (e.g., "Science > Physics > Quantum Mechanics"),
 *   providing essential context to the AI.
 */
export const EXPAND_NODE_PROMPT_V4_PEDAGOGICAL = `
**ROLE AND OBJECTIVE:**
You are an expert tutor and Tiptap specialist. Your task is to expand a concept by generating sub-points, adding explanatory text with exceptional clarity as if guiding a student.

**SCHEMA CONTEXT:**
Main concept: "{{NODE_TEXT}}"
Its path in the schema is: \`{{CONTEXT_BREADCRUMB}}\`

**TASK:**
Generate 2-3 relevant sub-points. For each one, write a didactic and enriching description.

**RULES AND OUTPUT STRUCTURE:**
1.  Your response MUST be a valid JSON array of Tiptap nodes.
2.  Each sub-point should be a level 3 \`heading\`.
3.  Each level 3 \`heading\` MUST be immediately followed by a \`paragraph\` node containing its explanation.

**QUALITY EXAMPLE:**
- **Concept to expand:** "SEO Strategies"
- **Example JSON Output:**
\`\`\`json
[
  {
    "type": "heading",
    "attrs": { "level": 3 },
    "content": [{ "type": "text", "text": "On-Page SEO" }]
  },
  {
    "type": "paragraph",
    "content": [{ "type": "text", "text": "Refers to all the improvements you apply directly on your page (titles, content, images) so that search engines understand what it is about and consider it relevant." }]
  },
  {
    "type": "heading",
    "attrs": { "level": 3 },
    "content": [{ "type": "text", "text": "Off-Page SEO" }]
  },
  {
    "type": "paragraph",
    "content": [{ "type": "text", "text": "Involves actions taken outside of your own website to impact your rankings within search engine results pages, such as link building and social media marketing." }]
  }
]
\`\`\`

**BEGIN TASK:**
Now, expand the concept provided in the context."
`;

/**
 * A prompt designed to generate a diverse set of interactive study cards from a piece of text.
 *
 * @remarks
 * This prompt instructs the AI to adopt the persona of a learning science expert. Its goal
 * is to create 2-3 distinct study cards in different formats (`basic`, `input`, `sequencing`).
 * This variety is intended to enhance the effectiveness and engagement of the user's study
 * session. The expected output is a clean JSON array of `Card` objects, conforming to the
 * provided TypeScript interface definitions.
 *
 * The `{{NODE_TEXT}}` placeholder should be replaced with the source text for the cards.
 */
export const GENERATE_FLASHCARDS_V2_PROMPT = `
You are an expert in learning science and active recall. Based on the following text, generate 2-3 key study cards using different formats.

Your response must be ONLY a valid JSON object, an array of card objects that follow this TypeScript interface:
\`\`\`typescript
type Card = BasicCard | InputCard | SequencingCard;

interface BasicCard {
  type: 'basic';
  content: {
    question: string;
    answer: string;
  };
}

interface InputCard {
  type: 'input';
  content: {
    prompt: string; // e.g., "The capital of France is {{...}}"
    expected: string; // e.g., "Paris"
  };
}

interface SequencingCard {
  type: 'sequencing';
  content: {
    prompt: string; // e.g., "Order the planets from the sun:"
    items: string[]; // e.g., ["Mercury", "Venus", "Earth", "Mars"]
  };
}
\`\`\`

**RULES:**
1.  Vary the card types. Create at least one 'basic' and one 'input' or 'sequencing' card if possible.
2.  For 'input' cards, the prompt MUST include "{{...}}" where the answer should go.
3.  For 'sequencing' cards, the 'items' array MUST be in the correct order.

Base text for the cards:
---
{{NODE_TEXT}}
---
`;

/**
 * A factory function that generates a highly targeted prompt for creating a single
 * study card of a specific, user-requested type.
 *
 * @param type - The desired type of card to generate (`basic`, `input`, or `sequencing`).
 * @param text - The source text from which the AI should create the card.
 * @returns A formatted prompt string that clearly instructs the AI to generate a JSON object
 *          for a single card of the specified type, adhering to the specified interface.
 */
export function getSpecificCardPrompt(type: CardType, text: string): string {
  switch (type) {
    case 'input':
      return `Based on the text below, create ONE study card where the user must type the answer.
Your response MUST be ONLY a valid JSON object following this interface:
\`\`\`typescript
interface InputCard {
  type: 'input';
  content: {
    prompt: string; // "The main idea is {{...}}"
    expected: string;
  };
}
\`\`\`
RULES: The 'prompt' MUST include "{{...}}" as a placeholder.

TEXT:
---
${text}
---`;

    case 'sequencing':
      return `Based on the text below, create ONE study card where the user must order a sequence of items.
Your response MUST be ONLY a valid JSON object following this interface:
\`\`\`typescript
interface SequencingCard {
  type: 'sequencing';
  content: {
    prompt: string; // "Order the steps:"
    items: string[]; // ["Step 1", "Step 2", "Step 3"]
  };
}
\`\`\`
RULES: The 'items' array must contain the items in the CORRECT order.

TEXT:
---
${text}
---`;

    case 'basic':
    default:
      return `Based on the text below, create ONE basic question and answer study card.
Your response MUST be ONLY a valid JSON object following this interface:
\`\`\`typescript
interface BasicCard {
  type: 'basic';
  content: {
    question: string;
    answer: string;
  };
}
\`\`\`

TEXT:
---
${text}
---`;
  }
}
