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
// FIX: Import the JSONContent type for Tiptap documents.
import type { JSONContent } from '@tiptap/core';
import type { SRS } from '$lib/types';

/**
 * Defines a quick action button for the AI Workbench.
 */
export interface QuickAction {
  /** The user-facing, translated label for the button. */
  label: string;
  /** The instruction that will be sent to the AI when this button is clicked. */
  instruction: string;
}

/**
 * Defines the shape of the workbench's live, interactive state. This object
 * is passed to the getPrompt method to provide real-time context from the user's
 * interactions in the preview pane.
 */
export interface WorkbenchState {
  selectedText: string | null;
  selectedCards: (SRS.Card | SRS.NewCard)[];

  // FIX: Add draftContent as an optional property to the state.
  // This is the current version of the document being edited in the workbench,
  // and it's crucial context for refinement commands.
  draftContent?: JSONContent | null;
}

/**
 * The public interface for any AI command.
 * Concrete classes implementing this interface are responsible for the full lifecycle
 * of a specific AI task.
 */
export interface IAICommand {
  /**
   * The user-facing, translated title of the command.
   * It is recommended to implement this as a `getter` in the concrete class
   * to handle internationalization (i18n) dynamically.
   */
  readonly title: string;

  /** The Zod schema used to validate the AI's JSON output. */
  readonly validationSchema: z.ZodSchema;

  /** An optional array of quick action suggestions for the user. */
  readonly quickActions?: QuickAction[];

  /**
   * Generates the final prompt to be sent to the AI model.
   *
   * @param context - The original, static context from when the modal was opened.
   * @param workbenchState - The live, current state from within the interactive workbench.
   * @param instruction - The user's natural language command for refinement.
   * @returns The complete prompt string.
   */
  getPrompt(
    context: StrategySessionContext,
    workbenchState: WorkbenchState,
    instruction: string
  ): string;

  /**
   * Executes after the user clicks "Accept". This is where the command applies
   * the AI-generated content back to the application's state (e.g., updating a document).
   *
   * @param result - The validated data returned from the AI.
   * @param context - The original context, needed to apply the changes correctly.
   *
   * @remarks
   * For maximum type safety, concrete implementations of this method should type the
   * `result` parameter using `z.infer<typeof this.validationSchema>`.
   */
  onAccept(result: any, context: StrategySessionContext): Promise<void>;
}
