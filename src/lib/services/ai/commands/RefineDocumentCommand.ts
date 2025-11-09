/**
 * @file RefineDocumentCommand.ts
 * @class
 * @description Implements the "Refine Document" command for the AI Workbench,
 * encapsulating its prompt generation and result handling logic with i18n support.
 */

import type { IAICommand, WorkbenchState } from './IAICommand';
import { type StrategySessionContext } from '$lib/stores/commandBarStore.svelte';
import { setDocument } from '$lib/stores/editorStore.svelte';
import * as aiSchemas from '$lib/schemas/aiSchemas';
import * as Prompts from '$lib/services/ai/prompts';
import { toast } from 'svelte-sonner';
import { generateText } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import type { z } from 'zod';
// REFINEMENT: Import tools for i18n.
import { get } from 'svelte/store';
import { t } from '$lib/utils/i18n';

export class RefineDocumentCommand implements IAICommand {
  // REFINEMENT: Use a getter to dynamically provide the translated title.
  public get title(): string {
    return get(t)('ai_commands.refine_document.title', {
      fallback: 'Refine Document',
    });
  }

  public readonly validationSchema = aiSchemas.CreateSchemaAiResponseSchema;

  /**
   * Generates the prompt for the interactive document refinement task.
   */
  public getPrompt(
    context: StrategySessionContext,
    workbenchState: WorkbenchState,
    instruction: string
  ): string {
    const fullDocumentJSON = context.fullDocumentJSON;
    if (!fullDocumentJSON) {
      throw new Error(
        'RefineDocumentCommand requires fullDocumentJSON in its context.'
      );
    }

    const fullDocumentText = generateText(fullDocumentJSON, [
      Document,
      Paragraph,
      Text,
      Heading,
    ]);

    const selectedText = workbenchState.selectedText || null;

    return Prompts.getInteractiveRefinementPrompt(
      fullDocumentText,
      selectedText,
      instruction
    );
  }

  /**
   * Handles the successful, validated response from the AI, providing user feedback in the correct language.
   */
  public async onAccept(
    result: z.infer<typeof this.validationSchema>,
    context: StrategySessionContext
  ): Promise<void> {
    // REFINEMENT: Get the translation function for use in this method.
    const _t = get(t);

    if (result) {
      setDocument(result);
      // REFINEMENT: Use the translated success message.
      toast.success(
        _t('ai_commands.refine_document.success', {
          fallback: 'Document refined successfully.',
        })
      );
    } else {
      // REFINEMENT: Use the translated error message.
      toast.error(
        _t('ai_commands.refine_document.error_invalid', {
          fallback: 'AI returned an invalid document structure.',
        })
      );
      console.error(
        'Invalid Tiptap JSON received for onAccept in RefineDocumentCommand:',
        result
      );
    }
  }
}
