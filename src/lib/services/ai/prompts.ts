/**
 * @file Prompt Library V5.0 - Multi-Card & BYOK Focused
 *
 * Contains all the necessary prompts for the application's AI functionalities,
 * including schema creation and advanced, multi-format card generation.
 * This version is optimized for a "Bring Your Own Key" (BYOK) workflow.
 */
import type { Card, CardType } from '$lib/types';

/**
 * Prompt for creating a new schema from unstructured text, outputting Tiptap JSON.
 */
export const CREATE_SCHEMA_FROM_TEXT_PROMPT_V4_PEDAGOGICAL = `
**ROLE AND OBJECTIVE:**
You are an exceptional hybrid: an Information Architect with the soul of an expert Science Communicator. Your mission is twofold:
1.  **Structure:** Convert unstructured text into a perfectly organized Tiptap JSON document.
2.  **Illuminate:** Write descriptions for each concept that are so clear, context-rich, and fluid that anyone can understand them, applying the Feynman Technique.

**TIPTAP STRUCTURE RULES:**
1.  Your response MUST be exclusively a valid JSON object, without comments.
2.  The root object must be of type \`doc\`.
3.  The content of the \`doc\` must have a level 1 \`heading\` (the title) and a \`bulletList\` (the schema).
4.  Each element of the schema is a \`listItem\`.
5.  Within each \`listItem\`, the first node must be a \`paragraph\` with \`"attrs": { "role": "term" }\` for the key concept.
6.  Add a second \`paragraph\` with \`"attrs": { "role": "description" }\` to explain the concept didactically.

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
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "attrs": { "role": "term" },
              "content": [{ "type": "text", "text": "Inner Planets" }]
            },
            {
              "type": "paragraph",
              "attrs": { "role": "description" },
              "content": [{ "type": "text", "text": "Known as the rocky planets, they are the four closest to the Sun and are characterized by their solid surface." }]
            }
          ]
        }
      ]
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
 * Prompt for expanding a node in the schema, outputting Tiptap JSON for a nested list.
 */
export const EXPAND_NODE_PROMPT_V4_PEDAGOGICAL = `
**ROLE AND OBJECTIVE:**
You are an expert tutor and Tiptap specialist. Your task is to expand a concept, adding sub-points that not only list information but explain it with exceptional clarity, as if you were guiding a student.

**SCHEMA CONTEXT:**
Main concept: "{{NODE_TEXT}}"
Its path in the schema is: \`{{CONTEXT_BREADCRUMB}}\`

**TASK:**
Generate 2-3 relevant sub-points. For each one, write a didactic and enriching description.

**RULES AND OUTPUT STRUCTURE:**
1.  Your response MUST be a valid JSON object representing a \`bulletList\`.
2.  Each \`listItem\` must contain a \`paragraph\` with \`"attrs": { "role": "term" }\` (the key) and a second \`paragraph\` with \`"attrs": { "role": "description" }\` (the explanation).

**QUALITY EXAMPLE:**
- **Concept to expand:** "SEO Strategies"
- **Example JSON Output:**
\`\`\`json
{
  "type": "bulletList",
  "content": [
    {
      "type": "listItem",
      "content": [
        {
          "type": "paragraph",
          "attrs": { "role": "term" },
          "content": [{ "type": "text", "text": "On-Page SEO" }]
        },
        {
          "type": "paragraph",
          "attrs": { "role": "description" },
          "content": [{ "type": "text", "text": "Refers to all the improvements you apply directly on your page (titles, content, images) so that search engines understand what it is about and consider it relevant." }]
        }
      ]
    }
  ]
}
\`\`\`

**BEGIN TASK:**
Now, expand the concept provided in the context."
`;

/**
 * V2: Generates a variety of study cards from a given text.
 * Instructs the AI to create different card types for a richer learning experience.
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
 * Generates a prompt for creating a single, specific type of card.
 * @param type The type of card to create.
 * @param text The source text for the card.
 * @returns A formatted prompt string.
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
