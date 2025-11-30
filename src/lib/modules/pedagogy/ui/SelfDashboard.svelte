<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Button from '$lib/core/ui/Button.svelte';
  import Modal from '$lib/core/ui/Modal.svelte';
  import FlowVisualizer from './FlowVisualizer.svelte';
  import PieChart from '$lib/core/ui/PieChart.svelte';

  interface Props {
    onClose: () => void;
    protocolTitle?: string;
  }

  let { onClose, protocolTitle }: Props = $props();

  // Mock Data
  const stateVector = [0.7, 0.6, 0.8]; // Knowledge, Motivation, Flow
  const masteryData = [
    { label: 'Mastered', value: 12, color: '#fbbf24' },
    { label: 'Active', value: 5, color: '#a855f7' },
    { label: 'Locked', value: 20, color: '#334155' }
  ];
</script>

<Modal show={true} {onClose} title="Neural State" width="lg" alignment="top">
  <div class="dashboard-content">
    <p class="subtitle">
      {#if protocolTitle}
        Analysis for <strong style="color: var(--color-accent)">{protocolTitle}</strong>
      {:else}
        Global System Analysis
      {/if}
    </p>

    <div class="metrics-grid">
      <!-- Flow Radar -> Focus Zone (Full Width) -->
      <section class="metric-card full-width">
        <div class="card-header">
          <h3>Focus Zone</h3>
          <span class="status-badge optimal">Optimal</span>
        </div>
        <div class="viz-container large">
          <FlowVisualizer challenge={0.7} skill={0.6} />
        </div>
        <p class="metric-desc">
          You are in the <strong>Flow State</strong>. The challenge perfectly matches your current skill level.
        </p>
      </section>

      <!-- Mastery Chart -> Knowledge Growth -->
      <section class="metric-card">
        <div class="card-header">
          <h3>Knowledge Growth</h3>
          <span class="status-badge growth">Expanding</span>
        </div>
        <div class="chart-container">
          <PieChart data={masteryData} innerRadius={0.6} />
        </div>
        <div class="legend">
          <div class="legend-item">
            <span class="dot" style="background: #fbbf24"></span>
            <span>Mastered</span>
          </div>
          <div class="legend-item">
            <span class="dot" style="background: #a855f7"></span>
            <span>Active</span>
          </div>
        </div>
      </section>

      <!-- Metacognition -> Brain Health -->
      <section class="metric-card">
        <div class="card-header">
          <h3>Brain Health</h3>
          <span class="status-badge healthy">Peak Condition</span>
        </div>
        <div class="stats-grid vertical">
          <div class="stat-box">
            <span class="label">Adaptability</span>
            <span class="value">High</span>
          </div>
          <div class="stat-box">
            <span class="label">Clarity</span>
            <span class="value">Sharp</span>
          </div>
          <div class="stat-box momentum-box">
            <span class="label">Neural Momentum</span>
            <div class="momentum-value">
              <span class="flame-icon">🔥</span>
              <span class="value">4 Days</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</Modal>

<style>
  .dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .subtitle {
    font-size: 1rem;
    color: var(--color-text-secondary);
    margin: 0;
    text-align: center;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .metric-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .metric-card.full-width {
    grid-column: 1 / -1;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .card-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .status-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    text-transform: uppercase;
  }

  .status-badge.optimal {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .status-badge.growth {
    background: rgba(168, 85, 247, 0.1);
    color: #a855f7;
    border: 1px solid rgba(168, 85, 247, 0.2);
  }

  .status-badge.healthy {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .viz-container, .chart-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 160px;
  }



  .metric-desc {
    font-size: 0.95rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
    text-align: center;
  }

  .legend {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-top: 0.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .stats-grid.vertical {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .stat-box {
    background: var(--color-background);
    padding: 1rem;
    border-radius: 12px;
    text-align: center;
    display: flex;
    flex-direction: row; /* Horizontal for vertical list */
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-box .label {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-box .value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
  }



  .momentum-box {
    border: 1px solid rgba(251, 146, 60, 0.3);
    background: rgba(251, 146, 60, 0.05);
  }

  .momentum-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .flame-icon {
    font-size: 1.25rem;
    animation: flame-pulse 2s infinite ease-in-out;
    filter: drop-shadow(0 0 5px rgba(251, 146, 60, 0.5));
  }

  @keyframes flame-pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.2); opacity: 1; }
  }

  @media (max-width: 768px) {
    .metrics-grid {
      grid-template-columns: 1fr;
    }
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
