/**
 * @file Manages integration with the browser's Media Session API
 * to provide native OS media controls (lock screen, notifications).
 * This service is framework-agnostic and relies on callbacks for its actions.
 * @module MediaSessionService
 */

/**
 * Defines the data structure needed to update the media session metadata.
 * This ensures the service receives all required information in a consistent format.
 */
export interface MediaMetadataPayload {
  /** The title of the current track or spoken content (e.g., a chapter title). */
  title: string;
  /** The name of the artist or primary creator (e.g., the document title). */
  artist: string;
  /** The name of the album or collection (e.g., your application's name). */
  album: string;
  /** Optional artwork for the media notification. */
  artwork?: MediaImage[];
}

/**
 * Defines the set of callbacks that the service will execute in response
 * to user interactions with the native media controls.
 */
export interface MediaSessionActions {
  onPlay: () => void;
  onPause: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
}

/**
 * A manager class for the Media Session API.
 * Encapsulates state and provides a clean interface for interaction.
 */
class MediaSessionManager {
  private readonly isSupported: boolean;
  private isInitialized = false;

  constructor() {
    // Check for browser support once and store the result.
    this.isSupported =
      typeof navigator !== 'undefined' && 'mediaSession' in navigator;
    if (!this.isSupported) {
      console.warn(
        '[MediaSessionService] Media Session API is not supported in this browser.'
      );
    }
  }

  /**
   * Sets up the media session action handlers. This should only be called once
   * during the application's lifecycle.
   * @param {MediaSessionActions} actions - An object containing the callback functions.
   */
  public initialize(actions: MediaSessionActions): void {
    if (!this.isSupported || this.isInitialized) {
      return;
    }

    console.log('[MediaSessionService] Initializing action handlers.');

    navigator.mediaSession.setActionHandler('play', actions.onPlay);
    navigator.mediaSession.setActionHandler('pause', actions.onPause);
    navigator.mediaSession.setActionHandler('nexttrack', actions.onNextTrack);
    navigator.mediaSession.setActionHandler(
      'previoustrack',
      actions.onPreviousTrack
    );

    this.isInitialized = true;
  }

  /**
   * Updates the media notification with new metadata.
   * @param {MediaMetadataPayload} metadata - The metadata to display.
   */
  public updateMetadata(metadata: MediaMetadataPayload): void {
    if (!this.isSupported) return;

    navigator.mediaSession.metadata = new MediaMetadata(metadata);
  }

  /**
   * Updates the playback state in the media notification (e.g., showing play/pause icon).
   * @param {'playing' | 'paused' | 'none'} state - The current playback state.
   */
  public setPlaybackState(state: 'playing' | 'paused' | 'none'): void {
    if (!this.isSupported) return;
    navigator.mediaSession.playbackState = state;
  }

  /**
   * Clears all metadata and resets the playback state to 'none'.
   * Should be called when media playback stops entirely.
   */
  public clear(): void {
    if (!this.isSupported) return;

    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    console.log('[MediaSessionService] Cleared media session.');
  }
}

// Export a singleton instance so the entire application shares one manager.
export const mediaSessionService = new MediaSessionManager();
