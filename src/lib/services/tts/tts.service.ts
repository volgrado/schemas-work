/**
 * @file Defines the core interfaces for the Text-to-Speech (TTS) feature.
 * @module tts.service
 *
 * @remarks
 * This file establishes a clear, implementation-agnostic contract for any TTS engine.
 * The `TTSService` interface decouples the application's business logic from any
 * specific TTS engine, such as the native browser API or a cloud-based service.
 */

/**
 * Describes the structure of a voice available in a TTS engine.
 */
export interface TTSVoice {
  /** A unique identifier for the voice (e.g., the `voiceURI`). */
  id: string;
  /** A human-readable name for display (e.g., "Google UK English Female"). */
  name: string;
  /** The BCP 47 language code for the voice (e.g., "en-GB"). */
  lang: string;
}

/**
 * Defines the options and callbacks for a single speech operation.
 */
export interface TTSSpeakOptions {
  /** The unique identifier of the voice to use. */
  voiceId: string;
  /** The desired speech rate (e.g., 0.5 for slow, 2 for fast). */
  rate: number;
  /** The desired pitch of the voice (e.g., 0 for low, 2 for high). */
  pitch: number;
  /** A callback that executes when speech synthesis has finished. */
  onEnd: () => void;
  /** A callback that executes if an error occurs during synthesis. */
  onError: (error: any) => void;
  /** An optional callback that executes at word or sentence boundaries. */
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

/**
 * The standard contract for any Text-to-Speech engine.
 */
export interface TTSService {
  /**
   * Initializes the service, loading voices or connecting to a remote service.
   * This method must be called before any other operation.
   * @returns {Promise<void>} A promise that resolves when the service is ready.
   */
  initialize(): Promise<void>;

  /**
   * Retrieves the list of all available voices after initialization.
   * @returns {TTSVoice[]} An array of `TTSVoice` objects.
   */
  getVoices(): TTSVoice[];

  /**
   * Initiates speech synthesis of a given text with specified options.
   * @param {string} text The text to be synthesized.
   * @param {TTSSpeakOptions} options The configuration for this speech request.
   */
  speak(text: string, options: TTSSpeakOptions): void;

  /**
   * Pauses the currently playing speech.
   */
  pause(): void;

  /**
   * Resumes a previously paused speech.
   */
  resume(): void;

  /**
   * Immediately stops the current speech and clears any pending utterances.
   */
  cancel(): void;
}
