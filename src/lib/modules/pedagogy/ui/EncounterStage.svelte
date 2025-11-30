<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Button from '$lib/core/ui/Button.svelte';
  import LessonDeck from './LessonDeck.svelte';
  import { pedagogyState } from './pedagogyStore.svelte';
  import type { ActionOrientedTask } from '../domain/models';

  interface Props {
    activeTask: ActionOrientedTask | null;
    onComplete: (data?: any) => void;
    onAbort: () => void;
    mode?: 'mission' | 'mentor';
  }

  let { activeTask, onComplete, onAbort, mode = 'mission' }: Props = $props();

  // Derived Scenario Data
  let scenario = $derived({
    title: activeTask?.description || 'Unknown Mission',
    context: activeTask?.context || 'Awaiting orders...',
  });
</script>

<div class="encounter-stage">
  <!-- Main Content: Lesson Deck -->
  <div class="deck-container" in:fly={{ y: 50, duration: 500, delay: 200 }}>
    {#if activeTask}
      <LessonDeck 
        activeTask={activeTask}
        onComplete={onComplete}
      />
    {:else}
      <div class="empty-state">
        <p>No active task data available.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .encounter-stage {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-top: var(--height-header); /* Add padding for fixed header */
  }

  .deck-container {
    flex: 1;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    overflow: hidden;
    z-index: 10;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-secondary);
  }
</style>
