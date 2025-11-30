
/**
 * Domain Models for the Pedagogy Module
 * Pure TypeScript definitions with no external dependencies.
 */

// --- Core Types ---

export type CEFRLevel = 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ACTFLLevel = 'Novice Low' | 'Novice Mid' | 'Novice High' | 'Intermediate Low' | 'Intermediate Mid' | 'Intermediate High' | 'Advanced Low' | 'Advanced Mid' | 'Advanced High' | 'Superior' | 'Distinguished';

// --- Curriculum Node (The Atom) ---

export interface CurriculumNode {
  id: string;
  title: string;
  level: CEFRLevel;
  descriptor: string;
  type: NodeType;
  status: NodeStatus;
  prerequisites: string[];
  
  // --- Modules (Optional Components) ---
  task?: ActionOrientedTask;
  phonology?: PhonologicalFocus;
  cognitive?: CognitiveFocus;
  retention?: RetentionStrategy[];
  flashcard?: FlashcardDesign;
  lexical?: LexicalChunk;
  scaffolding?: Scaffolding;
  strands?: StrandDistribution;
  savoirs?: Savoirs;
  interlanguage?: InterlanguageAnalysis;
  
  // --- Engine Components ---
  bkt?: BKTParams;
  dkt?: DKTModel;
  policy?: PedagogicalPolicy;
  generator?: ContentGenerator;
  
  // --- Advanced Modules (Phases 16-27) ---
  embodiment?: EmbodimentFocus;
  discourse?: DiscourseStructure;
  corpus?: CorpusData;
  udl?: UniversalDesignProfile;
  social?: SocialContext;
  dst?: DynamicSystemParams;
  neuro?: PredictiveProcessing;
  memory?: MemoryArchitecture;
  neural?: NeuralProperties; // The Bridge
}

export type NodeType = 
  | 'grammar' | 'vocabulary' | 'function' | 'mission' 
  | 'mediation_text' | 'mediation_concepts' | 'mediation_communication' 
  | 'pluricultural' | 'online_conversation' | 'online_transaction' | 'online_collaboration';

export type NodeStatus = 'locked' | 'available' | 'mastered';

// --- Sub-Interfaces ---

export interface NeuralProperties {
  activationLevel: number; // 0.0 - 1.0 (Working Memory)
  synapticWeights: Record<string, number>; // Hebbian connection strength
  traceDecay: number; // 0.0 - 1.0 (Forgetting curve factor)
  semanticEmbedding?: number[]; // Vector for similarity search
}

export interface MemoryArchitecture {
  hippocampalBuffer: boolean;
  neocorticalNetwork: boolean;
  consolidationRate: number;
}

export interface PredictiveProcessing {
  predictionError: number;
  precisionWeighting: number;
}

export interface DynamicSystemParams {
  variabilityIndex: number;
  attractorState: 'stable' | 'unstable' | 'fossilized';
  perturbationStrategy: string;
}

// ... (Other interfaces moved from pedagogyService.ts)

export interface ActionOrientedTask {
  id: string;
  description: string;
  context: string;
  role: string;
  outcome: string;
  criteria: string[];
  interculturalNote?: string;
  digitalMedium?: 'chat' | 'video_call' | 'forum' | 'email' | 'collab_doc';
  psychometrics?: PsychometricData;
  actflRating?: ACTFLLevel;
  recommendedFeedback?: FeedbackStyle;
  sociolinguistics?: SociolinguisticFocus;
  metacognition?: Metacognition;
  complexity?: ComplexityMatrix;

  frame?: FrameSemantics;
  
  // --- Interaction Fields ---
  inputType?: 'text' | 'choice' | 'voice' | 'none';
  inputPrompt?: string; // e.g., "Type your response here..."
  validationRegex?: string; // Simple client-side validation
  choices?: string[]; // For multiple choice
  
  // --- Lesson Content (Assimil Style) ---
  lessonContent?: LessonContent;
}

export interface LessonContent {
  dialogue: DialogueLine[];
  phonetics: PhoneticGuide[];
  vocabulary: VocabularyItem[];
  grammar: GrammarNote[];
  footnotes: Footnote[];
  exercises: Exercise[];
}

export interface Footnote {
  id: number;
  word: string; // The word/phrase being annotated
  note: string; // The explanation
}

export interface PhoneticGuide {
  sound: string;
  ipa: string;
  description: string;
  audio?: string; // URL or ID for individual sound
}

export interface DialogueLine {
  speaker: string;
  target: string;
  native: string;
  audio?: string;
  voiceId?: string; // Suggested voice type/gender or specific ID
  timing?: { start: number; end: number }[]; // For karaoke
}

export interface VocabularyItem {
  term: string;
  definition: string;
  context: string;
}

export interface GrammarNote {
  rule: string;
  explanation: string;
  examples: string[];
}

