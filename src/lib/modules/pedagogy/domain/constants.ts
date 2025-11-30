
/**
 * Domain Constants for the Pedagogy Module
 */

import type { CEFRLevel, ACTFLLevel } from './models';

export const CEFR_LEVELS: CEFRLevel[] = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const ACTFL_MAPPING: Record<CEFRLevel, ACTFLLevel> = {
  'Pre-A1': 'Novice Low',
  'A1': 'Novice Mid',
  'A2': 'Intermediate Low',
  'B1': 'Intermediate Mid',
  'B2': 'Advanced Low',
  'C1': 'Advanced Mid',
  'C2': 'Superior'
};

export const CONSOLIDATION_THRESHOLDS = {
  TRANSFER_ACTIVATION: 0.8, // Minimum activation for transfer
  STABILITY_FACTOR: 0.6,    // Minimum stability (1 - variability)
  NEOCORTICAL_DECAY_RATE: 0.5 // Multiplier for decay in Neocortex
};

export const POMDP_CONSTANTS = {
  REWARD_THRESHOLD_HIGH: 0.7,
  REWARD_THRESHOLD_LOW: 0.3,
  FLOW_STATE_INDEX: 2,
  KNOWLEDGE_STATE_INDEX: 0
};
