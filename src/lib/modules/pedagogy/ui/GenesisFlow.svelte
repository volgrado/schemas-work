<script lang="ts">
  import { fade } from 'svelte/transition';
  import ManifestoForm, { type ManifestoData } from './ManifestoForm.svelte';
  import EvaluationMatrix from './EvaluationMatrix.svelte';
  import CurriculumReveal from './CurriculumReveal.svelte';

  interface Props {
    onComplete: (data: ManifestoData) => void;
    onCancel?: () => void;
  }

  let { onComplete, onCancel }: Props = $props();

  type State = 'MANIFESTO' | 'CALIBRATION' | 'REVEAL';
  let currentState = $state<State>('MANIFESTO');
  let manifestoData = $state<ManifestoData | null>(null);

  function handleManifestoComplete(data: ManifestoData) {
    manifestoData = data;
    currentState = 'CALIBRATION';
  }

  function handleCalibrationComplete() {
    currentState = 'REVEAL';
  }
</script>

<div class="genesis-flow">
  {#if currentState === 'MANIFESTO'}
    <div class="stage-wrapper" in:fade>
      {#if onCancel}
        <button class="cancel-btn" onclick={onCancel} in:fade>
          ✕ Cancel Protocol
        </button>
      {/if}
      <ManifestoForm onComplete={handleManifestoComplete} />
    </div>
  {:else if currentState === 'CALIBRATION'}
    <div class="stage-wrapper" in:fade>
      <EvaluationMatrix 
        data={manifestoData} 
        onComplete={handleCalibrationComplete} 
      />
    </div>
  {:else if currentState === 'REVEAL'}
    <div class="stage-wrapper" in:fade>
      <CurriculumReveal data={manifestoData} onComplete={() => onComplete(manifestoData!)} />
    </div>
  {/if}
</div>

<style>
  .genesis-flow {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .stage-wrapper {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
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
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
</style>
