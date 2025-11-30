<script lang="ts">
  import { fade, scale } from 'svelte/transition';

  interface Props {
    title: string;
    description: string;
    icon: string;
    risk: 'low' | 'medium' | 'high';
    onSelect: () => void;
  }

  let { title, description, icon, risk, onSelect }: Props = $props();
</script>

<button class="stance-card risk-{risk}" onclick={onSelect} in:scale={{ duration: 300, start: 0.9 }}>
  <div class="card-header">
    <span class="icon">{icon}</span>
    <span class="risk-badge">{risk.toUpperCase()} RISK</span>
  </div>
  <div class="card-body">
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
  <div class="card-footer">
    <span class="select-prompt">SELECT PROTOCOL</span>
  </div>
</button>

<style>
  .stance-card {
    background: rgba(20, 20, 20, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    width: 100%;
    max-width: 280px;
  }

  .stance-card:hover {
    transform: translateY(-5px) scale(1.02);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    border-color: var(--card-color);
  }

  .stance-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent, var(--card-color));
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 0;
  }

  .stance-card:hover::before {
    opacity: 0.1;
  }

  /* Risk Colors */
  .risk-low { --card-color: var(--color-success); }
  .risk-medium { --card-color: var(--color-warning); }
  .risk-high { --card-color: var(--color-error); }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .icon {
    font-size: 2rem;
  }

  .risk-badge {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: var(--card-color);
    border: 1px solid var(--card-color);
    letter-spacing: 0.1em;
  }

  .card-body {
    position: relative;
    z-index: 1;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
    color: #fff;
    font-weight: 700;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  .card-footer {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 1;
    opacity: 0.6;
    transition: opacity 0.3s ease;
  }

  .stance-card:hover .card-footer {
    opacity: 1;
  }

  .select-prompt {
    font-size: 0.7rem;
    font-family: var(--font-mono);
    color: var(--card-color);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
</style>
