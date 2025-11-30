<script lang="ts">
  import { fade, fly, slide } from 'svelte/transition';
  import CurriculumReveal from './CurriculumReveal.svelte';
  import { AiCurriculumGenerator } from '../curriculum/aiCurriculumGenerator';
  import type { Scenario } from '../domain/models';
  import Spinner from '$lib/core/ui/Spinner.svelte';
  import Button from '$lib/core/ui/Button.svelte';

  interface Props {
    onComplete: (data: any, scenario?: Scenario | null) => void;
    onCancel?: () => void;
  }

  let { onComplete, onCancel }: Props = $props();

  type State = 'INPUT' | 'GENERATING' | 'REVEAL';
  let currentState = $state<State>('INPUT');
  
  // Input State
  let targetLang = $state('es');
  let baseLang = $state('en');
  let mode = $state<'standard' | 'custom'>('standard');
  let customPrompt = $state('');
  
  // Generation State
  let generatedScenario = $state<Scenario | null>(null);
  let generationError = $state<string | null>(null);
  let generationLogs = $state<string[]>([]);

  const languages = [
    { value: 'es', label: 'Spanish' },
    { value: 'jp', label: 'Japanese' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'zh', label: 'Chinese (Mandarin)' },
    { value: 'ru', label: 'Russian' }
  ];

  async function handleGenerate() {
    currentState = 'GENERATING';
    generationError = null;
    generationLogs = [];
    
    try {
      const generator = new AiCurriculumGenerator();
      generationLogs = [...generationLogs, `Initializing ${mode} protocol for ${targetLang}...`];

      if (mode === 'standard') {
        generatedScenario = await generator.generateStandardCurriculum(targetLang, baseLang);
      } else {
        generatedScenario = await generator.generateCustomCurriculum(customPrompt, targetLang, baseLang);
      }
      
      currentState = 'REVEAL';
    } catch (e: any) {
      console.error("Curriculum Generation Failed:", e);
      generationError = e.message || "Failed to generate protocol.";
      generationLogs = [...generationLogs, `Error: ${e.message}`];
    }
  }

  function getManifestoData() {
    return {
      intent: mode === 'standard' ? `Mastery of ${targetLang}` : customPrompt,
      beliefState: 'forming_priors', // Default
      vessel: ['time_scarce'], // Default
      ecosystem: 'General',
      language: targetLang
    };
  }
</script>

<div class="genesis-flow">
  {#if currentState === 'INPUT'}
    <div class="stage-wrapper center-content" in:fade>
      {#if onCancel}
        <button class="cancel-btn" onclick={onCancel} in:fade>
          ✕ Cancel
        </button>
      {/if}
      
      <div class="input-card" in:fly={{ y: 20, duration: 500 }}>
        <header>
          <h1>Initialize Protocol</h1>
          <p>Define the parameters for your new learning path.</p>
        </header>

        <div class="form-group">
          <label for="target-lang">Target Language</label>
          <select id="target-lang" bind:value={targetLang}>
            {#each languages as lang}
              <option value={lang.value}>{lang.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="base-lang">Base Language</label>
          <select id="base-lang" bind:value={baseLang}>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <!-- Add more if needed -->
          </select>
        </div>

        <div class="form-group">
          <span class="label-text">Protocol Mode</span>
          <div class="mode-toggle" role="group" aria-label="Protocol Mode">
            <button 
              class:active={mode === 'standard'} 
              onclick={() => mode = 'standard'}
            >
              Standard (CEFR A1-C2)
            </button>
            <button 
              class:active={mode === 'custom'} 
              onclick={() => mode = 'custom'}
            >
              Custom Focus
            </button>
          </div>
        </div>


        {#if mode === 'custom'}
          <div class="form-group" in:slide>
            <label for="custom-prompt">Focus / Intent</label>
            <textarea 
              id="custom-prompt" 
              bind:value={customPrompt} 
              placeholder="e.g., Business negotiation, Medical terminology, Travel survival..."
              rows="3"
            ></textarea>
          </div>
        {/if}

        <div class="actions">
          <Button 
            variant="primary" 
            size="lg" 
            onclick={handleGenerate}
            disabled={mode === 'custom' && !customPrompt.trim()}
          >
            Generate Protocol
          </Button>
        </div>
      </div>
    </div>

  {:else if currentState === 'GENERATING'}
    <div class="stage-wrapper center-content" in:fade>
      <div class="loading-container">
        <Spinner size="lg" />
        <h2>Forging Protocol...</h2>
        <div class="logs-container">
          {#each generationLogs as log}
            <p class="log-entry" in:fade={{ duration: 200 }}>{log}</p>
          {/each}
        </div>
        {#if generationError}
          <div class="error-msg">
            <p>Error: {generationError}</p>
            <button onclick={() => currentState = 'INPUT'}>Retry</button>
          </div>
        {/if}
      </div>
    </div>

  {:else if currentState === 'REVEAL'}
    <div class="stage-wrapper" in:fade>
      <CurriculumReveal 
        data={getManifestoData()} 
        scenario={generatedScenario}
        onComplete={() => onComplete(getManifestoData(), generatedScenario)} 
      />
    </div>
  {/if}
</div>

<style>
  .genesis-flow {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: var(--color-background);
  }

  .stage-wrapper {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
  
  .center-content {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
  }

  .input-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 2.5rem;
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    box-shadow: var(--shadow-xl);
  }

  header {
    text-align: center;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--color-text-secondary);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
  }

  select, textarea {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 1rem;
    font-family: var(--font-main);
  }

  select:focus, textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
  }

  .mode-toggle {
    display: flex;
    gap: 0.5rem;
    background: var(--color-background);
    padding: 0.25rem;
    border-radius: 8px;
    border: 1px solid var(--color-border);
  }

  .mode-toggle button {
    flex: 1;
    background: transparent;
    border: none;
    padding: 0.5rem;
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .mode-toggle button.active {
    background: var(--color-surface-hover);
    color: var(--color-text);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }

  .actions {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
  }

  .loading-container {
    text-align: center;
    color: var(--color-text);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .loading-container h2 {
    font-size: 2rem;
    margin: 0;
  }
  
  .logs-container {
    margin-top: 1rem;
    height: 150px;
    overflow-y: auto;
    width: 100%;
    max-width: 400px;
    background: rgba(0,0,0,0.2);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    text-align: left;
  }

  .log-entry {
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    color: var(--color-accent);
    opacity: 0.8;
    margin: 0;
  }
  
  .error-msg {
    color: var(--color-danger);
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .error-msg button {
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .cancel-btn {
    position: absolute;
    top: 2rem;
    left: 2rem;
    z-index: 100;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 100px;
    border: 1px solid var(--color-border);
    transition: all 0.2s;
  }

  .cancel-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }
</style>
