<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Button from '$lib/core/ui/Button.svelte';
  import Modal from '$lib/core/ui/Modal.svelte';

  interface Props {
    nodeId: string;
    onClose: () => void;
    onResimulate: () => void;
    protegeTakeaways?: string[];
  }

  let { nodeId, onClose, onResimulate, protegeTakeaways = [] }: Props = $props();

  // Mock Data - In a real app, this would be fetched based on nodeId
  const missionData = {
    title: "Negotiate a Treaty",
    chapter: "VI: The Inner Game",
    context: {
      role: "Ambassador",
      scenario: "Diplomatic Reception"
    },
    consolidation: {
      stability: 0.85, // High stability
      plasticity: 0.2, // Low plasticity (consolidated)
      threshold: 0.8
    },
    mistakes: [
      { type: "Register Mismatch", count: 3, insight: "You used informal 'Tú' with the Ambassador. Use 'Usted' in diplomatic contexts." },
      { type: "Conditional Tense", count: 2, insight: "Confused '-ría' (would) with ' -ra' (subjunctive)." }
    ],
    takeaways: [
      "Diplomatic protocol requires the 'Usted' form.",
      "The conditional tense expresses hypothetical futures.",
      "Silence is a valid turn-taking strategy in high-context cultures."
    ]
  };

  // Visualizing the "Stability-Plasticity" threshold
  const stabilityPercent = missionData.consolidation.stability * 100;
</script>

<Modal show={true} {onClose} title={missionData.title} width="default" alignment="top">
  <div class="debrief-content">
    <div class="debrief-meta">
      <div class="status-badge">Mission Mastered</div>
      <div class="context-pill">
        <span class="role">{missionData.context.role}</span>
        <span class="separator">in</span>
        <span class="scenario">{missionData.context.scenario}</span>
      </div>
    </div>

    <div class="content-grid">
      <!-- Neural Consolidation Status -->
      <section class="consolidation-sector">
        <h2>Neural Consolidation</h2>
        <div class="metric-display">
          <div class="metric-ring">
            <svg viewBox="0 0 100 100">
              <circle class="bg" cx="50" cy="50" r="45" />
              <circle 
                class="progress" 
                cx="50" 
                cy="50" 
                r="45" 
                stroke-dasharray="283"
                stroke-dashoffset={283 - (283 * missionData.consolidation.stability)}
              />
            </svg>
            <div class="metric-value">{Math.round(stabilityPercent)}%</div>
          </div>
          <div class="metric-label">
            <span class="label">Memory Stability</span>
            <span class="desc">Above Threshold (80%)</span>
          </div>
        </div>
      </section>

      <!-- Mistake Analysis (The "Learnt Lessons") -->
      <section class="analysis-sector">
        <h2>Mistake Analysis</h2>
        <div class="mistake-list">
          {#each missionData.mistakes as mistake, i}
            <div class="mistake-item" in:fly={{ x: 20, delay: 200 + (i * 100) }}>
              <div class="mistake-header">
                <span class="error-type">{mistake.type}</span>
                <span class="count">{mistake.count}x</span>
              </div>
              <p class="insight">{mistake.insight}</p>
            </div>
          {/each}
        </div>
      </section>

      <!-- Key Takeaways -->
      <section class="takeaways-sector">
        <h2>Key Takeaways</h2>
        <div class="takeaway-list">
          {#each missionData.takeaways as item}
            <div class="takeaway-item">
              <span class="bullet">◈</span>
              <span class="text">{item}</span>
            </div>
          {/each}
        </div>
      </section>

      <!-- Protégé Insights (Mentor Mode) -->
      {#if protegeTakeaways && protegeTakeaways.length > 0}
        <section class="protege-sector" in:fade={{ delay: 300 }}>
          <h2>Protégé Insights</h2>
          <div class="protege-card">
            <div class="protege-header">
              <span class="icon">💎</span>
              <span class="label">Crystallized Knowledge</span>
            </div>
            <ul class="protege-list">
              {#each protegeTakeaways as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
        </section>
      {/if}
    </div>

    <footer class="actions">
      <Button variant="ghost" onclick={onClose}>Close</Button>
      <Button variant="primary" onclick={onResimulate}>Re-simulate</Button>
    </footer>
  </div>
</Modal>

<style>
  .debrief-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .debrief-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: rgba(255, 215, 0, 0.1); /* Gold tint */
    color: #ffd700;
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
  }

  h1 {
    font-size: 2rem;
    margin: 0;
    color: var(--color-text);
    font-weight: 700;
  }

  .context-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.5rem 1rem;
    border-radius: 100px;
    margin-top: 1rem;
    font-size: 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .role { color: var(--color-accent); font-weight: 600; }
  .separator { color: var(--color-text-secondary); font-style: italic; }
  .scenario { color: var(--color-text); }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  h2 {
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.5rem;
  }

  /* Metric Ring */
  .metric-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .metric-ring {
    width: 90px;
    height: 90px;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  circle {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
  }

  .bg { stroke: rgba(255, 255, 255, 0.1); }
  
  .progress { 
    stroke: var(--color-accent);
    filter: drop-shadow(0 0 4px var(--color-accent));
    transition: stroke-dashoffset 1s ease-out;
  }

  .metric-value {
    position: absolute;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .metric-label {
    text-align: center;
  }

  .label { display: block; font-weight: 600; color: var(--color-text); }
  .desc { display: block; font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.25rem; }

  /* Mistake Analysis */
  .mistake-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mistake-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 0.75rem;
    border-left: 3px solid var(--color-error, #ef4444);
  }

  .mistake-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
  }

  .error-type { font-weight: 600; color: var(--color-error, #ef4444); }

  .insight {
    font-size: 0.9rem;
    color: var(--color-text);
    line-height: 1.4;
  }

  /* Takeaways */
  .takeaway-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .takeaway-item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .bullet {
    color: var(--color-accent);
    font-size: 0.8rem;
    margin-top: 0.2rem;
  }

  .text {
    font-size: 0.9rem;
    color: var(--color-text);
    line-height: 1.4;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
  }

  /* Protégé Insights Styles */


  .protege-card {
    background: rgba(var(--color-info-rgb), 0.1);
    border: 1px solid var(--color-info);
    border-radius: 12px;
    padding: 0.75rem;
  }

  .protege-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    color: var(--color-info);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.9rem;
  }

  .protege-list {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--color-text);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .protege-list li {
    margin-bottom: 0.25rem;
  }
</style>
