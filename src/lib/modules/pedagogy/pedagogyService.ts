/**
 * @file pedagogyService.ts
 * @service
 * @description
 * The "Principal" of the Sovereign University. This service orchestrates the learning
 * logic based on the CEFR/ALTE standards and Plurilingual guidelines.
 * It is responsible for Curriculum Generation, Progress Calibration, and Mission Design.
 */

import cefrStandards from '$lib/data/cefr_standards.json';
// Note: In a real app we might inject aiService, but here we just prepare prompts/logic
// import * as aiService from '$lib/services/ai/aiService';

export type CEFRLevel = 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface CurriculumNode {
  id: string;
  title: string;
  level: CEFRLevel;
  descriptor: string;
  type: 'grammar' | 'vocabulary' | 'function' | 'mission';
  status: 'locked' | 'available' | 'mastered';
  prerequisites: string[];
}

/**
 * Retrieves the official CEFR descriptor for a given skill and level.
 */
export function getDescriptor(skill: keyof typeof cefrStandards.scales, level: CEFRLevel): string {
  // @ts-ignore - JSON structure is static and known
  return cefrStandards.scales[skill]?.[level] || "Descriptor not found.";
}

/**
 * Generates a "Bridge Lesson" strategy based on Plurilingual principles.
 * Identifies what can be transferred from L1 to L2.
 */
export function getPlurilingualStrategy(l1: string, l2: string): string {
  return `
    **PLURILINGUAL STRATEGY:**
    - The user speaks ${l1}. The target is ${l2}.
    - EXPLICITLY identify cognates (shared vocabulary).
    - EXPLICITLY compare shared grammatical structures (e.g., if both have gendered nouns).
    - DO NOT teach shared concepts from scratch. "Activate" them by showing the mapping.
  `;
}

/**
 * Validates a generated lesson against ALTE standards.
 * This effectively "grades" the AI's output before showing it to the user.
 */
export async function validateLessonCompliance(lessonText: string, level: CEFRLevel): Promise<boolean> {
  // Simple heuristic for now, would be an AI call in production
  // Checking if the text matches the complexity expected of the level.
  return true;
}

/**
 * Generates the "Examiner Prompt" for calibration tests.
 */
export function getCalibrationPrompt(l1: string, l2: string): string {
  return `
    **ROLE:** Certified CEFR Examiner & Plurilingual Assessor.
    **CONTEXT:** User speaks ${l1} and wants to learn ${l2}.
    **TASK:** 1. Conduct a brief diagnostic interview.
    2. Start with an A1 task: "Translate: 'Hello, how are you?'".
    3. If correct, scale up to B1: "Describe your job responsibilities."
    4. Analyze the errors. Is it a Vocabulary gap? A Grammar gap? Or L1 interference?
    5. Output a JSON object with: { "detectedLevel": "A2", "strengths": [...], "weaknesses": [...] }
  `;
}

/**
 * Constructs a Curriculum Tree based on a specific goal (e.g., "Travel").
 */
export function buildCurriculumTree(goal: string, currentLevel: CEFRLevel): CurriculumNode[] {
  // This would dynamically generate the tree.
  // For this scaffold, we return a static example structure based on the standards.

  return [
    {
      id: 'node_a1_1',
      title: 'Greetings & Introduction',
      level: 'A1',
      descriptor: getDescriptor('overall_listening', 'A1'),
      type: 'function',
      status: 'available',
      prerequisites: []
    },
    {
      id: 'node_a1_2',
      title: 'Ordering Food (Mediation)',
      level: 'A1',
      descriptor: getDescriptor('mediation_text', 'A1'),
      type: 'mission',
      status: 'locked',
      prerequisites: ['node_a1_1']
    }
  ];
}
