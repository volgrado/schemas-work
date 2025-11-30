<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Button from '$lib/core/ui/Button.svelte';

  interface Props {
    onCommit: (intention: string) => void;
  }

  let { onCommit }: Props = $props();

  let intention = $state('');

  function handleSubmit() {
    if (intention.trim()) {
      onCommit(intention);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  }
</script>

<div class="intention-input" in:fade>
  <div class="content-wrapper">
    <h1 class="prompt" in:fly={{ y: 20, delay: 200 }}>What do you seek?</h1>
    <p class="sub-prompt" in:fly={{ y: 20, delay: 400 }}>
      Define your Sovereign Intent. This will shape your curriculum.
    </p>

    <div class="input-area" in:fly={{ y: 30, delay: 600 }}>
      <textarea
        bind:value={intention}
        placeholder="e.g., I want to master negotiation in Japanese to close business deals..."
        onkeydown={handleKeydown}
        rows="4"
      ></textarea>
      
      <div class="controls">
        <span class="hint">Cmd+Enter to commit</span>
        <Button 
          variant="primary" 
          size="lg" 
          disabled={!intention.trim()} 
          onclick={handleSubmit}
        >
          Initialize Path
        </Button>
      </div>
    </div>
  </div>
</div>

<style>
  .intention-input {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    background: var(--color-background);
  }

  .content-wrapper {
    max-width: 600px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    text-align: center;
  }

  .prompt {
    font-size: 3rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-secondary) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .sub-prompt {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .input-area {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--color-background-raised);
    padding: 1.5rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-xl);
  }

  textarea {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--color-text);
    font-size: 1.125rem;
    font-family: var(--font-main);
    resize: none;
    outline: none;
  }

  textarea::placeholder {
    color: var(--color-text-tertiary);
  }

  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--color-border);
    padding-top: 1rem;
  }

  .hint {
    font-size: 0.875rem;
    color: var(--color-text-tertiary);
  }
</style>
