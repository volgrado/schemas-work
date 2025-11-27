/**
 * @file Public API for the Editor module.
 * @module @modules/editor
 */

export { default as DocumentView } from './ui/DocumentView.svelte';
export * from './ui/editorStore.svelte';
export * from './ui/cardEditorStore.svelte';
export * from './domain/schema';
export * from './domain/slashCommands';
export { EditorController } from './infra/EditorController';
export { default as CardEditorPanel } from './ui/CardEditorPanel.svelte';
export * from './infra/extensions/SlashCommandExtension';
export * from './infra/extensions/DataPosExtension';
export * from './infra/extensions/TTSHighlightExtension';
export * from './infra/extensions/NodeIdExtension';
export { default as SlashMenuController } from './ui/SlashMenuController.svelte';

// Node Detail
export { default as NodeDetailPanel } from './ui/node-detail/NodeDetailPanel.svelte';
export { default as NodeDetailHeader } from './ui/node-detail/NodeDetailHeader.svelte';
