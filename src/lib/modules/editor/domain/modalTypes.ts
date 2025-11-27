/**
 * @file modalTypes.ts
 * @module editor
 * @description
 * Defines the domain types for modal dialogs.
 */

import type { JSONContent } from '@tiptap/core';

/** Types related to all modal dialogs in the application. */
export namespace Modal {
  /** Configuration for the formula editing modal. */
  export interface FormulaConfig {
    type: 'formula';
    nodePos: number;
    nodeType: 'math_block' | 'math_inline';
    initialFormula: string;
    onsave?: (formula: string) => void;
  }

  /** Configuration for the media (image or YouTube) editing modal. */
  export interface MediaConfig {
    type: 'media';
    nodeType: 'image' | 'youtube';
    nodePos: number;
    attrs: Record<string, any>;
  }

  /** Configuration for the AI Strategy Session modal. */
  export interface StrategySessionConfig {
    type: 'strategy_session';
    action: string;
    fullDocumentJSON?: JSONContent;
    fullDocumentText?: string;
    selectedText?: string;
  }

  /** A discriminated union of all possible modal configurations. */
  export type Config = FormulaConfig | MediaConfig | StrategySessionConfig;
}
