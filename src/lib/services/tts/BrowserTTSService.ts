/**
 * @file Implements the TTSService interface using the native browser `window.speechSynthesis` API.
 * @module BrowserTTSService
 *
 * @remarks
 * This service includes several key features to ensure a stable user experience:
 * - Robust voice loading with a polling fallback for browser inconsistencies.
 * - Automatic text chunking to prevent silent failures with long text passages.
 * - A "watchdog" timer to monitor and prevent stalled synthesis.
 * - Careful state management to prevent race conditions.
 */

import type { TTSService, TTSVoice, TTSSpeakOptions } from './tts.service';

/**
 * Implements the `TTSService` using the browser's native `window.speechSynthesis` API.
 */
export class BrowserTTSService implements TTSService {
	private synthesis: SpeechSynthesis;
	private voices: SpeechSynthesisVoice[] = [];
	private isInitialized = false;
	private currentUtterance: SpeechSynthesisUtterance | null = null;

	private static readonly MAX_TEXT_LENGTH = 150;

	constructor() {
		if (typeof window === 'undefined' || !window.speechSynthesis) {
			this.synthesis = {} as SpeechSynthesis;
			console.warn('SpeechSynthesis API is not available.');
		} else {
			this.synthesis = window.speechSynthesis;
		}
	}

