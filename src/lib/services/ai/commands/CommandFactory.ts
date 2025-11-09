/**
 * @file CommandFactory.ts
 * @factory
 */

import type { AiHelperAction } from '$lib/stores/commandBarStore.svelte';
import type { IAICommand } from './IAICommand';

// --- Import all available concrete command classes ---
import { CreateSchemaCommand } from '././CreateSchemaCommand';
import { GenerateCardsCommand } from '././GenerateCardsCommand';
import { RefineDocumentCommand } from './RefineDocumentCommand';

/**
 * A pre-populated map that serves as the central registry for all AI commands.
 * @internal
 */
const commandMap = new Map<AiHelperAction, IAICommand>();

// --- Register all commands ---
commandMap.set('create-schema-from-text', new CreateSchemaCommand());
commandMap.set('generate-flashcards-doc', new GenerateCardsCommand());
commandMap.set('refine-document', new RefineDocumentCommand());

/**
 * Retrieves the singleton instance of the command class corresponding to the
 * given action name.
 */
export function getCommand(action: AiHelperAction): IAICommand | null {
  return commandMap.get(action) || null;
}
