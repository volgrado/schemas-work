/**
 * @file RefineDocumentCommand.ts
 * @class
 * @description
 * Implements the "Refine Document" command for the AI Workbench.
 * This command allows users to modify an existing document (or a selected portion of it)
 * using natural language instructions, such as "Make this more formal" or "Summarize this section".
 */

import type { IAICommand, WorkbenchState } from './IAICommand';
import { type StrategySessionContext } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
import { setDocument } from '$lib/modules/editor/ui/editorStore.svelte';
import * as aiSchemas from '$lib/schemas/aiSchemas';
import * as Prompts from '$lib/services/ai/prompts';
import { toast } from 'svelte-sonner';
import type { z } from 'zod';
import { i18n } from '$lib/utils/i18n.svelte';
import type { JSONContent } from '@tiptap/core';

import * as errorService from '$lib/core/services/errorService';

/**
 * Command to refine or transform an existing document based on user instructions.
 */
export class RefineDocumentCommand implements IAICommand {
  /**
   * The user-facing title of the command.
   */
  public get title(): string {
    return i18n.t('ai_commands.refine_document.title', {
      fallback: 'Refine Document',
    });
  }

  /**
   * The Zod schema used to validate the AI's response.
   * Ensures the output is a valid Tiptap document structure.
   */
  public readonly validationSchema = aiSchemas.CreateSchemaAiResponseSchema;

  /**
   * Generates the prompt for the document refinement task.
   *
   * @param context - The session context (unused).
   * @param workbenchState - The current state of the workbench, including draft content and selection.
   * @param instruction - The user's specific refinement instruction.
   * @returns {string} The prompt string.
   * @throws {Error} If no draft content is available in the workbench state.
   */
  public getPrompt(
    context: StrategySessionContext,
    workbenchState: WorkbenchState,
    instruction: string
  ): string {
    const { draftContent, selectedText } = workbenchState;

    if (!draftContent) {
      throw new Error(
        'RefineDocumentCommand requires draftContent to be present in the workbench state.'
      );
    }

    return Prompts.getInteractiveRefinementPrompt(
      draftContent as JSONContent,
      selectedText,
      instruction
    );
  }

  /**
   * Handles the successful, validated response from the AI by updating the document.
   *
   * @param result - The valid Tiptap JSON content returned by the AI.
   * @param context - The session context (unused).
   * @returns {Promise<void>}
   */
  public async onAccept(
    result: z.infer<typeof this.validationSchema>,
    context: StrategySessionContext
  ): Promise<void> {
    if (result) {
      setDocument(result);
      toast.success(
        i18n.t('ai_commands.refine_document.success', {
          fallback: 'Document refined successfully.',
        })
      );
    } else {
      toast.error(
        i18n.t('ai_commands.refine_document.error_invalid', {
          fallback: 'AI returned an invalid document structure.',
        })
      );
      errorService.reportError(new Error('Invalid Tiptap JSON received'), {
        context: 'RefineDocumentCommand',
        action: 'onAccept',
        metadata: { result },
      });
    }
  }
}
