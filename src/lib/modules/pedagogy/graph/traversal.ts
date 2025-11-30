
/**
 * Graph Traversal Logic
 * Implements Activation Spreading and Priming.
 */

import type { CurriculumNode } from '../domain/models';
import { isNeuralNode } from './schema';

/**
 * Propagates activation from a trigger node to its neighbors via Hebbian weights.
 * @param nodes The entire graph (Map of ID -> Node)
 * @param triggerNodeId The ID of the node being activated
 * @param initialActivation The strength of the activation signal (0.0 - 1.0)
 * @returns A Map of Node IDs to their NEW activation levels (only for updated nodes)
 */
export function spreadActivation(
  nodes: Map<string, CurriculumNode>,
  triggerNodeId: string,
  initialActivation: number
): Map<string, number> {
  const updates = new Map<string, number>();
  const trigger = nodes.get(triggerNodeId);

  if (!trigger || !isNeuralNode(trigger)) return updates;

  // 1. Activate the trigger node itself
  // New Level = Current + Input (Clamped at 1.0)
  const newTriggerLevel = Math.min(1.0, (trigger.neural.activationLevel || 0) + initialActivation);
  updates.set(triggerNodeId, newTriggerLevel);

  // 2. Spread to neighbors
  for (const [neighborId, weight] of Object.entries(trigger.neural.synapticWeights)) {
    const neighbor = nodes.get(neighborId);
    
    if (neighbor && isNeuralNode(neighbor)) {
      const currentLevel = neighbor.neural.activationLevel || 0;
      const inputSignal = initialActivation * weight;
      
      const newNeighborLevel = Math.min(1.0, currentLevel + inputSignal);
      updates.set(neighborId, newNeighborLevel);
    }
  }

  return updates;
}
