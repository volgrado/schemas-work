/**
 * @file Defines the core interfaces for the Text-to-Speech (TTS) feature.
 *
 * @remarks
 * This file establishes a clear, implementation-agnostic contract for any TTS engine.
 * By defining the `TTSService` interface, the application's audio architecture becomes
 * modular and adaptable. This abstraction is key to decoupling the application's
 * business logic (managed in stores and components) from any specific TTS engine,
 * such as the native browser API or a future cloud-based service.
 */

/**
 * Describes the structure of a voice available in a TTS engine.
 * This is a clean, implementation-agnostic data model.
 */
export interface TTSVoice {
  /** A unique identifier for the voice, used to select it in the API (e.g., the `voiceURI`). */
  id: string;
  /** A human-readable name for display to the user (e.g., "Google UK English Female"). */
  name: string;
  /** The BCP 47 language code for the voice (e.g., "en-GB"). */
  lang: string;
}

/**
 * Defines the complete set of options and callbacks for a single speech operation.
 * This allows for granular control over the behavior of each `speak` call.
 */
export interface TTSSpeakOptions {
  /** The unique identifier of the voice to use, obtained from `getVoices()`. */
  voiceId: string;

  /** The desired speech rate. The value is typically between 0.5 (slow) and 2 (fast). */
  rate: number;

  /** The desired pitch of the voice. The value is typically between 0 (low) and 2 (high). */
  pitch: number;

  /** A callback function that executes when the entire speech synthesis has successfully finished. */
  onEnd: () => void;

  /** A callback function that executes if an error occurs at any point during the synthesis. */
  onError: (error: any) => void;

  /**
   * An optional callback that executes each time the speech engine reaches a word or sentence boundary.
   * The event provides the `charIndex`, which is crucial for highlighting text as it is spoken.
   */
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

/**
 * The `TTSService` interface defines the standard contract for any Text-to-Speech engine.
 *
 * @remarks
 * Adhering to this interface ensures that different TTS implementations can be swapped
 * with minimal friction, preserving the separation of concerns.
 */
export interface TTSService {
  /**
   * Initializes the service. This is a critical, and often asynchronous, first step.
   * It is responsible for loading voices or connecting to a remote service.
   * This method MUST be called before any other operation.
   *
   * @returns A promise that resolves when the service is ready for use.
   */
  initialize(): Promise<void>;

  /**
   * Retrieves the list of all available voices after the service has been initialized.
   *
   * @returns An array of `TTSVoice` objects.
   */
  getVoices(): TTSVoice[];

  /**
   * Initiates the speech synthesis of a given text with specified options.
   * The implementation must handle text segmentation and queuing if necessary.
   *
   * @param text - The text to be synthesized.
   * @param options - The configuration object for this specific speech request, including callbacks.
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
   * This should reset the service to an idle state.
   */
  cancel(): void;
}
