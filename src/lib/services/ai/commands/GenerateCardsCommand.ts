/**
 * @file GenerateCardsCommand.ts
 * @class
 * @description Implements the "Generate Study Cards" command for the AI Workbench.
 */

import type { IAICommand, WorkbenchState } from './IAICommand';
import { type StrategySessionContext } from '$lib/stores/commandBarStore.svelte';
import * as aiSchemas from '$lib/schemas/aiSchemas';
import * as Prompts from '$lib/services/ai/prompts';
import { documentState } from '$lib/stores/documentStore.svelte';
// VVVV THIS LINE IS NOW CORRECTED VVVV
import * as cardService from '$lib/services/features/cardService';
import { toast } from 'svelte-sonner';
import type { SRS } from '$lib/types';
import type { z } from 'zod';
import { get } from 'svelte/store';
import { t } from '$lib/utils/i18n';

// A type that accurately represents what the AI is asked to return.
type AiGeneratedCard = Pick<SRS.NewCard, 'type' | 'content'>;

export class GenerateCardsCommand implements IAICommand {
  public get title(): string {
    return get(t)('ai_commands.generate_cards.title', {
      fallback: 'Generate Study Cards',
    });
  }

  public readonly validationSchema = aiSchemas.FlashcardResponseSchema;

  /**
   * Generates the prompt for the card generation task.
   */
  public getPrompt(
    context: StrategySessionContext,
    workbenchState: WorkbenchState,
    instruction: string
  ): string {
    const documentText = context.fullDocumentText || '';
    const settings = {
      quantity: 5,
      types: ['basic', 'input'] as SRS.CardType[],
    };
    return Prompts.getGenerateCardsPrompt(settings, documentText);
  }

  /**
   * Handles the successful, validated response from the AI by saving the new cards.
   */
  public async onAccept(
    result: z.infer<typeof this.validationSchema>,
    context: StrategySessionContext
  ): Promise<void> {
    const _t = get(t);
    const docId = documentState.docId;

    if (!docId) {
      toast.error(
        _t('ai_commands.generate_cards.error_no_doc', {
          fallback:
            'Save Error: Could not find the active document ID to save cards to.',
        })
      );
      return;
    }
    if (!result || result.length === 0) {
      toast.info(
        _t('ai_commands.generate_cards.info_no_cards', {
          fallback: 'The AI did not generate any cards.',
        })
      );
      return;
    }

    try {
      await cardService.addCards(docId, result as SRS.NewCard[]);
      const successMessage = _t('ai_commands.generate_cards.success', {
        count: result.length,
      });
      toast.success(
        successMessage ||
          `${result.length} new study card(s) created successfully.`
      );
    } catch (error) {
      console.error('Failed to save generated cards:', error);
      toast.error(
        _t('ai_commands.generate_cards.error_critical', {
          fallback:
            'A critical error occurred while trying to save the new cards.',
        })
      );
    }
  }
}
