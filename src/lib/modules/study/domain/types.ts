/**
 * @file types.ts
 * @module study
 * @description
 * Defines the domain types for the Study module (SRS).
 */

export namespace SRS {
  export type ReviewQuality = 0 | 3 | 4 | 5;

  export interface Data {
    easeFactor: number;
    interval: number;
    repetitions: number;
    dueDate: number;
    learningStep: number;
  }

  export type CardType =
    | 'basic'
    | 'sequencing'
    | 'multiple_choice'
    | 'cloze'
    | 'matching';

  interface CardBase {
    id: string;
    deckId: string;
    srs: Data;
    tags: string[];
    suspended: boolean;
  }

  export interface BasicCard extends CardBase {
    type: 'basic';
    content: { question: string; answer: string };
  }

  export interface SequencingCard extends CardBase {
    type: 'sequencing';
    content: { prompt: string; items: string[] };
  }

  export interface MultipleChoiceCard extends CardBase {
    type: 'multiple_choice';
    content: {
      question: string;
      options: string[];
      correctOptionIndex: number;
    };
  }

  export interface ClozeCard extends CardBase {
    type: 'cloze';
    content: {
      text: string; // The full text with clozes hidden, e.g., "The {{capital}} of France is {{Paris}}."
      clozes: string[]; // The hidden words, e.g., ["capital", "Paris"]
    };
  }

  export interface MatchingCard extends CardBase {
    type: 'matching';
    content: {
      prompt: string;
      pairs: { left: string; right: string }[];
    };
  }

  export type Card =
    | BasicCard
    | SequencingCard
    | MultipleChoiceCard
    | ClozeCard
    | MatchingCard;

  export type NewCard =
    | Omit<BasicCard, 'id' | 'deckId'>
    | Omit<SequencingCard, 'id' | 'deckId'>
    | Omit<MultipleChoiceCard, 'id' | 'deckId'>
    | Omit<ClozeCard, 'id' | 'deckId'>
    | Omit<MatchingCard, 'id' | 'deckId'>;
}
