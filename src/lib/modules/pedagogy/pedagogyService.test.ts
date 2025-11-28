
import { describe, it, expect } from 'vitest';
import {
  getDescriptor,
  getPlurilingualStrategy,
  getCalibrationPrompt,
  buildCurriculumTree,
  type CEFRLevel
} from './pedagogyService';

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
      expect(result).toContain('Spanish');
      expect(result).toContain('Greek');
      expect(result).toContain('EXPLICITLY identify cognates');
    });
  });

  describe('getCalibrationPrompt', () => {
    it('should include calibration steps', () => {
      const result = getCalibrationPrompt('Spanish', 'Greek');
      expect(result).toContain('Certified CEFR Examiner');
      expect(result).toContain('Translate: \'Hello, how are you?\'');
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
});
