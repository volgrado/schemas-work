
/**
 * Integration Test: The Full Learning Loop
 * Verifies the interaction between Graph, Engine, and Memory modules.
 */

import { describe, it, expect } from 'vitest';
import { spreadActivation } from '../graph/traversal';
import { predictNextState } from '../engine/predictive';
import { selectOptimalAction, updateBeliefState } from '../engine/orchestrator';
import { consolidateMemory } from '../engine/memory';
import type { CurriculumNode, PedagogicalPolicy, DKTModel } from '../domain/models';

describe('The Full Learning Loop', () => {
  it('should execute a complete learning cycle', () => {
    // 1. SETUP: Initialize a small graph
    const nodes = new Map<string, CurriculumNode>();
    
    const nodeA: CurriculumNode = {
      id: 'node_A',
      title: 'Greetings',
      level: 'A1',
      descriptor: 'Can say hello',
      type: 'function',
      status: 'available',
      prerequisites: [],
      neural: {
        activationLevel: 0.0,
        synapticWeights: { 'node_B': 0.5 },
        traceDecay: 0.1
      },
      dst: {
        variabilityIndex: 0.1, // High stability (0.9)
        attractorState: 'stable',
        perturbationStrategy: 'none'
      },
      memory: {
        hippocampalBuffer: true,
        neocorticalNetwork: false,
        consolidationRate: 0.1
      }
    };

    const nodeB: CurriculumNode = {
      id: 'node_B',
      title: 'Introductions',
      level: 'A1',
      descriptor: 'Can introduce self',
      type: 'function',
      status: 'locked',
      prerequisites: ['node_A'],
      neural: {
        activationLevel: 0.0,
        synapticWeights: {},
        traceDecay: 0.1
      }
    };

    nodes.set(nodeA.id, nodeA);
    nodes.set(nodeB.id, nodeB);

    // 2. PRIMING: Trigger activation on Node A
    // Simulate user focusing on "Greetings"
    const updates = spreadActivation(nodes, 'node_A', 1.0);
    
    // Verify Node A is active
    expect(updates.get('node_A')).toBe(1.0);
    // Verify Node B is primed (0.5 weight * 1.0 input = 0.5)
    expect(updates.get('node_B')).toBe(0.5);

    // Update node state with new activation
    if (nodeA.neural) nodeA.neural.activationLevel = updates.get('node_A') || 0;

    // 3. PREDICTION: Estimate mastery
    const dkt: DKTModel = { architecture: 'LSTM', embeddingSize: 1 };
    const history = [{ correct: true }, { correct: true }]; // Strong history
    const prediction = predictNextState(dkt, history);
    
    // Expect high probability of mastery
    expect(prediction[0]).toBeGreaterThan(0.6);

    // 4. ACTION SELECTION: Decide what to do
    let policy: PedagogicalPolicy = {
      stateVector: [0.8, 0.8, 0.8], // High Knowledge, Motivation, Flow
      actionSpace: ['present_new', 'review', 'challenge'],
      rewardFunction: 'default'
    };

    const action = selectOptimalAction(policy);
    // High flow + high knowledge -> Challenge or Present New
    expect(['present_new', 'challenge']).toContain(action);

    // 5. INTERACTION & UPDATE: User succeeds
    // Simulate a successful interaction (Reward = 1.0)
    policy = updateBeliefState(policy, action, 1.0);
    
    // Motivation should increase or stay high
    expect(policy.stateVector[1]).toBeGreaterThan(0.8);

    // 6. CONSOLIDATION: Check for long-term memory transfer
    // Node A has High Activation (1.0) and High Stability (0.9)
    // Thresholds: Activation 0.8, Stability 0.6
    consolidateMemory(nodeA, { transferThreshold: 0.8, stabilityFactor: 0.6 });

    // Should have transferred to Neocortex
    expect(nodeA.memory?.neocorticalNetwork).toBe(true);
    // Trace decay should have slowed down (0.1 * 0.5 = 0.05)
    expect(nodeA.neural?.traceDecay).toBe(0.05);
  });
});
