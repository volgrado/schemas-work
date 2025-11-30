<script lang="ts">
  import { fade, fly, slide } from 'svelte/transition';
  import Button from '$lib/core/ui/Button.svelte';
  import Modal from '$lib/core/ui/Modal.svelte';
  import { type MissionConfig } from './pedagogyStore.svelte';

  interface Props {
    nodeId: string;
    onClose: () => void;
    onEngage: (config: MissionConfig) => void;
  }

  let { nodeId, onClose, onEngage }: Props = $props();

  // Mock Data - In a real app, this would be fetched based on nodeId
  const missionData = {
    title: "Negotiate a Treaty",
    chapter: "VI: The Inner Game",
    context: {
      role: "Ambassador",
      scenario: "Diplomatic Reception",
      location: "Neo-Tokyo Embassy"
    },
    objectives: [
      "Secure the trade deal without offending the host.",
      "Use the 'Usted' form for all diplomatic interactions.",
      "Identify the hidden agenda of the rival delegate."
    ]
  };

  // State
  let step = $state(0);
  let config = $state<MissionConfig>({
    entropy: 0.5,
    guidance: 'implicit',
    intention: ''
  });
  
  // Ignition Button State
  let isHolding = $state(false);
  let holdProgress = $state(0);
  let holdInterval: any;

  function nextStep() {
    step++;
  }

  function prevStep() {
    step--;
  }

  function startHold() {
    isHolding = true;
    holdProgress = 0;
    holdInterval = setInterval(() => {
      holdProgress += 2; // 50 ticks * 2% = 100% in ~1s (adjust interval)
      if (holdProgress >= 100) {
        completeHold();
      }
    }, 30); // 30ms * 50 = 1.5s hold time
  }

  function stopHold() {
    isHolding = false;
    holdProgress = 0;
    clearInterval(holdInterval);
  }

  function completeHold() {
    clearInterval(holdInterval);
    onEngage(config);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (step < 3) nextStep();
    }
  }
</script>

