<!--
  @component
  TacticalConsole
  
  The input area for the tactical interface.
  Includes text input and quick action buttons.
-->
<script lang="ts">
  import { fade, fly, slide } from 'svelte/transition';
  import Button from '$lib/core/ui/Button.svelte';
  import Textarea from '$lib/core/ui/Textarea.svelte';

  import { speakPhrase } from '$lib/modules/tts/ui/ttsStore.svelte';

  let { 
    value = $bindable(''),
    onSend,
    disabled = false
  } = $props<{ 
    value: string;
    onSend: () => void;
    disabled?: boolean;
  }>();

  // Interaction State
  let showHint = $state(false);
  let translateActive = $state(false);
  let pronunciationActive = $state(false);
  let pragmaticActive = $state(false);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
        showHint = false; // Close hint on send
        pronunciationActive = false;
        pragmaticActive = false;
      }
    }
  }

  function toggleHint() {
    showHint = !showHint;
    pronunciationActive = false;
    pragmaticActive = false;
  }

  function toggleTranslate() {
    translateActive = !translateActive;
  }

  function togglePronunciation() {
    pronunciationActive = !pronunciationActive;
    showHint = false;
    pragmaticActive = false;
  }

  function togglePragmatic() {
    pragmaticActive = !pragmaticActive;
    showHint = false;
    pronunciationActive = false;
  }

  function handleSpeak() {
    // Mock target language 'es' for now, ideally passed as prop
    speakPhrase("No creo que sea buena idea", 'es');
  }

  // Mock Pragmatic Analysis
  function analyzePragmatics(text: string) {
    if (!text) return { tone: 'Neutral', advice: 'Start typing to analyze...' };
    if (text.length < 5) return { tone: 'Curt', advice: 'Too brief. Consider expanding.' };
    if (text.toLowerCase().includes('please') || text.toLowerCase().includes('could')) {
      return { tone: 'Polite', advice: 'Good use of softeners.' };
    }
    return { tone: 'Direct', advice: 'Consider adding a softener like "please".' };
  }

  let analysis = $derived(analyzePragmatics(value));

  // Phonetics State (The Mirror)
  let isRecording = $state(false);

  function toggleRecord() {
    isRecording = !isRecording;
    if (isRecording) {
      // Mock recording duration
      setTimeout(() => {
        isRecording = false;
      }, 3000);
    }
  }
</script>