export interface Exercise {
  id: string;
export interface Exercise {
  id: string;
  type: 'translation' | 'fill_blank' | 'matching' | 'reorder' | 'choice' | 'cloze';
  prompt: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
}

export type FeedbackStyle = 'recast' | 'prompt' | 'explicit_correction' | 'metalinguistic_clue';

export interface PsychometricData {
  difficultyIndex: number;
  discriminationIndex: number;
  exposureCount: number;
  irt?: IRTParams;
}

export interface IRTParams {
  a: number;
  b: number;
  c: number;
  theta?: number;
}

export interface SociolinguisticFocus {
  register: Register;
  politenessMarkers: string[];
}

export type Register = 'frozen' | 'formal' | 'consultative' | 'casual' | 'intimate';

export interface Metacognition {
  planning: string;
  monitoring: string;
  evaluating: string;
  strategies: StrategyType[];
}

export type StrategyType = 
  | 'cognitive_grouping' | 'cognitive_imagery' | 'cognitive_deduction' 
  | 'meta_planning' | 'meta_monitoring' | 'meta_evaluation'
  | 'social_cooperation' | 'social_questioning' | 'affective_selftalk';

export interface ComplexityMatrix {
  resourceDirecting: string[];
  resourceDispersing: string[];
}

export interface FrameSemantics {
  frameName: string;
  coreElements: Record<string, string>;
}

export interface PhonologicalFocus {
  soundArticulation: string;
  prosody: string;
  phoneticDetail?: PhoneticDetail;
}

export interface PhoneticDetail {
  ipa: string;
  articulatoryFeatures: { place: string; manner: string; voicing: boolean };
  minimalPairs: string[];
  proprioceptionCue?: string;
  chartPosition?: { row: number; col: number };
}

export interface CognitiveFocus {
  domain: 'morphology' | 'syntax' | 'phonology' | 'pragmatics' | 'discourse';
  noticingTarget: string;
  explicitRule?: string;
  processabilityStage: number;
}

export interface RetentionStrategy {
  type: 'retrieval_practice' | 'interleaving' | 'elaboration' | 'generation' | 'reflection';
  description: string;
}

export interface FlashcardDesign {
  type: 'picture_word' | 'sentence_blank' | 'minimal_pair_test';
  rule: 'no_translation' | 'target_language_only';
}

export interface LexicalChunk {
  headword: string;
  category: 'polyword' | 'collocation' | 'institutionalized' | 'frame';
  collocations: string[];
  fixedExpressions: string[];
  wordNet?: WordNetRelations;
}

export interface WordNetRelations {
  synonyms: string[];
  antonyms: string[];
  hypernyms: string[];
  hyponyms: string[];
  meronyms: string[];
}

export interface Scaffolding {
  prompts: string[];
  zpdStatus: 'independent' | 'assisted' | 'frustration';
  mleParameter?: 'intentionality' | 'transcendence' | 'meaning';
}

export interface StrandDistribution {
  meaningInput: number;
  meaningOutput: number;
  languageStudy: number;
  fluency: number;
}

export interface Savoirs {
  knowledge: string[];
  skills: string[];
  existential: string[];
  abilityToLearn: string[];
}

export interface InterlanguageAnalysis {
  errorType: 'overgeneralization' | 'transfer' | 'simplification' | 'avoidance';
  developmentalStage: string;
}

export interface BKTParams {
  pKnow: number;
  pLearn: number;
  pGuess: number;
  pSlip: number;
}

export interface DKTModel {
  architecture: 'LSTM' | 'Transformer';
  embeddingSize: number;
  hiddenState?: number[];
}

export interface PedagogicalPolicy {
  stateVector: number[];
  actionSpace: string[];
  rewardFunction: string;
}

export interface ContentGenerator {
  source: 'framenet' | 'wordnet' | 'gpt';
  template: string;
  parameters?: Record<string, any>;
}

export interface EmbodimentFocus {
  gestures: string[];
  motorAction: string;
  sensoryTriggers: string[];
}

export interface DiscourseStructure {
  cohesionMarkers: string[];
  informationStructure: 'theme_rheme' | 'given_new';
  turnTakingStrategies: string[];
}

export interface CorpusData {
  frequencyBand: 'high' | 'mid' | 'low';
  concordanceLines: string[];
  registerTags: string[];
}

export interface UniversalDesignProfile {
  representation: ('text' | 'audio' | 'visual' | 'tactile')[];
  expression: ('writing' | 'speaking' | 'selecting' | 'drawing')[];
  cognitiveLoadReduction: boolean;
}

export interface SocialContext {
  role: 'newcomer' | 'old_timer' | 'expert';
  peerScaffolding: 'reviewer' | 'reviewee' | 'collaborator';
  socialPresence: string;
}

export interface ConsolidationParams {
  transferThreshold: number; // Activation level required (e.g., 0.8)
  stabilityFactor: number; // Required stability (1.0 - variability) (e.g., 0.6)
}

export interface Scenario {
  id: string;
  title: string;
  domain: 'personal' | 'public' | 'occupational' | 'educational';
  description: string;
  tasks: ActionOrientedTask[]; // A sequence of tasks forming a storyline
  needsAnalysis?: NeedsAnalysis; // Nation's Lacks/Wants/Necessities
  environment?: EnvironmentAnalysis; // Richards' Context
  sequencing?: SequencingModel; // Nation's Sequencing
  strands?: StrandDistribution; // Nation's Four Strands
}

export interface NeedsAnalysis {
  lacks: string[]; // What the learner doesn't know yet (Gaps)
  wants: string[]; // What the learner *wants* to learn (Subjective)
  necessities: string[]; // What the learner *needs* to know (External demands)
}

export interface EnvironmentAnalysis {
  timeAvailable: number; // Hours per week
  resources: string[]; // e.g., "Native speaker friend", "Netflix", "Textbook"
  constraints: string[]; // e.g., "No internet access at home"
}

export type SequencingModel = 'linear' | 'spiral' | 'modular' | 'matrix';

export interface SelfAssessment {
  canDoStatement: string;
  rating: number;
  reflectionPrompt: string;
}
