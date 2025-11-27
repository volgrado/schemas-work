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
    | 'input'
    | 'sequencing'
    | 'true_false'
    | 'multiple_choice';

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

  export interface InputCard extends CardBase {
    type: 'input';
    content: { prompt: string; expected: string };
  }

  export interface SequencingCard extends CardBase {
    type: 'sequencing';
    content: { prompt: string; items: string[] };
  }

  export interface TrueFalseCard extends CardBase {
    type: 'true_false';
    content: { statement: string; isTrue: boolean };
  }

  export interface MultipleChoiceCard extends CardBase {
    type: 'multiple_choice';
    content: {
      question: string;
      options: string[];
      correctOptionIndex: number;
    };
  }

  export type Card =
    | BasicCard
    | InputCard
    | SequencingCard
    | TrueFalseCard
    | MultipleChoiceCard;

  export type NewCard =
    | Omit<BasicCard, 'id' | 'deckId'>
    | Omit<InputCard, 'id' | 'deckId'>
    | Omit<SequencingCard, 'id' | 'deckId'>
    | Omit<TrueFalseCard, 'id' | 'deckId'>
    | Omit<MultipleChoiceCard, 'id' | 'deckId'>;
}
