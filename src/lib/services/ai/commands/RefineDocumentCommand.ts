/**
 * @file RefineDocumentCommand.ts
 * ... (description) ...
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

export class RefineDocumentCommand implements IAICommand {
  public get title(): string {
    return i18n.t('ai_commands.refine_document.title', {
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