	/**
	 * Initializes the service by loading the list of available synthesis voices.
	 * @returns {Promise<void>} A promise that resolves when voices are loaded, or rejects on timeout.
	 */
	public initialize(): Promise<void> {
		if (this.isInitialized) {
			return Promise.resolve();
		}
		if (!this.synthesis.getVoices) {
			this.isInitialized = true;
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			const loadVoices = () => {
				const loadedVoices = this.synthesis.getVoices();
				if (loadedVoices.length > 0) {
					this.voices = loadedVoices;
					this.isInitialized = true;
					return true;
				}
				return false;
			};

			if (loadVoices()) {
				resolve();
				return;
			}

			this.synthesis.onvoiceschanged = () => {
				if (loadVoices()) {
					resolve();
					this.synthesis.onvoiceschanged = null;
				}
			};

			const pollInterval = setInterval(() => {
				if (loadVoices()) {
					clearInterval(pollInterval);
					resolve();
				}
			}, 100);

			setTimeout(() => {
				clearInterval(pollInterval);
				if (!this.isInitialized) {
					reject(new Error('Timeout: Could not load browser voices.'));
				}
			}, 3000);
		});
	}

	/**
	 * Retrieves the list of available TTS voices.
	 * @returns {TTSVoice[]} An array of `TTSVoice` objects.
	 */
	public getVoices(): TTSVoice[] {
		if (!this.isInitialized) {
			return [];
		}
		return this.voices.map((voice) => ({
			id: voice.voiceURI,
			name: `${voice.name} (${voice.lang})`,
			lang: voice.lang
		}));
	}

	/**
	 * Initiates speech synthesis for the given text.
	 * @param {string} text The text to be spoken.
	 * @param {TTSSpeakOptions} options Configuration for the speech.
	 */
	public speak(text: string, options: TTSSpeakOptions): void {
		if (!this.isInitialized) {
			options.onError(new Error('TTS service has not been initialized.'));
			return;
		}

		if (this.synthesis.speaking) {
			this.cancel();
		}

		if (!text.trim()) {
			options.onEnd();
			return;
		}

		const chunks = this.chunkText(text);
		let chunkIndex = 0;

		const speakChunk = () => {
			if (chunkIndex >= chunks.length) {
				options.onEnd();
				return;
			}

			const chunk = chunks[chunkIndex];
			const utterance = new SpeechSynthesisUtterance(chunk);
			this.currentUtterance = utterance;

			const selectedVoice = this.voices.find((v) => v.voiceURI === options.voiceId);
			if (selectedVoice) {
				utterance.voice = selectedVoice;
			}

			utterance.rate = options.rate;
			utterance.pitch = options.pitch;
			utterance.onerror = (event) => options.onError(event);

			if (options.onBoundary) {
				this.setupBoundaryCallback(utterance, chunks, chunkIndex, options.onBoundary);
			}

			utterance.onend = () => {
				chunkIndex++;
				speakChunk();
			};

			this.synthesis.speak(utterance);
		};

		speakChunk();
		this.startWatchdog();
	}

	/** Pauses the currently active speech synthesis. */
	public pause(): void {
		if (this.synthesis.speaking) {
			this.synthesis.pause();
		}
	}

	/** Resumes the currently paused speech synthesis. */
	public resume(): void {
		if (this.synthesis.paused) {
			this.synthesis.resume();
		}
	}

	/** Immediately stops the current speech and clears the utterance queue. */
	public cancel(): void {
		this.currentUtterance = null;
		if (this.synthesis) {
			this.synthesis.cancel();
		}
	}

	/**
	 * Sets up the `onboundary` callback, adjusting the character index to be relative to the full text.
	 * @param {SpeechSynthesisUtterance} utterance The utterance to attach the event to.
	 * @param {string[]} chunks The array of all text chunks.
	 * @param {number} chunkIndex The index of the current chunk.
	 * @param {(event: SpeechSynthesisEvent) => void} onBoundaryCallback The user-provided callback.
	 * @internal
	 */
	private setupBoundaryCallback(
		utterance: SpeechSynthesisUtterance,
		chunks: string[],
		chunkIndex: number,
		onBoundaryCallback: (event: SpeechSynthesisEvent) => void
	) {
		const baseCharIndex = chunks.slice(0, chunkIndex).reduce((acc, c) => acc + c.length, 0);

		utterance.onboundary = (event) => {
			const adjustedEvent = new SpeechSynthesisEvent('boundary', {
				...event,
				charIndex: baseCharIndex + event.charIndex
			});

			if ('charLength' in event) {
				Object.defineProperty(adjustedEvent, 'charLength', {
					value: (event as any).charLength,
					writable: false
				});
			}

			onBoundaryCallback(adjustedEvent);
		};
	}

	/**
	 * Splits a long text string into an array of smaller chunks.
	 * @param {string} text The full text to chunk.
	 * @returns {string[]} An array of text chunks.
	 * @internal
	 */
	private chunkText(text: string): string[] {
		if (text.length <= BrowserTTSService.MAX_TEXT_LENGTH) {
			return [text];
		}

		const chunks: string[] = [];
		let remainingText = text;

		while (remainingText.length > 0) {
			if (remainingText.length <= BrowserTTSService.MAX_TEXT_LENGTH) {
				chunks.push(remainingText);
				break;
			}

			let cutPoint = remainingText.lastIndexOf('.', BrowserTTSService.MAX_TEXT_LENGTH);
			if (cutPoint === -1) {
				cutPoint = remainingText.lastIndexOf(' ', BrowserTTSService.MAX_TEXT_LENGTH);
			}
			if (cutPoint === -1) {
				cutPoint = BrowserTTSService.MAX_TEXT_LENGTH;
			}

			chunks.push(remainingText.substring(0, cutPoint + 1));
			remainingText = remainingText.substring(cutPoint + 1).trim();
		}

		return chunks.filter((chunk) => chunk.length > 0);
	}

	/**
	 * Starts a timer that periodically checks if the speech synthesis engine has stalled.
	 * @internal
	 */
	private startWatchdog(): void {
		const watchdogInterval = setInterval(() => {
			if (!this.currentUtterance) {
				clearInterval(watchdogInterval);
				return;
			}

			if (!this.synthesis.speaking && !this.synthesis.paused) {
				console.warn('Watchdog: Speech synthesis stopped unexpectedly. Cancelling to prevent freeze.');
				this.cancel();
				clearInterval(watchdogInterval);
			}
		}, 2000);
	}
}
