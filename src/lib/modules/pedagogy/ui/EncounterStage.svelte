<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Button from '$lib/core/ui/Button.svelte';
  import SensoryFrame from './SensoryFrame.svelte';
  import ActionDeck from './ActionDeck.svelte';
  import { pedagogyState } from './pedagogyStore.svelte';

  interface Props {
    nodeId: string | null;
    onComplete: (data?: any) => void;
    onAbort: () => void;
    mode?: 'mission' | 'mentor';
  }

  let { nodeId, onComplete, onAbort, mode = 'mission' }: Props = $props();

  // Mock Data based on Node ID
  const mockScenarios: Record<string, any> = {
    '1': {
      title: 'Greeting Protocol',
      context: 'You arrive at the spaceport. A guard approaches.',
      image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1000&q=80', // Abstract futuristic
      initialMessage: 'State your business, traveler.'
    },
    '3': {
      title: 'Social Dynamics',
      context: 'A crowded marketplace. You need to find a guide.',
      image: 'https://images.unsplash.com/photo-1533158388470-9a56699990c6?auto=format&fit=crop&w=1000&q=80', // Cyberpunk street
      initialMessage: 'Hey! Watch where you are going!'
    }
  };

  // Mentor Mode Override
  const mentorScenario = {
    title: 'Mentorship Session',
    context: 'The Novice AI is ready to learn from your experience.',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80', // Network/Brain
    initialMessage: 'Mentor, I am struggling to understand this concept. Can you explain it to me simply?'
  };

  const scenario = mode === 'mentor' ? mentorScenario : (mockScenarios[nodeId || '1'] || mockScenarios['1']);
  
  // Entropy / Pulse Logic
  let entropyLevel = $derived(pedagogyState.missionConfig?.entropy || 0);
  let stability = $state(100);
  let pulseInterval: any;

  $effect(() => {
    if (entropyLevel > 0 && mode !== 'mentor') {
      // Higher entropy = faster decay
      const decayRate = 0.1 + (entropyLevel * 0.5); 
      
      pulseInterval = setInterval(() => {
        stability -= decayRate;
        if (stability <= 0) {
          stability = 0;
          clearInterval(pulseInterval);
          // Trigger Chaos Event (Mock)
          // In real app, this would inject a complication into the chat
        }
      }, 100);
    }

    return () => clearInterval(pulseInterval);
  });
</script>

<div class="encounter-stage" class:mentor-mode={mode === 'mentor'}>
  <!-- Layer 0: Sensory Context (Background) -->
  <div class="layer-background">
    <SensoryFrame 
      imageSrc={scenario.image} 
      contextText={scenario.context} 
    />
  </div>

  <!-- Layer 0.5: The Pulse (Entropy Vignette) -->
  {#if entropyLevel > 0 && mode !== 'mentor'}
    <div 
      class="entropy-pulse" 
      style="opacity: {(100 - stability) / 100 * 0.8}; animation-duration: {2 - (entropyLevel * 1.5)}s"
    ></div>
  {/if}

  <!-- Layer 1: Cinematic Bars & HUD -->
  <div class="layer-hud">
    <!-- Top Bar -->
    <header class="mission-header" in:fly={{ y: -20, duration: 500 }}>
      <div class="mission-info">
        <span class="mission-type">
          {#if mode === 'mentor'}
            THE PROTÉGÉ // TEACHING MODE
          {:else}
            Active Encounter // {Math.round(entropyLevel * 100)}% ENTROPY
            <span class="stability-meter" style="color: {stability < 30 ? 'var(--color-error)' : 'var(--color-accent)'}">
              [{Math.round(stability)}% STABLE]
            </span>
          {/if}
        </span>
        <div class="title-row">
          <h2 class="mission-title">{scenario.title}</h2>
          <!-- Audio Viz (Moved here to avoid overlap) -->
          <div class="audio-viz">
            {#each Array(10) as _, i}
              <div class="bar" style="animation-delay: {i * 0.1}s"></div>
            {/each}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onclick={onAbort} class="abort-btn">ABORT</Button>
    </header>

    <!-- Center/Bottom: Action Deck -->
    <div class="action-container" in:fly={{ y: 50, duration: 500, delay: 200 }}>
      <ActionDeck 
        initialMessage={scenario.initialMessage} 
        onMissionComplete={onComplete}
        initialMode={mode === 'mentor' ? 'mentor' : 'chat'}
      />
    </div>
  </div>
</div>

<style>
  .encounter-stage {
    width: 100%;
    height: 100%;
    position: relative;
    background: #000;
    overflow: hidden;
  }

  .layer-background {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .entropy-pulse {
    position: absolute;
    inset: 0;
    z-index: 5;
    background: radial-gradient(circle, transparent 40%, var(--color-error) 100%);
    pointer-events: none;
    mix-blend-mode: overlay;
    animation: pulse-vignette infinite ease-in-out;
  }

  @keyframes pulse-vignette {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }

  .layer-hud {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none; /* Let clicks pass through to background if needed */
  }

  .mission-header {
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
    pointer-events: auto;
  }

  .mission-info {
    display: flex;
    flex-direction: column;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  }

  .mission-type {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--color-accent);
    font-family: var(--font-mono);
    margin-bottom: 0.25rem;
    display: flex;
    gap: 1rem;
  }

  .stability-meter {
    font-weight: 700;
    transition: color 0.3s ease;
  }

  .mission-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: #fff;
    letter-spacing: 0.05em;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .audio-viz {
    display: flex;
    gap: 3px;
    align-items: flex-end;
    height: 20px;
    opacity: 0.8;
  }

  .bar {
    width: 3px;
    background: var(--color-accent);
    border-radius: 2px;
    animation: bounce 1s infinite ease-in-out;
    box-shadow: 0 0 5px var(--color-accent);
  }

  @keyframes bounce {
    0%, 100% { height: 4px; opacity: 0.5; }
    50% { height: 20px; opacity: 1; }
  }

  /* Action Container - Floating HUD */
  .action-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    padding-bottom: 2rem;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 85%; /* Increased from 60% to allow more chat history */
  }

  :global(.abort-btn) {
    background: rgba(0,0,0,0.5) !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
    color: rgba(255,255,255,0.8) !important;
  }

  :global(.abort-btn:hover) {
    background: rgba(255,0,0,0.2) !important;
    border-color: rgba(255,0,0,0.5) !important;
    color: #fff !important;
  }

  @media (max-width: 768px) {
    .mission-header {
      padding: 1rem;
      padding-top: max(1rem, env(safe-area-inset-top));
    }

    .action-container {
      padding: 1rem;
      padding-bottom: env(safe-area-inset-bottom);
      height: 70%;
    }
  }
</style>
