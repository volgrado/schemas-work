
/**
 * Curriculum Scheduler
 * Handles task generation, scenario creation, and sequencing.
 */

import type { 
  CurriculumNode, 
  ActionOrientedTask, 
  Scenario, 
  CEFRLevel, 
  SelfAssessment,
  PedagogicalPolicy
} from '../domain/models';

// --- Task Templates Registry ---

const TASK_TEMPLATES: Record<string, (node: CurriculumNode) => ActionOrientedTask> = {
  'functional': (node) => ({
    id: `task_func_${node.id}`,
    description: `Roleplay a conversation involving: ${node.title}`,
    context: "Everyday social interaction.",
    role: "Yourself",
    outcome: "Communicate your intent clearly.",
    criteria: ["Fluency", "Appropriateness"],
    interculturalNote: "Pay attention to register.",
    inputType: 'text',
    inputPrompt: "Type your response here (e.g., 'Hello, how are you?')..."
  }),
  'mission': (node) => ({
    id: `task_miss_${node.id}`,
    description: `Complete the mission: ${node.title}`,
    context: "A simulated scenario requiring multiple steps.",
    role: "Agent / Problem Solver",
    outcome: "Solve the problem using target language.",
    criteria: ["Task Completion", "Strategy Use"],
    interculturalNote: "Cultural norms may affect the solution.",
    inputType: 'text',
    inputPrompt: "Describe the steps you would take to solve this mission..."
  }),
  'drill': (node) => ({
    id: `task_drill_${node.id}`,
    description: `Rapid fire practice for: ${node.title}`,
    context: "Focused practice session.",
    role: "Learner",
    outcome: "High accuracy and speed.",
    criteria: ["Accuracy", "Speed"],
    interculturalNote: "N/A",
    inputType: 'choice',
    inputPrompt: "Select the correct option:",
    choices: ["Option A: Correct Usage", "Option B: Incorrect Usage", "Option C: Near Miss"]
  })
};

/**
 * Generates an Action-Oriented Task based on a descriptor and template type.
 */
export function generateActionOrientedTask(node: CurriculumNode, type: 'functional' | 'mission' | 'drill' = 'functional'): ActionOrientedTask {
  const templateFn = TASK_TEMPLATES[type] || TASK_TEMPLATES['functional'];
  return templateFn(node);
}

/**
 * Determines the Next Best Action (Node) based on the Pedagogical Policy.
 */
export function getNextRecommendedNode(nodes: CurriculumNode[], policy: PedagogicalPolicy): CurriculumNode | null {
  // 1. Analyze Policy State
  const [knowledge, motivation, flow] = policy.stateVector;
  
  // 2. Determine Strategy
  let strategy = 'new';
  if (knowledge < 0.4) strategy = 'review'; // Low knowledge -> Review
  if (flow > 0.7 && knowledge > 0.7) strategy = 'challenge'; // High flow/knowledge -> Challenge
  
  // 3. Select Node based on Strategy
  
  if (strategy === 'review') {
    // Find nodes with high decay or low stability
    return nodes
      .filter(n => n.status === 'mastered' || n.status === 'available')
      .sort((a, b) => (b.neural?.traceDecay || 0) - (a.neural?.traceDecay || 0))
      [0] || null;
  }
  
  if (strategy === 'challenge') {
    // Find locked nodes that have prerequisites met (frontier nodes)
    // For simplicity, we just look for 'locked' nodes here, assuming graph traversal handles unlocking.
    // In a real graph, we'd check prerequisites.
    return nodes.find(n => n.status === 'locked') || null;
  }
  
  // Default: Present New (Available nodes)
  return nodes.find(n => n.status === 'available') || null;
}

/**
 * Generates a Self-Assessment (Portfolio) entry for a node.
 */
export function generateSelfAssessment(node: CurriculumNode): SelfAssessment {
  return {
    canDoStatement: `I can ${node.title.toLowerCase()} using appropriate language.`,
    rating: 1, // Default start
    reflectionPrompt: "What strategies did you use to overcome difficulties?"
  };
}

/**
 * Generates a full Scenario (Macro-Task) consisting of multiple linked tasks.
 */
// --- Scenario Templates Registry ---

const SCENARIO_TEMPLATES: Record<string, (level: CEFRLevel) => Scenario> = {
  'occupational': (level) => ({
    id: `scenario_occ_${level}`,
    title: 'Applying for a Job',
    domain: 'occupational',
    description: 'A sequence of tasks simulating a real-world job application.',
    sequencing: 'spiral',
    tasks: [
      {
        id: `task_occ_1_${level}`,
        description: 'Read a job advertisement and identify key requirements.',
        context: 'You are looking for a new job in your field.',
        role: 'Job Seeker',
        outcome: 'List 3 key requirements.',
        criteria: ['Reading Comprehension', 'Vocabulary Selection'],
        digitalMedium: 'forum',
        psychometrics: { difficultyIndex: 0.85, discriminationIndex: 0.3, exposureCount: 0 }
      },
      {
        id: `task_occ_2_${level}`,
        description: 'Write a formal email inquiry about the position.',
        context: 'You need clarification on the remote work policy.',
        role: 'Job Seeker',
        outcome: 'Send a polite, formal email.',
        criteria: ['Formal Register', 'Cohesion'],
        digitalMedium: 'email',
        psychometrics: { difficultyIndex: 0.4, discriminationIndex: 0.5, exposureCount: 0 },
        recommendedFeedback: 'recast',
        sociolinguistics: { register: 'formal', politenessMarkers: ['Indirect questions'] },
        metacognition: { planning: 'Identify key question', monitoring: 'Check tone', evaluating: 'Did I offend?', strategies: ['meta_planning'] }
      }
    ]
  }),
  'personal': (level) => ({
    id: `scenario_pers_${level}`,
    title: 'Daily Life Scenario',
    domain: 'personal',
    description: 'Managing personal tasks and social interactions.',
    sequencing: 'linear',
    tasks: [] // To be populated
  })
};

/**
 * Generates a full Scenario (Macro-Task) using the template registry.
 */
export function generateScenario(domain: Scenario['domain'], level: CEFRLevel): Scenario {
  const templateFn = SCENARIO_TEMPLATES[domain] || SCENARIO_TEMPLATES['personal'];
  return templateFn(level);
}

/**
 * Seeds the Curriculum Database with initial nodes.
 * This replaces the static tree builder.
 */
export function seedCurriculumDatabase(): CurriculumNode[] {
  return [
    {
      id: 'node_a1_1',
      title: 'Greetings & Introduction',
      level: 'A1',
      descriptor: 'Can follow speech which is very slow',
      type: 'function',
      status: 'available',
      prerequisites: []
    },
    {
      id: 'node_a1_2',
      title: 'Ordering Food (Mediation)',
      level: 'A1',
      descriptor: 'Can communicate in simple and routine tasks',
      type: 'mission',
      status: 'locked',
      prerequisites: ['node_a1_1']
    }
  ];
}

/**
 * @deprecated Use seedCurriculumDatabase instead.
 */
export function buildCurriculumTree(goal: string, currentLevel: CEFRLevel): CurriculumNode[] {
  return seedCurriculumDatabase();
}
