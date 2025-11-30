
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedCurriculumDatabase, getNextRecommendedNode, generateActionOrientedTask } from '../pedagogyService';
import { DexiePersistenceAdapter } from '../services/persistence';

// Mock Persistence Adapter
vi.mock('../services/persistence', () => {
  return {
    DexiePersistenceAdapter: class {
      getAllNodes() { return Promise.resolve([]); }
      saveNodes() { return Promise.resolve(); }
      saveNode() { return Promise.resolve(); }
    }
  };
});

describe('UI Integration Logic', () => {
  let db: DexiePersistenceAdapter;

  beforeEach(() => {
    db = new DexiePersistenceAdapter();
  });

  it('should seed database if empty', async () => {
    const nodes = await db.getAllNodes();
    if (nodes.length === 0) {
      const seed = seedCurriculumDatabase();
      expect(seed.length).toBeGreaterThan(0);
    }
  });

  it('should recommend a node and generate a task', () => {
    const nodes = seedCurriculumDatabase();
    const policy = { stateVector: [0.5, 0.5, 0.5], actionSpace: [], rewardFunction: 'default' };
    
    const nextNode = getNextRecommendedNode(nodes, policy);
    expect(nextNode).toBeDefined();
    
    if (nextNode) {
      const task = generateActionOrientedTask(nextNode, 'functional');
      expect(task.description).toBeDefined();
    }
  });
});
