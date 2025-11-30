<!--
  @component
  ChatMessage
  
  Displays a single message in the tactical chat stream.
  Supports 'system' (Genie) and 'user' roles.
-->
<script lang="ts">
  import { fade, fly } from 'svelte/transition';

  let { 
    role = 'system',
    content,
    isThinking = false
  } = $props<{ 
    role: 'system' | 'user';
    content: string;
    isThinking?: boolean;
  }>();
</script>

<div 
  class="message-row" 
  class:user={role === 'user'}
  in:fly={{ y: 10, duration: 300 }}
>
  {#if role === 'system'}
    <div class="avatar system">
      <div class="orb-mini" class:thinking={isThinking}></div>
    </div>
  {/if}

  <div class="bubble {role}">
    {#if isThinking}
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    {:else}
      <p>{content}</p>
    {/if}
  </div>

  {#if role === 'user'}
    <div class="avatar user">
      <div class="user-dot"></div>
    </div>
  {/if}
</div>

<style>
  .message-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    align-items: flex-end;
    max-width: 80%;
  }

  .message-row.user {
    margin-left: auto;
    flex-direction: row;
  }

  .avatar {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .orb-mini {
    width: 24px;
    height: 24px;
    background: radial-gradient(circle, #a855f7, #6366f1);
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
  }

  .orb-mini.thinking {
    animation: pulse 1s infinite;
  }

  .user-dot {
    width: 24px;
    height: 24px;
    background: var(--color-accent);
    border-radius: 50%;
  }

  .bubble {
    padding: 1rem;
    border-radius: 18px;
    font-size: 1rem;
    line-height: 1.5;
    position: relative;
    box-shadow: var(--shadow-sm);
  }

  .bubble.system {
    background: var(--color-background-raised);
    border: 1px solid var(--color-border);
    border-bottom-left-radius: 4px;
    color: var(--color-text);
  }

  .bubble.user {
    background: var(--color-accent);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 4px 0;
  }

  .typing-indicator span {
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 50%;
    opacity: 0.6;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
  .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 0.8; }
  }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
</style>
