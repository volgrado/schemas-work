// src/lib/services/ai/commands/GenerateFormulaCommand.ts

import type { IAICommand, WorkbenchState } from './IAICommand';
import { type StrategySessionContext } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
import * as aiSchemas from '$lib/schemas/aiSchemas'; // You would need a simple string schema
import * as Prompts from '$lib/services/ai/prompts';
import { editorState } from '$lib/modules/editor/ui/editorStore.svelte';
import { z } from 'zod';

export class GenerateFormulaCommand implements IAICommand {
  public title = 'Create Formula from Description';
  public description =
    'Describe a math formula in plain text, and the AI will generate the KaTeX for it.';
  public placeholder =
    'e.g., "The Pythagorean theorem" or "The standard deviation formula"';

  // The AI should just return a single string.
  public readonly validationSchema = z.string().min(1);

  public getPrompt(
    context: StrategySessionContext,
    workbenchState: WorkbenchState,
    instruction: string // In this command, `instruction` IS the description
  ): string {
    return Prompts.getGenerateFormulaPrompt(instruction);
  }

  public async onAccept(
    result: z.infer<typeof this.validationSchema>,
    context: StrategySessionContext
  ): Promise<void> {
    const editor = editorState.instance;
    if (!editor) return;

    // `result` is now the clean KaTeX string, e.g., "E = mc^2"
    const formula = result;

    // Use Tiptap's command chain to insert a new math node
    // at the user's current cursor position.
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'math_inline', // or 'math_block' if you add a setting for it
        attrs: {
          formula: formula,
        },
      })
      .run();
  }
}
