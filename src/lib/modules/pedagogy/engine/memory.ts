
/**
 * Memory Architecture
 * Implements the Dual-Store Memory Model and Consolidation Protocol.
 */

import type { CurriculumNode, ConsolidationParams } from '../domain/models';
import { CONSOLIDATION_THRESHOLDS } from '../domain/constants';

/**
 * Manages the "Hand-off" from Hippocampal Buffer to Neocortical Network.
 * 
 * @param node The node to check for consolidation.
 * @param params Optional overrides for consolidation thresholds.
 */
export function consolidateMemory(
  node: CurriculumNode, 
  params: ConsolidationParams = {
    transferThreshold: CONSOLIDATION_THRESHOLDS.TRANSFER_ACTIVATION,
    stabilityFactor: CONSOLIDATION_THRESHOLDS.STABILITY_FACTOR
  }
): void {
  if (!node.neural || !node.dst || !node.memory) return;

  // Stability is the inverse of variability (Dynamic Systems Theory)
  // High variability = Unstable (Fossilization risk or pre-systematic)
  const stability = 1.0 - node.dst.variabilityIndex;

  // Check if thresholds are met for transfer
  // 1. Activation must be high (Strong trace)
  // 2. Stability must be high (Low variance/noise)
  if (node.neural.activationLevel >= params.transferThreshold && stability >= params.stabilityFactor) {
    
    // Transfer to Neocortex (Long-term Semantic Store)
    node.memory.neocorticalNetwork = true;
    
    // Slow down decay (Neocortical traces are more stable than Hippocampal ones)
    // We apply a decay factor to the decay rate itself.
    node.neural.traceDecay = Math.max(0.01, node.neural.traceDecay * CONSOLIDATION_THRESHOLDS.NEOCORTICAL_DECAY_RATE);
    
    // Note: We don't immediately clear hippocampalBuffer; 
    // it fades naturally or via sleep replay logic (Interleaved Review).
  }
}
