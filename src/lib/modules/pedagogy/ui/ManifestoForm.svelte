<script lang="ts">
  import { fade, fly, slide } from 'svelte/transition';
  import { onMount } from 'svelte';

  interface Props {
    onComplete: (data: ManifestoData) => void;
  }

  export interface ManifestoData {
    intent: string;       // Chapter VI: Autonomy
    beliefState: string;  // Chapter I: Active Inference
    vessel: string[];     // Chapter IV: Embodiment (Time, Energy, Focus)
    ecosystem: string;    // Chapter V: Social Context
    language: string;     // Target Language (e.g., 'es', 'jp')
  }

  let { onComplete }: Props = $props();

  let step = $state(0);
  let data = $state<ManifestoData>({
    intent: '',
    beliefState: '',
    vessel: [],
    ecosystem: '',
    language: ''
  });

  // Step Definitions based on Manifesto Chapters
  const steps = [
    {
      id: 'language',
      chapter: '0',
      title: 'Target Protocol',
      subtitle: 'The Signal',
      prompt: 'Which linguistic code do you wish to internalize?',
      options: [
        { value: 'es', label: 'Spanish (Español)' },
        { value: 'jp', label: 'Japanese (日本語)' },
        { value: 'fr', label: 'French (Français)' },
        { value: 'de', label: 'German (Deutsch)' }
      ],
      type: 'select'
    },
    {
      id: 'intent',
      chapter: 'VI',
      title: 'Sovereign Intent',
      subtitle: 'Autonomy',
      prompt: 'What is your Mission? Not just "learn Spanish," but the act you must perform.',
      placeholder: 'e.g., Negotiate a treaty, Survive in Tokyo, Read Dante in original...',
      type: 'text'
    },
    {
      id: 'belief',
      chapter: 'I',
      title: 'Belief State',
      subtitle: 'Active Inference',
      prompt: 'Calibrate your current model. How much entropy (uncertainty) exists in your current knowledge?',
      options: [
        { value: 'high_entropy', label: 'High Entropy (Beginner / Chaos)' },
        { value: 'forming_priors', label: 'Forming Priors (Intermediate / Structure)' },
        { value: 'low_entropy', label: 'Low Entropy (Advanced / Refinement)' }
      ],
      type: 'select'
    },
    {
      id: 'vessel',
      chapter: 'IV',
      title: 'The Vessel',
      subtitle: 'Embodiment',
      prompt: 'Assess your capacity. What constraints bind the "Brain in a Body"?',
      options: [
        { value: 'time_scarce', label: 'Time Scarce (< 15m/day)' },
        { value: 'energy_low', label: 'Low Energy (Passive Input)' },
        { value: 'focus_deep', label: 'Deep Focus Available' },
        { value: 'somatic_active', label: 'Somatic/Active Learner' }
      ],
      type: 'multi-select'
    },
    {
      id: 'ecosystem',
      chapter: 'V',
      title: 'The Ecosystem',
      subtitle: 'Social Context',
      prompt: 'Define your Tribe. Where will you be a "Legitimate Peripheral Participant"?',
      placeholder: 'e.g., Corporate Boardroom, Street Market, Academic Conference...',
      type: 'text'
    }
  ];

  function nextStep() {
    if (step < steps.length - 1) {
      step++;
    } else {
      onComplete(data);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      nextStep();
    }
  }

  function toggleVessel(value: string) {
    if (data.vessel.includes(value)) {
      data.vessel = data.vessel.filter(v => v !== value);
    } else {
      data.vessel = [...data.vessel, value];
    }
  }
</script>

<div class="manifesto-form" in:fade>
  <div class="progress-bar">
    <div class="progress" style="width: {(step + 1) / steps.length * 100}%"></div>
  </div>

  <div class="chapter-indicator">
    <span class="chapter-num">Chapter {steps[step].chapter}</span>
    <span class="chapter-title">{steps[step].subtitle}</span>
  </div>

  {#key step}
    <div class="step-content" in:fly={{ y: 20, duration: 500 }}>
      <h1>{steps[step].title}</h1>
      <p class="prompt">{steps[step].prompt}</p>
  
      {#if steps[step].type === 'text'}
        <div class="input-wrapper">
          <input
            type="text"
            bind:value={data[steps[step].id as keyof ManifestoData] as string}
            placeholder={steps[step].placeholder}
            onkeydown={handleKeydown}
          />
          <div class="hint">Press Cmd+Enter to confirm</div>
        </div>
    {:else if steps[step].type === 'select'}
      <div class="options-grid">
        {#each steps[step].options as option}
          <button
            class="option-card"
            class:selected={data[steps[step].id as keyof ManifestoData] === option.value}
            onclick={() => {
              // @ts-ignore - Dynamic key access
              data[steps[step].id] = option.value;
              setTimeout(nextStep, 300);
            }}
          >
            {option.label}
          </button>
        {/each}
      </div>
    {:else if steps[step].type === 'multi-select'}
      <div class="options-grid">
        {#each steps[step].options as option}
          <button
            class="option-card"
            class:selected={data.vessel.includes(option.value)}
            onclick={() => toggleVessel(option.value)}
          >
            <div class="checkbox">{data.vessel.includes(option.value) ? '✓' : ''}</div>
            {option.label}
          </button>
        {/each}
      </div>
      <button class="continue-btn" onclick={nextStep}>Confirm Selection</button>
    {/if}
    </div>
  {/key}
</div>

<style>
  .manifesto-form {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
    color: var(--color-text);
  }

  .progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
  }

  .progress {
    height: 100%;
    background: var(--color-accent);
    transition: width 0.5s ease;
    box-shadow: 0 0 10px var(--color-accent);
  }

  .chapter-indicator {
    position: absolute;
    top: 2rem;
    left: 2rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    opacity: 0.7;
  }

  .chapter-num {
    font-weight: bold;
    color: var(--color-accent);
    margin-right: 0.5rem;
  }

  .step-content {
    width: 100%;
    text-align: center;
  }

  h1 {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
    background: linear-gradient(to right, #fff, #94a3b8);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .prompt {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin-bottom: 3rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .input-wrapper {
    position: relative;
    max-width: 600px;
    margin: 0 auto;
  }

  input {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
    font-size: 1.5rem;
    color: var(--color-text);
    padding: 1rem 0;
    text-align: center;
    transition: all 0.3s ease;
  }

  input:focus {
    outline: none;
    border-bottom-color: var(--color-accent);
    box-shadow: 0 4px 20px -10px var(--color-accent);
  }

  .hint {
    margin-top: 1rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    opacity: 0.6;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .option-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1.5rem;
    border-radius: 12px;
    color: var(--color-text);
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .option-card:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .option-card.selected {
    background: rgba(var(--color-accent-rgb), 0.2);
    border-color: var(--color-accent);
    box-shadow: 0 0 15px rgba(var(--color-accent-rgb), 0.3);
  }

  .checkbox {
    width: 20px;
    height: 20px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    color: var(--color-accent);
  }

  .option-card.selected .checkbox {
    border-color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.2);
  }

  .continue-btn {
    margin-top: 2rem;
    background: var(--color-accent);
    color: #000;
    border: none;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .continue-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(var(--color-accent-rgb), 0.5);
  }
</style>
