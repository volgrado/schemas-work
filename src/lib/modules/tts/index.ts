/**
 * @file Public API for the TTS module.
 * @module @modules/tts
 */

export { default as TTSController } from './ui/TTSController.svelte';
export * from './ui/ttsStore.svelte';
export * from './infra/ttsUtils';
export * from './infra/ttsHighlighting';
export { WebSpeechTTSService } from './infra/webSpeechTTSService';
