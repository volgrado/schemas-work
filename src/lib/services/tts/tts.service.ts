// src/lib/services/tts/tts.service.ts

/**
 * Describes the structure of a voice available in a TTS engine.
 * It is a clean, implementation-agnostic data model.
 */
export interface TTSVoice {
  /** A unique identifier to use in the API (e.g., the `voiceURI` property). */
  id: string;
  /** A human-readable name for the user (e.g., "Google UK English Female"). */
  name: string;
  /** A BCP 47 language code (e.g., "en-GB"). */
  lang: string;
}

/**
 * Defines the complete set of options and callbacks for a speech operation.
 * This allows for granular control over each `speak` call.
 */
export interface TTSSpeakOptions {
  /** The unique identifier of the voice to use, obtained from `getVoices()`. */
  voiceId: string;

  /** The speech rate. The typical range is 0.5 (slow) to 2 (fast). */
  rate: number;

  /** The pitch of the voice. The typical range is 0 (low) to 2 (high). */
  pitch: number;

  /** Callback that executes when the entire speech (including all fragments) has successfully finished. */
  onEnd: () => void;

  /** Callback that executes if an error occurs during speech synthesis. */
  onError: (error: any) => void;

  /**
   * (Optional) Callback that executes each time the speech engine
   * reaches a word boundary. Essential for "karaoke" functionality.
   * The event provides information like `charIndex` to know where to highlight.
   */
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

/**
 * The `TTSService` interface defines the fundamental contract for any Text-to-Speech engine.
 *
 * This abstraction is the cornerstone of our audio architecture, allowing us
 * to swap the underlying implementation (e.g., from the browser to a cloud-based AI service)
 * without needing to modify the business logic in the stores or components.
 */
export interface TTSService {
  /**
   * Initializes the service. This is a critical and often asynchronous step,
   * necessary for tasks like loading voices from the operating system or an API.
   * It must be called before any other operation.
   * @returns {Promise<void>} A promise that resolves when the service is ready.
   */
  initialize(): Promise<void>;

  /**
   * Returns a list of all available voices after a successful initialization.
   * @returns {TTSVoice[]} An array of `TTSVoice` objects.
   */
  getVoices(): TTSVoice[];

  /**
   * Starts the speech of a given text with the specified options.
   * The implementation must handle queue logic and text segmentation if necessary.
   * @param {string} text The text to synthesize.
   * @param {TTSSpeakOptions} options The configuration and callbacks object for this speech.
   */
  speak(text: string, options: TTSSpeakOptions): void;

  /**
   * Pauses the currently playing speech.
   */
  pause(): void;

  /**
   * Resumes a speech that has been paused.
   */
  resume(): void;

  /**
   * Immediately stops the current speech and clears any
   * text fragments that were queued to be played.
   * Resets the service state to idle.
   */
  cancel(): void;
}
