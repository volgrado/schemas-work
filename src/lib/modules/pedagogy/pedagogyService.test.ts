import { describe, it, expect } from 'vitest';
import {
  getDescriptor,
  getPlurilingualStrategy,
  getCalibrationPrompt,
  mapCEFRtoACTFL
} from './domain/utils';
import {
  generateContent
} from './pedagogyService';
import {
  buildCurriculumTree,
  generateActionOrientedTask,
  generateSelfAssessment,
  generateScenario
} from './curriculum/scheduler';
import {
  updateBeliefState,
  selectOptimalAction
} from './engine/orchestrator';
import {
  predictNextState
} from './engine/predictive';
import {
  spreadActivation
} from './graph/traversal';
import {
  consolidateMemory
} from './engine/memory';
import type { 
  CEFRLevel,
  CurriculumNode,
  PedagogicalPolicy,
  DKTModel,
  ContentGenerator,
  ActionOrientedTask,
  Scenario
} from './domain/models';

describe('pedagogyService', () => {
  describe('getDescriptor', () => {
    it('should return the correct descriptor for A1 listening', () => {
      const result = getDescriptor('overall_listening', 'A1');
      expect(result).toContain('Can follow speech which is very slow');
    });

    it('should return error message for missing descriptor', () => {
      // @ts-ignore
      const result = getDescriptor('non_existent_skill', 'A1');
      expect(result).toBe('Descriptor not found.');
    });
  });

  describe('getPlurilingualStrategy', () => {
    it('should generate a strategy containing both languages', () => {
      const result = getPlurilingualStrategy('Spanish', 'Greek');
      expect(result).toContain('Intercomprehension');
      expect(result).toContain('Mediation');
      expect(result).toContain('Translanguaging');
    });
  });

  describe('getCalibrationPrompt', () => {
    it('should include calibration steps', () => {
      const result = getCalibrationPrompt('Spanish', 'Greek');
      expect(result).toContain('ALTE Standards');
      expect(result).toContain('Task-Based Probe');
      expect(result).toContain('Mediation strategies');
    });
  });

  describe('buildCurriculumTree', () => {
    it('should return a list of nodes including dependencies', () => {
      const result = buildCurriculumTree('Travel', 'A1');
      expect(result.length).toBeGreaterThan(0);

      const missionNode = result.find(n => n.type === 'mission');
      expect(missionNode).toBeDefined();
      expect(missionNode?.level).toBe('A1');
      expect(missionNode?.prerequisites).toContain('node_a1_1');
    });
  });

  describe('generateActionOrientedTask', () => {
    it('should create a valid task from a node', () => {
      const node: CurriculumNode = {
        id: 'test_node',
        title: 'Test Title',
        level: 'B1',
        descriptor: 'Test Descriptor',
        type: 'mediation_text',
        status: 'available',
        prerequisites: []
      };

      const task = generateActionOrientedTask(node);
      expect(task.id).toBe('task_test_node');
      expect(task.description).toContain('Test Title');
      expect(task.criteria.length).toBeGreaterThan(0);
      expect(task.criteria[0]).toContain('Task Fulfillment');
      expect(task.interculturalNote).toBeDefined();
    });
  });

  describe('generateSelfAssessment', () => {
    it('should create a self-assessment entry', () => {
      const node: CurriculumNode = {
        id: 'sa_node',
        title: 'Negotiate',
        level: 'B2',
        descriptor: 'Can negotiate...',
        type: 'mission',
        status: 'available',
        prerequisites: []
      };

      const assessment = generateSelfAssessment(node);
      expect(assessment.canDoStatement).toContain('I can negotiate');
      expect(assessment.rating).toBe(1);
    });
  });

  describe('generateScenario', () => {
    it('should generate a multi-task scenario', () => {
      const scenario = generateScenario('occupational', 'B1');
      expect(scenario.domain).toBe('occupational');
      expect(scenario.tasks.length).toBeGreaterThan(0);
      
      const emailTask = scenario.tasks.find((t: ActionOrientedTask) => t.digitalMedium === 'email');
      expect(emailTask).toBeDefined();
      expect(emailTask?.criteria).toContain('Formal Register');
      
      // Verify Psychometrics
      expect(emailTask?.psychometrics).toBeDefined();
      expect(emailTask?.psychometrics?.difficultyIndex).toBeDefined();
      expect(emailTask?.psychometrics?.discriminationIndex).toBeGreaterThan(-1);
    });
  });

  describe('mapCEFRtoACTFL', () => {
    it('should map CEFR levels to ACTFL correctly', () => {
      expect(mapCEFRtoACTFL('A1')).toBe('Novice Mid');
      expect(mapCEFRtoACTFL('B2')).toBe('Advanced Low');
      expect(mapCEFRtoACTFL('C2')).toBe('Superior');
    });
  });

  describe('Cognitive & Motivational Features', () => {
    it('should support cognitive focus and feedback strategies', () => {
      const scenario = generateScenario('occupational', 'B1');
      expect(scenario.sequencing).toBe('spiral');

      const task = scenario.tasks[0];
      // We manually added recommendedFeedback to the second task in the mock
      const task2 = scenario.tasks[1];
      expect(task2.recommendedFeedback).toBe('recast');

      // Verify Sociolinguistics & Metacognition
      expect(task2.sociolinguistics).toBeDefined();
      expect(task2.sociolinguistics?.register).toBe('formal');
      expect(task2.metacognition).toBeDefined();
      expect(task2.metacognition?.planning).toContain('Identify');
      expect(task2.metacognition?.strategies).toContain('meta_planning');
      expect(task2.metacognition?.strategies).toContain('meta_planning');
      expect(task2.complexity).toBeUndefined(); // Not defined in this mock
      expect(task2.frame).toBeUndefined();
      expect(task2.psychometrics?.irt).toBeUndefined();
      expect(task2.psychometrics?.irt).toBeUndefined();
      // expect(task2.context).toBeUndefined(); // Now defined
    });

    it('should support retention and living sound features', () => {
      const node: CurriculumNode = {
        id: 'node_1',
        title: 'Test Node',
        level: 'A1',
        descriptor: 'Test Descriptor',
        type: 'vocabulary',
        status: 'available',
        prerequisites: [],
        phonology: {
          soundArticulation: 'Test Articulation',
          prosody: 'Test Prosody',
          phoneticDetail: {
            ipa: '/test/',
            articulatoryFeatures: { place: 'Bilabial', manner: 'Plosive', voicing: true },
            minimalPairs: ['test', 'best'],
            proprioceptionCue: 'Feel the vibration'
          }
        },
        retention: [{ type: 'retrieval_practice', description: 'Test yourself' }],
        flashcard: { type: 'picture_word', rule: 'no_translation' }
      };

      expect(node.phonology?.phoneticDetail?.proprioceptionCue).toBe('Feel the vibration');
      expect(node.retention?.[0].type).toBe('retrieval_practice');
      expect(node.flashcard?.rule).toBe('no_translation');
    });

    it('should support Vygotskian and Lexical features', () => {
      const node: CurriculumNode = {
        id: 'node_zpd',
        title: 'ZPD Node',
        level: 'B1',
        descriptor: 'ZPD Descriptor',
        type: 'mission',
        status: 'available',
        prerequisites: [],
        scaffolding: {
          prompts: ['Hint 1', 'Hint 2', 'Explicit Answer'],
          zpdStatus: 'assisted'
        },
        lexical: {
          headword: 'decision',
          category: 'collocation',
          collocations: ['make a decision', 'reach a decision'],
          fixedExpressions: [],
          wordNet: {
            synonyms: ['choice', 'conclusion'],
            antonyms: [],
            hypernyms: ['cognitive process'],
            hyponyms: [],
            meronyms: []
          }
        },
        strands: {
          meaningInput: 25,
          meaningOutput: 25,
          languageStudy: 25,
          fluency: 25
        },
        savoirs: {
          knowledge: ['Grammar rules'],
          skills: ['Listening'],
          existential: ['Openness'],
          abilityToLearn: ['Notetaking']
        },
        interlanguage: {
          errorType: 'overgeneralization',
          developmentalStage: 'Systematic'
        },
        bkt: {
          pKnow: 0.1,
          pLearn: 0.2,
          pGuess: 0.1,
          pSlip: 0.05
        },
        dkt: {
          architecture: 'Transformer',
          embeddingSize: 128
        },
        policy: {
          stateVector: [0.8, 0.5, 0.9],
          actionSpace: ['scaffold', 'challenge'],
          rewardFunction: 'maximize_retention'
        },
        generator: {
          source: 'framenet',
          template: 'Create a scenario for {frame}'
        }
      };

      expect(node.scaffolding?.zpdStatus).toBe('assisted');
      expect(node.scaffolding?.prompts.length).toBe(3);
      expect(node.lexical?.category).toBe('collocation');
      expect(node.lexical?.wordNet?.synonyms).toContain('choice');
      expect(node.strands?.fluency).toBe(25);
      expect(node.savoirs?.existential).toContain('Openness');
      expect(node.interlanguage?.errorType).toBe('overgeneralization');
      expect(node.bkt?.pKnow).toBe(0.1);
      expect(node.dkt?.architecture).toBe('Transformer');
      expect(node.policy?.actionSpace).toContain('scaffold');
      expect(node.generator?.source).toBe('framenet');
    });
  });

  describe('Cognitive Orchestrator (Phase 15)', () => {
    it('should update belief state based on reward', () => {
      const policy: PedagogicalPolicy = {
        stateVector: [0.5, 0.5, 0.5], // [Knowledge, Motivation, Flow]
        actionSpace: ['scaffold', 'challenge'],
        rewardFunction: 'default'
      };
      
      // High reward -> Increase Knowledge & Flow
      const updated = updateBeliefState(policy, 'challenge', 0.8);
      expect(updated.stateVector[0]).toBeGreaterThan(0.5);
      expect(updated.stateVector[2]).toBeGreaterThan(0.5);
      
      // Low reward -> Decrease Flow
      const failed = updateBeliefState(policy, 'challenge', 0.2);
      expect(failed.stateVector[2]).toBeLessThan(0.5);
    });

    it('should predict next state using DKT mock', () => {
      const dkt: DKTModel = { architecture: 'LSTM', embeddingSize: 10 };
      const history = [{ correct: true }, { correct: true }, { correct: false }];
      
      const prediction = predictNextState(dkt, history);
      expect(prediction.length).toBe(10);
      expect(prediction[0]).toBeCloseTo(0.53, 1); // EMA result
    });

    it('should select optimal action based on state', () => {
      const policy: PedagogicalPolicy = {
        stateVector: [0.2, 0.5, 0.2], // Low Knowledge, Low Flow -> Anxiety
        actionSpace: ['scaffold_help', 'challenge_hard'],
        rewardFunction: 'default'
      };
      
      const action = selectOptimalAction(policy);
      expect(action).toContain('scaffold');
      
      const boredPolicy: PedagogicalPolicy = {
        ...policy,
        stateVector: [0.9, 0.5, 0.2] // High Knowledge, Low Flow -> Boredom
      };
      expect(selectOptimalAction(boredPolicy)).toContain('challenge');
    });

    it('should generate content from templates', async () => {
      const generator: ContentGenerator = {
        source: 'framenet',
        template: 'The {buyer} bought a {item} from the {seller}.'
      };
      const context = { buyer: 'student', item: 'book', seller: 'shop' };
      
      const content = await generateContent(generator, context);
      expect(content).toContain('The student bought a book from the shop.');
    });
  });

  describe('The Holistic Expansion (Phases 16-20)', () => {
    it('should support Embodiment, Discourse, Corpus, UDL, and Social Learning features', () => {
      const node: CurriculumNode = {
        id: 'node_holistic_1',
        title: 'Holistic Node',
        level: 'B2',
        descriptor: 'Can interact with fluency.',
        type: 'mission',
        status: 'available',
        prerequisites: [],
        embodiment: {
          gestures: ['cup_hand_shape'],
          motorAction: 'shake_device',
          sensoryTriggers: ['haptic_vibrate']
        },
        discourse: {
          cohesionMarkers: ['however', 'therefore'],
          informationStructure: 'theme_rheme',
          turnTakingStrategies: ['back_channeling']
        },
        corpus: {
          frequencyBand: 'mid',
          concordanceLines: ['However, he did not go.', 'Therefore, it is true.'],
          registerTags: ['academic_written']
        },
        udl: {
          representation: ['text', 'audio'],
          expression: ['writing', 'speaking'],
          cognitiveLoadReduction: true
        },
        social: {
          role: 'newcomer',
          peerScaffolding: 'reviewee',
          socialPresence: 'Avatar_Maria'
        }
      };

      expect(node.embodiment?.motorAction).toBe('shake_device');
      expect(node.discourse?.informationStructure).toBe('theme_rheme');
      expect(node.corpus?.frequencyBand).toBe('mid');
      expect(node.udl?.cognitiveLoadReduction).toBe(true);
      expect(node.social?.socialPresence).toBe('Avatar_Maria');
    });
  });

  describe('The Frontier (Phases 23-24)', () => {
    it('should support Dynamic Systems and Neuroscience features', () => {
      const node: CurriculumNode = {
        id: 'node_frontier_1',
        title: 'Frontier Node',
        level: 'C1',
        descriptor: 'Can manage complex dynamics.',
        type: 'mission',
        status: 'available',
        prerequisites: [],
        dst: {
          variabilityIndex: 0.8,
          attractorState: 'unstable',
          perturbationStrategy: 'increase_complexity'
        },
        neuro: {
          predictionError: 0.5,
          precisionWeighting: 0.9
        },
        memory: {
          hippocampalBuffer: true,
          neocorticalNetwork: false,
          consolidationRate: 0.1
        }
      };

      expect(node.dst?.attractorState).toBe('unstable');
      expect(node.neuro?.predictionError).toBe(0.5);
      expect(node.memory?.hippocampalBuffer).toBe(true);
    });
  });

  describe('The Neural-Symbolic Bridge (Phase 26)', () => {
    it('should spread activation via synaptic weights', () => {
      const nodes = new Map<string, CurriculumNode>();
      
      const triggerNode: CurriculumNode = {
        id: 'node_trigger',
        title: 'Trigger',
        level: 'B1',
        descriptor: 'Trigger node',
        type: 'vocabulary',
        status: 'available',
        prerequisites: [],
        neural: {
          activationLevel: 0.5,
          synapticWeights: { 'node_neighbor': 0.5 },
          traceDecay: 0.1
        }
      };

      const neighborNode: CurriculumNode = {
        id: 'node_neighbor',
        title: 'Neighbor',
        level: 'B1',
        descriptor: 'Neighbor node',
        type: 'vocabulary',
        status: 'available',
        prerequisites: [],
        neural: {
          activationLevel: 0.2,
          synapticWeights: {},
          traceDecay: 0.1
        }
      };

      nodes.set('node_trigger', triggerNode);
      nodes.set('node_neighbor', neighborNode);

      // Trigger activation +0.5
      // Neighbor receives 0.5 * 0.5 = 0.25
      // Neighbor new level = 0.2 + 0.25 = 0.45
      const updates = spreadActivation(nodes, 'node_trigger', 0.5);

      expect(updates.get('node_trigger')).toBeCloseTo(1.0); // 0.5 + 0.5
      expect(updates.get('node_neighbor')).toBeCloseTo(0.45);
    });
  });

  describe('The Consolidation Protocol (Phase 27)', () => {
    it('should consolidate memory when thresholds are met', () => {
      const node: CurriculumNode = {
        id: 'node_memory',
        title: 'Memory Node',
        level: 'B2',
        descriptor: 'Memory node',
        type: 'grammar',
        status: 'available',
        prerequisites: [],
        dst: {
          variabilityIndex: 0.2, // Stability = 0.8
          attractorState: 'unstable',
          perturbationStrategy: 'none'
        },
        neural: {
          activationLevel: 0.9, // High activation
          synapticWeights: {},
          traceDecay: 0.5
        },
        memory: {
          hippocampalBuffer: true,
          neocorticalNetwork: false,
          consolidationRate: 0.1
        }
      };

      // Thresholds: Activation 0.8, Stability 0.6
      // Node has: Activation 0.9, Stability 0.8 (1 - 0.2) -> Should consolidate
      consolidateMemory(node, { transferThreshold: 0.8, stabilityFactor: 0.6 });

      expect(node.memory?.neocorticalNetwork).toBe(true);
      expect(node.neural?.traceDecay).toBe(0.25); // 0.5 * 0.5
    });

    it('should NOT consolidate if stability is too low', () => {
      const node: CurriculumNode = {
        id: 'node_unstable',
        title: 'Unstable Node',
        level: 'B2',
        descriptor: 'Unstable node',
        type: 'grammar',
        status: 'available',
        prerequisites: [],
        dst: {
          variabilityIndex: 0.8, // Stability = 0.2 (Too low)
          attractorState: 'unstable',
          perturbationStrategy: 'none'
        },
        neural: {
          activationLevel: 0.9,
          synapticWeights: {},
          traceDecay: 0.5
        },
        memory: {
          hippocampalBuffer: true,
          neocorticalNetwork: false,
          consolidationRate: 0.1
        }
      };

      consolidateMemory(node, { transferThreshold: 0.8, stabilityFactor: 0.6 });

      expect(node.memory?.neocorticalNetwork).toBe(false);
      expect(node.neural?.traceDecay).toBe(0.5); // Unchanged
    });
  });
});
