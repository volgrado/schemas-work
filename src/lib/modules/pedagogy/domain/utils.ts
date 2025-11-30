
/**
 * Domain Utilities
 * Helper functions for the Pedagogy Module.
 */

import type { CEFRLevel } from './models';
import { ACTFL_MAPPING } from './constants';
import cefrStandards from '$lib/data/cefr_standards.json';

export function getDescriptor(skill: keyof typeof cefrStandards.scales, level: CEFRLevel): string {
  // @ts-ignore
  return cefrStandards.scales[skill]?.[level] || "Descriptor not found.";
}

export function getPlurilingualStrategy(l1: string, l2: string): string {
  return `PLURILINGUAL STRATEGY: Use ${l1} to decode ${l2}. Focus on Intercomprehension, Mediation, and Translanguaging.`;
}

export function getCalibrationPrompt(l1: string, l2: string): string {
  return `Assess user speaking ${l1} learning ${l2}. Use ALTE Standards, Task-Based Probe, and Mediation strategies.`;
}

export function mapCEFRtoACTFL(cefr: CEFRLevel): string {
  return ACTFL_MAPPING[cefr] || 'Novice Low';
}