<Modal show={true} {onClose} title={missionData.title} width="default" alignment="top">
  <div class="briefing-wizard">
    <!-- Progress Indicator -->
    <div class="wizard-progress">
      {#each [0, 1, 2, 3] as s}
        <div class="dot" class:active={s <= step}></div>
        {#if s < 3}<div class="line" class:active={s < step}></div>{/if}
      {/each}
    </div>

    <div class="step-container">
      {#if step === 0}
        <div class="step briefing" in:fly={{ x: 20, duration: 300 }}>

          <div class="briefing-meta">
            <div class="status-badge">Mission Available</div>
            <div class="context-pill">
              <span class="role">{missionData.context.role}</span>
              <span class="separator">@</span>
              <span class="location">{missionData.context.location}</span>
            </div>
          </div>

          <div class="content-body">
            <section class="scenario-sector">
              <h2>Scenario Protocol</h2>
              <p class="scenario-desc">
                You are attending a high-stakes <strong>{missionData.context.scenario}</strong>. 
                Your goal is to navigate the social hierarchy and establish a secure alliance.
              </p>
            </section>

            <section class="objectives-sector">
              <h2>Mission Objectives</h2>
              <div class="objective-list">
                {#each missionData.objectives as objective, i}
                  <div class="objective-item">
                    <div class="checkbox"></div>
                    <span class="text">{objective}</span>
                  </div>
                {/each}
              </div>
            </section>
          </div>
        </div>

      {:else if step === 1}
        <div class="step calibration" in:fly={{ x: 20, duration: 300 }}>
          <header>
            <h1>System Calibration</h1>
            <p class="subtitle">Tune the simulation parameters.</p>
          </header>

          <div class="controls">
            <div class="control-group">
              <label for="entropy">
                <span>Entropy (Chaos)</span>
                <span class="value">{Math.round(config.entropy * 100)}%</span>
              </label>
              <input 
                id="entropy" 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                bind:value={config.entropy} 
              />
              <p class="desc">
                {#if config.entropy < 0.3}
                  Stable environment. Predictable responses.
                {:else if config.entropy < 0.7}
                  Standard variance. Occasional surprises.
                {:else}
                  High volatility. Expect non-sequiturs and interruptions.
                {/if}
              </p>
            </div>

            <div class="control-group">
              <label for="guidance">Guidance System</label>
              <div class="toggle-group">
                <button 
                  class:active={config.guidance === 'explicit'} 
                  onclick={() => config.guidance = 'explicit'}
                >
                  Explicit (Teacher)
                </button>
                <button 
                  class:active={config.guidance === 'implicit'} 
                  onclick={() => config.guidance = 'implicit'}
                >
                  Implicit (Immersion)
                </button>
              </div>
              <p class="desc">
                {config.guidance === 'explicit' 
                  ? "System will provide direct corrections and grammatical explanations." 
                  : "System will use recasts and natural feedback only."}
              </p>
            </div>
          </div>
        </div>

      {:else if step === 2}
        <div class="step intention" in:fly={{ x: 20, duration: 300 }}>
          <header>
            <h1>The Vow</h1>
            <p class="subtitle">Set your sovereign intent for this session.</p>
          </header>

          <div class="input-area">
            <textarea
              bind:value={config.intention}
              placeholder="e.g., I will not revert to English, even when stuck..."
              rows="4"
              onkeydown={handleKeydown}
            ></textarea>
            <div class="hint">Metacognition active. Define your success criteria.</div>
          </div>
        </div>

      {:else if step === 3}
        <div class="step ignition" in:fly={{ x: 20, duration: 300 }}>
          <header>
            <h1>Ignition Sequence</h1>
            <p class="subtitle">Prepare for neural interface.</p>
          </header>

          <div class="summary-card">
            <div class="row">
              <span class="label">Mission</span>
              <span class="val">{missionData.title}</span>
            </div>
            <div class="row">
              <span class="label">Entropy</span>
              <span class="val">{Math.round(config.entropy * 100)}%</span>
            </div>
            <div class="row">
              <span class="label">Guidance</span>
              <span class="val">{config.guidance}</span>
            </div>
            <div class="row intention-row">
              <span class="label">Vow</span>
              <span class="val">"{config.intention || 'Silent Resolve'}"</span>
            </div>
          </div>

          <div class="ignition-btn-wrapper">
            <button 
              class="ignition-btn"
              onmousedown={startHold}
              onmouseup={stopHold}
              onmouseleave={stopHold}
              ontouchstart={startHold}
              ontouchend={stopHold}
            >
              <div class="progress-ring" style="--progress: {holdProgress}%"></div>
              <span class="btn-text">{isHolding ? 'HOLD...' : 'ENGAGE'}</span>
            </button>
          </div>
        </div>
      {/if}
    </div>

    <footer class="wizard-actions">
      {#if step > 0}
        <Button variant="ghost" onclick={prevStep}>Back</Button>
      {:else}
        <Button variant="ghost" onclick={onClose}>Abort</Button>
      {/if}

      {#if step < 3}
        <Button variant="primary" onclick={nextStep}>
          {step === 0 ? 'Accept Mission' : 'Next'}
        </Button>
      {/if}
    </footer>
  </div>
</Modal>

<style>
  .briefing-wizard {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 450px;
  }

  .wizard-progress {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
  }

  .dot.active {
    background: var(--color-accent);
    box-shadow: 0 0 10px var(--color-accent);
  }

  .line {
    width: 30px;
    height: 2px;
    background: rgba(255, 255, 255, 0.1);
  }

  .line.active {
    background: var(--color-accent);
  }

  .step-container {
    flex: 1;
    position: relative;
  }

  .step {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  /* Header Styles */
  .briefing-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  h1 {
    font-size: 2rem;
    margin: 0;
    color: var(--color-text);
    font-weight: 700;
    text-shadow: 0 0 20px rgba(var(--color-accent-rgb), 0.5);
  }

  .subtitle {
    color: var(--color-text-secondary);
    margin-top: 0.5rem;
  }

  /* Briefing Specific */
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: rgba(var(--color-accent-rgb), 0.1);
    color: var(--color-accent);
    border: 1px solid rgba(var(--color-accent-rgb), 0.3);
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
    box-shadow: 0 0 10px rgba(var(--color-accent-rgb), 0.2);
  }

  .context-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.5rem 1rem;
    border-radius: 100px;
    margin-top: 1rem;
    font-size: 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .role { color: var(--color-accent); font-weight: 600; }
  .separator { color: var(--color-text-secondary); opacity: 0.5; }
  .location { color: var(--color-text); }

  .content-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.5rem;
  }

  .scenario-desc {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--color-text);
  }

  strong { color: var(--color-accent); font-weight: 600; }

  .objective-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .objective-item {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    background: rgba(255, 255, 255, 0.03);
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .checkbox {
    width: 20px;
    height: 20px;
    border: 1px solid var(--color-accent);
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 2px;
    opacity: 0.5;
  }

  /* Calibration Specific */
  .controls {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    color: var(--color-text);
  }

  .value { color: var(--color-accent); }

  input[type="range"] {
    width: 100%;
    accent-color: var(--color-accent);
  }

  .desc {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin-top: 0.5rem;
  }

  .toggle-group {
    display: flex;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 4px;
  }

  .toggle-group button {
    flex: 1;
    background: transparent;
    border: none;
    padding: 0.75rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .toggle-group button.active {
    background: var(--color-accent);
    color: #000;
    font-weight: 600;
  }

  /* Intention Specific */
  .input-area {
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
  }

  textarea {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    color: var(--color-text);
    font-size: 1.1rem;
    resize: none;
    font-family: inherit;
  }

  textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 15px rgba(var(--color-accent-rgb), 0.2);
  }

  .hint {
    margin-top: 1rem;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    text-align: center;
  }

  /* Ignition Specific */
  .summary-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
  }

  .row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .row:last-child { border-bottom: none; }

  .label { color: var(--color-text-secondary); }
  .val { color: var(--color-text); font-weight: 600; }

  .intention-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .intention-row .val {
    font-style: italic;
    color: var(--color-accent);
  }

  .ignition-btn-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
  }

  .ignition-btn {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: rgba(var(--color-accent-rgb), 0.1);
    border: 2px solid var(--color-accent);
    color: var(--color-accent);
    font-weight: 800;
    font-size: 1.2rem;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ignition-btn:hover {
    box-shadow: 0 0 30px rgba(var(--color-accent-rgb), 0.4);
    transform: scale(1.05);
  }

  .ignition-btn:active {
    transform: scale(0.95);
  }

  .progress-ring {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: var(--progress);
    background: var(--color-accent);
    opacity: 0.3;
    transition: height 0.1s linear;
  }

  .btn-text {
    position: relative;
    z-index: 1;
    letter-spacing: 0.1em;
  }

  .wizard-actions {
    display: flex;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>
