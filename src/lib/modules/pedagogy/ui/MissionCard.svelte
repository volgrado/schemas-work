<!--
  @component
  MissionCard
  
  Displays a pedagogical mission with context and an action to accept it.
-->
<script lang="ts">
  import Button from '$lib/core/ui/Button.svelte';
  import type { ActionOrientedTask } from '../domain/models';

  let { 
    task,
    onAccept
  } = $props<{ 
    task: ActionOrientedTask;
    onAccept: () => void;
  }>();
</script>

<div class="mission-card">
  <div class="mission-header">
    <div class="mission-icon">🚀</div>
    <div class="mission-info">
      <h4>{task.description}</h4>
      <span class="mission-type">{task.type}</span>
    </div>
  </div>
  
  <p class="mission-context">{task.context}</p>
  
  <div class="mission-footer">
    <Button variant="primary" size="sm" onclick={onAccept} style="width: 100%;">
      Accept Mission
    </Button>
  </div>
</div>

<style>
  .mission-card {
    background: var(--color-background-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: var(--transition-base);
    height: 100%;
  }

  .mission-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--color-accent);
  }

  .mission-header {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .mission-icon {
    font-size: 1.5rem;
    background: var(--color-background);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }

  .mission-info {
    flex: 1;
  }

  h4 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.4;
    color: var(--color-text);
  }

  .mission-type {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    font-weight: 500;
    margin-top: 0.25rem;
    display: block;
  }

  .mission-context {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
    flex: 1;
    margin: 0;
  }

  .mission-footer {
    margin-top: auto;
  }
</style>
