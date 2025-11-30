/**
 * Pedagogy Service (Legacy Facade)
 * 
 * This file now serves as a facade, re-exporting types and functions from the 
 * modular architecture in `src/lib/modules/pedagogy/`.
 * 
 * @deprecated Use imports from specific sub-modules (domain, engine, graph) instead.
 */

export * from './domain/models';
export * from './domain/constants';
export * from './graph/traversal';
export * from './domain/utils';
export * from './engine/orchestrator';
export * from './engine/memory';
export * from './engine/predictive';

// Re-export scheduler functions
export { 
  generateActionOrientedTask, 
  generateSelfAssessment, 
  generateScenario, 
  seedCurriculumDatabase, 
  buildCurriculumTree,
  getNextRecommendedNode
} from './curriculum/scheduler';

export { AiCurriculumGenerator } from './curriculum/aiCurriculumGenerator';

import { HybridAIService } from './services/ai-connector';
import type { ContentGenerator } from './domain/models';

export async function generateContent(generator: ContentGenerator, context: any): Promise<string> {
  const service = new HybridAIService();
  return service.generateContent(generator, context);
}

export { pedagogyController } from './ui/PedagogyController.svelte';
