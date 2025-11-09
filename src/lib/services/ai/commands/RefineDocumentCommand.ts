/**
 * @file RefineDocumentCommand.ts
 * ... (description) ...
 */

import type { IAICommand, WorkbenchState } from './IAICommand';
import { type StrategySessionContext } from '$lib/stores/commandBarStore.svelte';
import { setDocument } from '$lib/stores/editorStore.svelte';
import * as aiSchemas from '$lib/schemas/aiSchemas';
import * as Prompts from '$lib/services/ai/prompts';
import { toast } from 'svelte-sonner';
import type { z } from 'zod';
import { get } from 'svelte/store';
import { t } from '$lib/utils/i18n';
import type { JSONContent } from '@tiptap/core';

export class RefineDocumentCommand implements IAICommand {
  public get title(): string {
    return get(t)('ai_commands.refine_document.title', {
      fallback: 'Refine Document',
    });
  }

  public readonly validationSchema = aiSchemas.CreateSchemaAiResponseSchema;

  public getPrompt(
    context: StrategySessionContext,
    workbenchState: WorkbenchState,
    instruction: string
  ): string {
    // This line will no longer cause a TypeScript error.
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

  public async onAccept(
    result: z.infer<typeof this.validationSchema>,
    context: StrategySessionContext
  ): Promise<void> {
    const _t = get(t);

    if (result) {
      setDocument(result);
      toast.success(
        _t('ai_commands.refine_document.success', {
          fallback: 'Document refined successfully.',
        })
      );
    } else {
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
