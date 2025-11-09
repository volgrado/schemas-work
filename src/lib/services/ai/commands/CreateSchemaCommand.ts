/**
 * @file CreateSchemaCommand.ts
 * @class
 * @description Implements the "Create Document from Text" command for the AI Workbench.
 */

import type { IAICommand, WorkbenchState } from './IAICommand';
import {
  type StrategySessionContext,
  commandBarState,
} from '$lib/stores/commandBarStore.svelte';
// VVVV CORRECTED IMPORT VVVV
import { create as createDocument } from '$lib/stores/documentStore.svelte';
import * as aiSchemas from '$lib/schemas/aiSchemas';
import * as Prompts from '$lib/services/ai/prompts';
import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { t } from '$lib/utils/i18n';
import type { z } from 'zod';

export class CreateSchemaCommand implements IAICommand {
  public get title(): string {
    return get(t)('ai_commands.create_schema.title', {
      default: 'Create Document from Text',
    });
  }

  public readonly validationSchema = aiSchemas.CreateSchemaAiResponseSchema;

  /**
   * Generates the prompt for the schema creation task.
   */
  public getPrompt(
    context: StrategySessionContext,
    workbenchState: WorkbenchState,
    instruction: string
  ): string {
    const rawText = context.initialInput || '';
    return Prompts.getCreateSchemaPrompt({}, rawText);
  }

  /**
   * Handles the successful, validated response from the AI by creating a new document.
   */
  public async onAccept(
    result: z.infer<typeof this.validationSchema>,
    context: StrategySessionContext
  ): Promise<void> {
    const _t = get(t);
    const defaultTitle = _t('ai_commands.create_schema.default_title', {
      default: 'New Schema',
    });

    const title = result.content?.[0]?.content?.[0]?.text || defaultTitle;
    const parentId = commandBarState.viewPayload?.parentId || null;

    // VVVV CORRECTED METHOD CALL VVVV
    createDocument(title, result, parentId);

    const messageTemplate = _t('ai_commands.create_schema.success', {
      default: "Document '{title}' created successfully.",
    });
    const finalMessage = messageTemplate.replace('{title}', title);

    toast.success(finalMessage);
  }
}
