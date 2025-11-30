
import { describe, it, expect } from 'vitest';
import { getNextRecommendedNode, generateActionOrientedTask } from '../curriculum/scheduler';
import type { CurriculumNode, PedagogicalPolicy } from '../domain/models';

describe('Scheduler & Sequencing', () => {
  const nodes: CurriculumNode[] = [
    { id: 'n1', title: 'Node 1', level: 'A1', type: 'function', status: 'mastered', neural: { traceDecay: 0.9 } } as any,
    { id: 'n2', title: 'Node 2', level: 'A1', type: 'function', status: 'available', neural: { traceDecay: 0.1 } } as any,
    { id: 'n3', title: 'Node 3', level: 'A1', type: 'function', status: 'locked' } as any,
  ];

  it('should recommend Review when knowledge is low', () => {
    const policy: PedagogicalPolicy = {
      stateVector: [0.2, 0.5, 0.5], // Low Knowledge
      actionSpace: [],
      rewardFunction: 'default'
    };
    
    const next = getNextRecommendedNode(nodes, policy);
    expect(next?.id).toBe('n1'); // Should pick high decay node
  });

  it('should recommend Challenge when flow and knowledge are high', () => {
    const policy: PedagogicalPolicy = {
      stateVector: [0.8, 0.8, 0.8], // High Flow & Knowledge
      actionSpace: [],
      rewardFunction: 'default'
    };
    
    const next = getNextRecommendedNode(nodes, policy);
    expect(next?.id).toBe('n3'); // Should pick locked node
  });

  it('should recommend New Content by default', () => {
    const policy: PedagogicalPolicy = {
      stateVector: [0.5, 0.5, 0.5], // Neutral
      actionSpace: [],
      rewardFunction: 'default'
    };
    
    const next = getNextRecommendedNode(nodes, policy);
    expect(next?.id).toBe('n2'); // Should pick available node
  });

  it('should generate diverse tasks based on templates', () => {
    const node = nodes[0];
    const taskFunc = generateActionOrientedTask(node, 'functional');
    const taskMiss = generateActionOrientedTask(node, 'mission');
    
    expect(taskFunc.description).toContain('Roleplay');
    expect(taskMiss.description).toContain('Complete the mission');
  });
});
