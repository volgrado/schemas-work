
/**
 * Neural Graph Schema
 * Defines the structure of the Neural-Symbolic Graph.
 */

import type { CurriculumNode } from '../domain/models';

export interface NeuralGraphNode extends CurriculumNode {
  // This interface explicitly enforces the presence of neural properties
  // for nodes that are part of the active graph.
  neural: {
    activationLevel: number;
    synapticWeights: Record<string, number>;
    traceDecay: number;
    semanticEmbedding?: number[];
  };
}

export function isNeuralNode(node: CurriculumNode): node is NeuralGraphNode {
  return !!node.neural;
}