<div class="tactical-console">
  <!-- Hint Popover -->
  {#if showHint}
    <div class="hint-popover" transition:fly={{ y: 10, duration: 200 }}>
      <div class="hint-content">
        <span class="hint-icon">💡</span>
        <div class="hint-text">
          <strong>Tactical Insight:</strong>
          <p>Try using the <em>subjunctive mood</em> to express doubt. Start with "No creo que..."</p>
        </div>
      </div>
      <div class="hint-arrow"></div>
    </div>
  {/if}

  <!-- Somatic Phonetics Popover (The Mirror) -->
  {#if pronunciationActive}
    <div class="hint-popover somatic-popover" transition:fly={{ y: 10, duration: 200 }}>
      <div class="hint-content">
        <span class="hint-icon">👄</span>
        <div class="hint-text">
          <strong>The Mirror (Phonetics):</strong>
          <p class="somatic-instruction">"Press tongue against upper teeth, then release with a burst of air."</p>
          
          <div class="phonetic-controls">
            <button class="speak-btn" onclick={handleSpeak}>
              <span>🔊</span> LISTEN
            </button>
            
            <button 
              class="record-btn" 
              class:recording={isRecording}
              onclick={toggleRecord}
            >
              <span class="record-icon">●</span>
              {isRecording ? 'LISTENING...' : 'PRACTICE'}
            </button>
          </div>

          {#if isRecording}
            <div class="voice-visualizer" in:slide>
              {#each Array(8) as _, i}
                <div class="bar" style="animation-delay: {i * 0.05}s"></div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      <div class="hint-arrow" style="left: 140px;"></div>
    </div>
  {/if}

  <!-- Pragmatic Analyzer Popover (The Discourse Architect) -->
  {#if pragmaticActive}
    <div class="hint-popover pragmatic-popover" transition:fly={{ y: 10, duration: 200 }}>
      <div class="hint-content">
        <span class="hint-icon">⚖️</span>
        <div class="hint-text">
          <strong>Discourse Architect:</strong>
          <div class="pragmatic-stats">
            <div class="stat">
              <span class="label">Tone:</span>
              <span class="value" class:warning={analysis.tone === 'Direct' || analysis.tone === 'Curt'}>{analysis.tone}</span>
            </div>
            <p class="advice">{analysis.advice}</p>
          </div>
        </div>
      </div>
      <div class="hint-arrow" style="left: 200px;"></div>
    </div>
  {/if}

  <div class="toolbar">
    <div class="tools-left">
      <button 
        class="tool-btn" 
        class:active={showHint} 
        onclick={toggleHint}
        title="Request Hint"
      >
        <span class="icon">💡</span>
        <span class="label">HINT</span>
      </button>
      <button 
        class="tool-btn" 
        class:active={pronunciationActive}
        onclick={togglePronunciation}
        title="Pronunciation Guide"
      >
        <span class="icon">👄</span>
        <span class="label">SPEAK</span>
      </button>
      <button 
        class="tool-btn" 
        class:active={pragmaticActive}
        onclick={togglePragmatic}
        title="Pragmatic Analysis"
      >
        <span class="icon">⚖️</span>
        <span class="label">ANALYZE</span>
      </button>
      <button 
        class="tool-btn" 
        class:active={translateActive}
        onclick={toggleTranslate}
        title="Translate"
      >
        <span class="icon">🌐</span>
        <span class="label">TRANSLATE</span>
        {#if translateActive}<span class="status-dot"></span>{/if}
      </button>
    </div>
    <div class="spacer"></div>
    <div class="status-indicator">
      <span class="dot"></span>
      SECURE CHANNEL
    </div>
  </div>

  <div class="input-area" class:has-content={value.length > 0}>
    <div class="textarea-container">
      <textarea
        bind:value
        placeholder="Enter command..."
        rows="1"
        onkeydown={handleKeydown}
        {disabled}
        class="console-input"
      ></textarea>
      <div class="focus-border"></div>
    </div>

    <button 
      class="send-btn"
      onclick={onSend}
      disabled={!value.trim() || disabled}
      aria-label="Send Message"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    </button>
  </div>
</div>

<style>
  .tactical-console {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    position: relative;
  }

  /* Hint Popover */
  .hint-popover {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 1rem;
    background: rgba(20, 20, 20, 0.9);
    backdrop-filter: blur(10px);
    border: 1px solid var(--color-accent);
    border-radius: 8px;
    padding: 1rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    z-index: 20;
  }

  .hint-content {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .hint-icon {
    font-size: 1.5rem;
  }

  .hint-text strong {
    display: block;
    color: var(--color-accent);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.25rem;
  }

  .hint-text p {
    margin: 0;
    font-size: 0.95rem;
    color: var(--color-text);
    line-height: 1.4;
  }

  .hint-arrow {
    position: absolute;
    bottom: -6px;
    left: 20px;
    width: 12px;
    height: 12px;
    background: rgba(20, 20, 20, 0.9);
    border-right: 1px solid var(--color-accent);
    border-bottom: 1px solid var(--color-accent);
    transform: rotate(45deg);
  }

  .toolbar {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0 0.5rem;
  }

  .tools-left {
    display: flex;
    gap: 0.5rem;
  }

  .tool-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--color-text-secondary);
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--font-mono);
    letter-spacing: 0.05em;
    position: relative;
  }

  .tool-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.1);
  }

  .tool-btn.active {
    border-color: var(--color-accent);
    color: #000;
    background: var(--color-accent);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: -2px;
    right: -2px;
    box-shadow: 0 0 5px #fff;
  }

  .spacer { flex: 1; }

  .status-indicator {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    color: var(--color-success-text);
    opacity: 0.8;
    letter-spacing: 0.1em;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 50%;
    box-shadow: 0 0 5px currentColor;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }

  .input-area {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 0.5rem;
    transition: all 0.3s ease;
  }

  .input-area:focus-within {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  }

  .textarea-container {
    flex: 1;
    position: relative;
    display: flex;
  }

  .console-input {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 1rem;
    padding: 0.75rem;
    resize: none;
    outline: none;
    min-height: 24px;
    max-height: 150px;
  }

  .console-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
    font-style: italic;
  }

  .send-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--color-accent);
    color: #000;
    transform: translateY(-1px);
    box-shadow: 0 0 15px rgba(var(--color-accent-rgb), 0.4);
  }

  .send-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .send-btn svg {
    transform: rotate(45deg);
    transition: transform 0.2s ease;
  }

  .send-btn:hover:not(:disabled) svg {
    transform: rotate(45deg) translate(2px, -2px);
  }

  /* Somatic Phonetics Styles */
  .somatic-popover {
    border-color: var(--color-info);
  }

  .somatic-instruction {
    font-style: italic;
    color: var(--color-text-secondary);
    margin-bottom: 0.75rem !important;
    border-left: 2px solid var(--color-info);
    padding-left: 0.5rem;
  }



  .speak-btn {
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-info);
    color: var(--color-info);
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .speak-btn:hover {
    background: var(--color-info);
    color: #000;
    transform: translateY(-1px);
    box-shadow: 0 0 10px rgba(var(--color-info-rgb), 0.3);
  }

  .phonetic-controls {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .record-btn {
    background: rgba(255, 0, 0, 0.1);
    border: 1px solid rgba(255, 0, 0, 0.3);
    color: #ff4444;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .record-btn:hover {
    background: rgba(255, 0, 0, 0.2);
    border-color: #ff4444;
  }

  .record-btn.recording {
    background: #ff4444;
    color: #fff;
    animation: pulse-red 1.5s infinite;
  }

  @keyframes pulse-red {
    0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
  }

  .voice-visualizer {
    display: flex;
    gap: 3px;
    align-items: center;
    height: 24px;
    margin-top: 0.75rem;
    padding: 0.25rem;
    background: rgba(0,0,0,0.3);
    border-radius: 4px;
    justify-content: center;
  }

  .voice-visualizer .bar {
    width: 3px;
    background: var(--color-accent);
    border-radius: 2px;
    animation: voice-wave 0.5s infinite ease-in-out alternate;
  }

  @keyframes voice-wave {
    0% { height: 4px; opacity: 0.5; }
    100% { height: 16px; opacity: 1; }
  }

  /* Pragmatic Analyzer Styles */
  .pragmatic-popover {
    border-color: var(--color-warning);
  }

  .pragmatic-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .stat .label {
    color: var(--color-text-secondary);
  }

  .stat .value {
    font-weight: 700;
    color: var(--color-success);
  }

  .stat .value.warning {
    color: var(--color-warning);
  }

  .advice {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    font-style: italic;
    margin: 0;
    border-left: 2px solid var(--color-warning);
    padding-left: 0.5rem;
  }
</style>
