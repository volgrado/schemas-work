/**
 * @file Defines the core interfaces for the Text-to-Speech (TTS) feature.
 * @module tts.service
 *
 * @remarks
 * This file establishes a clear, implementation-agnostic contract for any TTS engine.
 * The `TTSService` interface decouples the application's business logic (the "what")
 * from the specific TTS engine's implementation (the "how"), such as the native
 * browser API or a cloud-based service. This allows for easy swapping of engines
 * without refactoring the core application logic.
 */

/**
 * Describes the structure of a voice available in a TTS engine.
 * This provides a standardized format regardless of the underlying service.
 */
export interface TTSVoice {
  /** A unique identifier for the voice (e.g., 'en-US-JennyNeural' or a browser's `voiceURI`). */
  id: string;
  /** A human-readable name for display (e.g., "Jenny (Neural - US)" or "Google UK English Female"). */
  name: string;
  /** The BCP 47 language code for the voice (e.g., "en-GB"). */
  lang: string;
}

/**
 * Defines the options and callbacks for a single speech synthesis operation.
 * All properties are designed to be optional where sensible, allowing for
 * simpler calls when only the text is needed.
 */
export interface TTSSpeakOptions {
  /** The unique identifier of the voice to use. If omitted, a default voice may be used. */
  voiceId?: string;
  /** The desired speech rate (e.g., 0.5 for slow, 2 for fast). Defaults to 1. */
  rate?: number;
  /** The desired pitch of the voice (e.g., 0 for low, 2 for high). Defaults to 1. */
  pitch?: number;
  /** The desired volume of the voice (0.0 to 1.0). Defaults to 1. */
  volume?: number; // POLISHED: Added volume, a common and essential parameter.

  /** A callback that executes when speech synthesis for this specific request has finished successfully. */
  onEnd?: () => void;
  /** A callback that executes if an error occurs during synthesis or playback for this request. */
  onError?: (error: Error) => void;
  /** An optional callback that executes at word or sentence boundaries, if supported by the engine. */
  onBoundary?: (event: SpeechSynthesisEvent) => void;

  /** POLISHED: A generic property bag for implementation-specific options, like the audioId for your offline service. */
  [key: string]: any;
}

/**
 * The standard contract for any Text-to-Speech engine implementation.
 */
export interface TTSService {
  /**
   * Initializes the service, loading voices or connecting to a remote service.
   * This method must be called before any other operation and should be idempotent
   * (safe to call multiple times).
   * @returns {Promise<void>} A promise that resolves when the service is ready.
   */
  initialize(): Promise<void>;

  /**
   * Retrieves the list of all available voices after initialization.
   * Should return an empty array if the service is not yet initialized.
   * @returns {TTSVoice[]} An array of `TTSVoice` objects.
   */
  getVoices(): TTSVoice[];

  /**
   * Initiates speech synthesis of a given text with specified options.
   * @param {string} text The text to be synthesized.
   * @param {TTSSpeakOptions} [options] - Optional configuration for this speech request.
   * @returns {Promise<void>} A promise that resolves when playback has successfully started,
   * or rejects if there's a critical setup error (e.g., API failure, invalid options).
   */
  speak(text: string, options?: TTSSpeakOptions): Promise<void>;

  /**
   * Pauses the currently playing speech.
   */
  pause(): void;

  /**
   * Resumes a previously paused speech.
   */
  resume(): void;

  /**
   * Immediately stops the current speech and clears any pending operations for this service.
   */
  cancel(): void;
}
