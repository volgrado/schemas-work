import { describe, it, expect } from 'vitest';
import * as prompts from './prompts';
import type { SRS } from '$lib/types';

describe('prompts', () => {
  describe('getCreateSchemaPrompt', () => {
    it('should generate a prompt containing the raw text', () => {
      const rawText = 'This is some unstructured text about physics.';
      const prompt = prompts.getCreateSchemaPrompt({}, rawText);

      expect(prompt).toContain('**ROLE AND OBJECTIVE:**');
      expect(prompt).toContain(rawText);
      expect(prompt).toContain('Tiptap JSON document');
    });
  });

  describe('getExpandNodePrompt', () => {
    it('should incorporate settings and context into the prompt', () => {
      const settings = { quantity: 3, tone: 'academic', depth: 'detailed' };
      const nodeText = 'Quantum Entanglement';
      const breadcrumb = 'Physics / Quantum Mechanics';

      const prompt = prompts.getExpandNodePrompt(
        settings,
        nodeText,
        breadcrumb
      );

      expect(prompt).toContain('Quantum Entanglement');
      expect(prompt).toContain('Physics / Quantum Mechanics');
      expect(prompt).toContain('exactly 3** distinct');
      expect(prompt).toContain('strictly **academic**');
      expect(prompt).toContain('should be **detailed**');
    });
  });

  describe('getGenerateCardsPrompt', () => {
    it('should generate a prompt with specified card types', () => {
      const settings = {
        quantity: 10,
        types: ['basic', 'cloze'] as SRS.CardType[],
      };
      const docText = 'Content for flashcards.';

      const prompt = prompts.getGenerateCardsPrompt(settings, docText);
      expect(prompt).toContain('exactly 10** study cards');
      expect(prompt).toContain('basic, cloze');
      expect(prompt).toContain(docText);
    });

    it('should handle empty card types list gracefully', () => {
      const settings = {
        quantity: 5,
        types: [] as SRS.CardType[],
      };
      const docText = 'Content.';

      const prompt = prompts.getGenerateCardsPrompt(settings, docText);

      expect(prompt).toContain('cloze, matching');
    });
  });

  describe('getInteractiveRefinementPrompt', () => {
    const mockDoc = { type: 'doc', content: [] };

    it('should generate a prompt for selected text refinement', () => {
      const selectedText = 'To be refined';
      const instruction = 'Make it better';

      const prompt = prompts.getInteractiveRefinementPrompt(
        mockDoc,
        selectedText,
        instruction
      );

      expect(prompt).toContain('refine a specific part');
      expect(prompt).toContain(selectedText);
      expect(prompt).toContain(instruction);
      expect(prompt).toContain('FULL DOCUMENT CONTEXT');
    });

    it('should generate a prompt for full document refinement when no text is selected', () => {
      const instruction = 'Fix grammar';

      const prompt = prompts.getInteractiveRefinementPrompt(
        mockDoc,
        null,
        instruction
      );

      expect(prompt).toContain('refine an entire document');
      expect(prompt).toContain(instruction);
      expect(prompt).not.toContain('SELECTED TEXT');
    });

    it('should treat empty string selection as full document refinement', () => {
      const instruction = 'Fix grammar';

      const prompt = prompts.getInteractiveRefinementPrompt(
        mockDoc,
        '   ',
        instruction
      );

      expect(prompt).toContain('refine an entire document');
      expect(prompt).toContain(instruction);
      expect(prompt).not.toContain('SELECTED TEXT');
    });
  });

  describe('getGenerateFormulaPrompt', () => {
    it('should generate a prompt for KaTeX conversion', () => {
      const description = 'area of a circle';
      const prompt = prompts.getGenerateFormulaPrompt(description);

      expect(prompt).toContain('mathematics professor');
      expect(prompt).toContain(description);
      expect(prompt).toContain('KaTeX string');
    });
  });
});
