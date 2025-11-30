/**
 * @file CreateLessonFromDocsCommand.ts
 * @class
 * @description
 * Implements the "Create Lesson from Docs" command for the AI Workbench.
 * This command takes context documents and creates a structured language lesson.
 */

import { i18n } from '$lib/utils/i18n.svelte';
import { toast } from 'svelte-sonner';
import { z } from 'zod';

import type { IAICommand, WorkbenchState } from './IAICommand';
import type { StrategySessionContext } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
import { aiSchemas } from '$lib/modules/ai/domain/aiSchemas';
import * as Prompts from '$lib/modules/ai/prompts';
import { commandBarState } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
import { create as createDocument } from '$lib/modules/editor/ui/documentStore.svelte';

/**
 * Command to create a new language lesson from attached documents.
 */
export class CreateLessonFromDocsCommand implements IAICommand {
  /**
   * The user-facing title of the command.
   */
  public get title(): string {
    return 'Create Lesson from Docs';
  }

  public get description(): string {
    return 'Create a structured language lesson based on attached documents.';
  }

  public get placeholder(): string {
    return 'Enter the topic or goal of the lesson (e.g., "Business Meeting Vocabulary")...';
  }

  /**
   * The Zod schema used to validate the AI's response.
   * Ensures the output is a valid Tiptap document structure.
   */
  public readonly validationSchema = aiSchemas.CreateSchemaAiResponseSchema;

  /**
   * Generates the prompt for the lesson creation task.
   */
  public getPrompt(
    context: StrategySessionContext,
    workbenchState: WorkbenchState,
    instruction: string
  ): string {
    // Use the instruction (refinement) if present, otherwise use the initial input (configuration)
    const topic = instruction || context.initialInput || 'General Topic';
    return Prompts.getCreateLessonFromDocsPrompt(topic);
  }

  /**
   * Handles the successful, validated response from the AI by creating a new document.
   */
  public async onAccept(
    result: z.infer<typeof this.validationSchema>,
    context: StrategySessionContext
  ): Promise<void> {
    const defaultTitle = 'New Language Lesson';

    // Extract the title from the first H1 heading, if present.
    const title = result.content?.[0]?.content?.[0]?.text || defaultTitle;
    const parentId = commandBarState.viewPayload?.parentId || null;

    createDocument(title, result, parentId);

    toast.success(`Lesson '${title}' created successfully.`);
  }
}
