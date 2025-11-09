/**
 * @file IAICommand.ts
 * @interface
 *
 * @description
 * Defines the essential contract for any AI-powered command in the application.
 * Each command must provide a title, a Zod schema for validating the AI's output,
 * a method to generate a prompt, and a method to execute upon acceptance.
 */

import type { StrategySessionContext } from '$lib/stores/commandBarStore.svelte';
import type { z } from 'zod';
import type { JSONContent } from '@tiptap/core';
import type { SRS } from '$lib/types';

export interface QuickAction {
  label: string;
  instruction: string;
}

export interface WorkbenchState {
  selectedText: string | null;
  selectedCards: (SRS.Card | SRS.NewCard)[];
  draftContent?: JSONContent | null;
}

export interface IAICommand {
  readonly title: string;

  // ▼▼▼ ADD THESE OPTIONAL PROPERTIES ▼▼▼
  /** An optional, user-facing description for the command's purpose, shown in the UI. */
  readonly description?: string;

  /** An optional placeholder text for the main input, guiding the user. */
  readonly placeholder?: string;
  // ▲▲▲ END OF ADDITIONS ▲▲▲

  readonly validationSchema: z.ZodSchema;
  readonly quickActions?: QuickAction[];

  getPrompt(
    context: StrategySessionContext,
    workbenchState: WorkbenchState,
    instruction: string
  ): string;

  onAccept(result: any, context: StrategySessionContext): Promise<void>;
}
