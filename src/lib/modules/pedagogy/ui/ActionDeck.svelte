<!--
  @component
  ActionDeck
  
  The main interaction area for the mission.
  Handles chat history, "Hold to Act", and "The Fork" (Decision Points).
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Button from '$lib/core/ui/Button.svelte';
  import ChatMessage from './ChatMessage.svelte';
  import TacticalConsole from './TacticalConsole.svelte';
  import StanceCard from './StanceCard.svelte';

  interface Props {
    initialMessage: string;
    onMissionComplete: (data?: any) => void;
    initialMode?: 'chat' | 'choice' | 'mentor';
  }

  let { initialMessage, onMissionComplete, initialMode = 'chat' }: Props = $props();

  let messages = $state([{ role: 'system', content: initialMessage }]);
  let userResponse = $state("");
  let isThinking = $state(false);
  let chatContainer: HTMLDivElement;
  
  // The Fork (Decision Mode) & The Protégé (Mentor Mode)
  let mode = $state<'chat' | 'choice' | 'mentor' | 'crystallize'>(initialMode);
  let choices = $state([
    { id: '1', title: 'Confront', description: 'Challenge the guard directly.', icon: '⚔️', risk: 'high' as const },
    { id: '2', title: 'Negotiate', description: 'Attempt to bribe or persuade.', icon: '🤝', risk: 'medium' as const },
    { id: '3', title: 'Deceive', description: 'Use a fake ID and cover story.', icon: '🕵️', risk: 'low' as const }
  ]);

  // Mentor Mode: Crystallized Knowledge
  let crystallizedData = $state<string[]>([
    "1. Politeness requires the subjunctive mood.",
    "2. Tone conveys authority or submission.",
    "3. Context determines the appropriate register."
  ]);

  async function handleSend() {
    if (!userResponse.trim()) return;

    // User Message
    messages = [...messages, { role: 'user', content: userResponse }];
    const input = userResponse;
    userResponse = "";
    
    await tick();
    scrollToBottom();

    // Mock AI Response
    isThinking = true;
    setTimeout(() => {
      isThinking = false;
      
      if (mode === 'mentor') {
        // Mentor Mode Logic (The Protégé)
        if (messages.length < 4) {
          messages = [...messages, { role: 'system', content: "Oh, I think I understand! But what happens if the context changes? Can you give me an example?" }];
        } else {
          messages = [...messages, { role: 'system', content: "I see! I have synthesized your teachings. Please verify my understanding." }];
          mode = 'crystallize';
        }
      } else {
        // Standard Encounter Logic
        // Trigger "The Fork" after specific input (Mock)
        if (input.toLowerCase().includes('wait')) {
          messages = [...messages, { role: 'system', content: "CRITICAL JUNCTION REACHED. Select your stance." }];
          mode = 'choice';
        } else {
          messages = [...messages, { role: 'system', content: `I acknowledge: "${input}". Proceeding with protocol.` }];
          
          // Auto-complete demo after 4 turns
          if (messages.length > 6) {
            setTimeout(onMissionComplete, 1500);
          }
        }
      }
      scrollToBottom();
    }, 1000);
  }

  function handleChoiceSelect(choice: any) {
    mode = 'chat';
    messages = [...messages, { role: 'user', content: `[PROTOCOL: ${choice.title.toUpperCase()}]` }];
    scrollToBottom();
    
    isThinking = true;
    setTimeout(() => {
      isThinking = false;
      messages = [...messages, { role: 'system', content: `Stance confirmed. Executing ${choice.title} protocol...` }];
      scrollToBottom();
    }, 1000);
  }

  function handleCrystallizeConfirm() {
    messages = [...messages, { role: 'system', content: "Knowledge crystallized. Synaptic weights updated. Thank you, Mentor." }];
    scrollToBottom();
    setTimeout(() => onMissionComplete({ protegeTakeaways: crystallizedData }), 1500);
  }

  function scrollToBottom() {
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // TPR Interaction (Hold to Act)
  let tprActive = $state(false);
  let holdProgress = $state(0);
  let holdInterval: any;
  let isComplete = $state(false);

  function startHold() {
    if (isComplete || mode === 'choice') return;
    tprActive = true;
    holdProgress = 0;
    
    // 1.5s to complete (30ms * 50 ticks)
    holdInterval = setInterval(() => {
      holdProgress += 2;
      
      // Haptic feedback simulation (vibrate if available)
      if (navigator.vibrate && holdProgress % 20 === 0) {
        navigator.vibrate(10);
      }

      if (holdProgress >= 100) {
        completeHold();
      }
    }, 30);
  }

  function stopHold() {
    if (isComplete) return;
    tprActive = false;
    holdProgress = 0;
    clearInterval(holdInterval);
  }

  function completeHold() {
    clearInterval(holdInterval);
    isComplete = true;
    tprActive = false;
    
    if (navigator.vibrate) navigator.vibrate(50);

    // Trigger Action
    setTimeout(() => {
      messages = [...messages, { role: 'system', content: "Physical action confirmed. Synaptic reinforcement complete." }];
      scrollToBottom();
      
      // Reset after delay
      setTimeout(() => {
        isComplete = false;
        holdProgress = 0;
      }, 2000);
    }, 500);
  }
</script>

<div class="action-deck-hud">
  <!-- Chat History (Floating above) -->
  <div class="chat-history" bind:this={chatContainer}>
    <div class="fade-overlay"></div>
    {#each messages as msg}
      <ChatMessage role={msg.role as any} content={msg.content} />
    {/each}
    {#if isThinking}
      <ChatMessage role="system" content="" isThinking={true} />
    {/if}
  </div>

  <!-- Interaction Zone (Glass Panel) -->
  <div class="interaction-hud">
    
    {#if mode === 'choice'}
      <!-- The Fork (Decision Cards) -->
      <div class="fork-overlay" in:fade={{ duration: 200 }}>
        <div class="cards-container">
          {#each choices as choice, i}
            <div in:fly={{ y: 20, delay: i * 100 }}>
              <StanceCard 
                title={choice.title}
                description={choice.description}
                icon={choice.icon}
                risk={choice.risk}
                onSelect={() => handleChoiceSelect(choice)}
              />
            </div>
          {/each}
        </div>
      </div>
    {:else if mode === 'crystallize'}
      <!-- The Protégé: Crystallization Card -->
      <div class="crystallize-overlay" in:fade={{ duration: 200 }}>
        <div class="crystallize-card">
          <div class="card-header">
            <span class="icon">💎</span>
            <h3>Crystallized Knowledge</h3>
          </div>
          <ul class="takeaways-list">
            {#each crystallizedData as point}
              <li>{point}</li>
            {/each}
          </ul>
          <Button variant="primary" onclick={handleCrystallizeConfirm} class="confirm-btn">
            Verify & Seal
          </Button>
        </div>
      </div>
    {:else}
      <!-- Standard Chat & TPR -->
      <div class="standard-controls" in:fade={{ duration: 200 }}>
        <!-- TPR Area (Total Physical Response) -->
        <div class="tpr-area">
          <button 
            class="tpr-button" 
            class:active={tprActive}
            class:complete={isComplete}
            onmousedown={startHold}
            onmouseup={stopHold}
            onmouseleave={stopHold}
            ontouchstart={startHold}
            ontouchend={stopHold}
          >
            <!-- Progress Ring Background -->
            <div class="progress-bg" style="width: {holdProgress}%"></div>

            <div class="tpr-inner">
              <span class="tpr-icon">{isComplete ? '✓' : '✋'}</span>
              <span class="tpr-label">
                {isComplete ? 'ACTION EXECUTED' : (tprActive ? 'HOLDING...' : 'HOLD TO ACT')}
              </span>
            </div>
            
            {#if tprActive && !isComplete}
              <div class="tpr-glow"></div>
            {/if}
          </button>
        </div>

        <!-- Input Console -->
        <div class="console-wrapper">
          <TacticalConsole 
            bind:value={userResponse} 
            onSend={handleSend}
            disabled={isThinking}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .action-deck-hud {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
    position: relative;
  }

  .chat-history {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    mask-image: linear-gradient(to bottom, transparent, black 20%);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 20%);
  }

  .interaction-hud {
    background: rgba(20, 20, 20, 0.6);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    min-height: 200px; /* Ensure space for cards */
    justify-content: center;
  }

  /* The Fork Styles */
  .fork-overlay {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .cards-container {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  /* Crystallization Styles */
  .crystallize-overlay {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .crystallize-card {
    background: rgba(20, 20, 20, 0.9);
    border: 1px solid var(--color-info);
    border-radius: 12px;
    padding: 1.5rem;
    width: 100%;
    max-width: 500px;
    box-shadow: 0 0 30px rgba(var(--color-info-rgb), 0.2);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.75rem;
  }

  .card-header .icon {
    font-size: 1.5rem;
  }

  .card-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--color-info);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .takeaways-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .takeaways-list li {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.75rem;
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--color-text);
  }

  :global(.confirm-btn) {
    width: 100%;
    margin-top: 0.5rem;
  }

  .standard-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .tpr-area {
    display: flex;
    justify-content: center;
  }

  .tpr-button {
    width: 100%;
    padding: 0.75rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.2);
    color: var(--color-text-secondary);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.1s ease;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    position: relative;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }

  .tpr-inner {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .progress-bg {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: rgba(var(--color-accent-rgb), 0.2);
    transition: width 0.05s linear;
    z-index: 0;
  }

  .tpr-button:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.1);
  }

  .tpr-button.active {
    border-color: var(--color-accent);
    color: #fff;
    transform: scale(0.99);
    animation: shake 0.5s infinite;
  }

  .tpr-button.complete {
    background: var(--color-accent);
    color: #000;
    border-color: var(--color-accent);
    border-style: solid;
  }

  .tpr-glow {
    position: absolute;
    inset: 0;
    background: var(--color-accent);
    opacity: 0.2;
    filter: blur(10px);
    z-index: 1;
  }

  @keyframes shake {
    0% { transform: translate(1px, 1px) rotate(0deg); }
    10% { transform: translate(-1px, -2px) rotate(-1deg); }
    20% { transform: translate(-3px, 0px) rotate(1deg); }
    30% { transform: translate(3px, 2px) rotate(0deg); }
    40% { transform: translate(1px, -1px) rotate(1deg); }
    50% { transform: translate(-1px, 2px) rotate(-1deg); }
    60% { transform: translate(-3px, 1px) rotate(0deg); }
    70% { transform: translate(3px, 1px) rotate(-1deg); }
    80% { transform: translate(-1px, -1px) rotate(1deg); }
    90% { transform: translate(1px, 2px) rotate(0deg); }
    100% { transform: translate(1px, -2px) rotate(-1deg); }
  }

  .console-wrapper {
    width: 100%;
  }

  /* Scrollbar Styling */
  .chat-history::-webkit-scrollbar {
    width: 4px;
  }
  
  .chat-history::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .chat-history::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }
</style>
