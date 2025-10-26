<!-- src/lib/components/ui/command-bar/StatisticsView.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import * as statisticsService from '$lib/services/features/statisticsService';
  import type {
    Statistics,
    CardStatusDistribution,
  } from '$lib/services/features/statisticsService';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import Icon from '$lib/components/ui/Icon.svelte';

  import PieChart from '$lib/components/ui/PieChart.svelte';

  let stats = $state<Statistics | null>(null);
  let cardDistribution = $state<CardStatusDistribution | null>(null);
  let isLoading = $state(true);

  onMount(async () => {
    isLoading = true;
    const [statsData, distributionData] = await Promise.all([
      statisticsService.getStatistics(),
      statisticsService.getCardStatusDistribution(),
    ]);
    stats = statsData;
    cardDistribution = distributionData;
    isLoading = false;
  });

  const pieChartData = $derived(() => {
    if (!cardDistribution) return [];

    const colors = {
      new: 'hsl(205, 90%, 60%)',
      learning: 'hsl(350, 85%, 60%)',
      young: 'hsl(145, 70%, 45%)',
      mature: 'hsl(45, 90%, 55%)',
    };

    return [
      { label: 'New', value: cardDistribution.new, color: colors.new },
      {
        label: 'Learning',
        value: cardDistribution.learning,
        color: colors.learning,
      },
      { label: 'Young', value: cardDistribution.young, color: colors.young },
      { label: 'Mature', value: cardDistribution.mature, color: colors.mature },
    ].filter((d) => d.value > 0);
  });

  const youngRetention = $derived(() => {
    if (!stats) return 0;
    const youngTotalReviews = stats.retention.total - stats.retention.mature;
    return youngTotalReviews > 0
      ? (stats.retention.young / youngTotalReviews) * 100
      : 0;
  });

  const matureRetention = $derived(() => {
    if (!stats || stats.retention.total === 0) return 0;
    return (stats.retention.mature / stats.retention.total) * 100;
  });

  function getRetentionColor(percentage: number): string {
    if (percentage >= 85) return 'retention-good';
    if (percentage >= 70) return 'retention-ok';
    return 'retention-bad';
  }
</script>

<nav class="action-list stats-view" aria-labelledby="stats-title">
  <h2 id="stats-title" class="visually-hidden">Study Statistics</h2>

  {#if isLoading}
    <div class="state-message">Calculating statistics...</div>
  {:else if !stats || !cardDistribution}
    <div class="state-message">No data found.</div>
  {:else}
    <div in:fade={{ duration: 300 }}>
      <!-- Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon"><Icon name="check-square" size={24} /></div>
          <div class="stat-content">
            <span class="value">{stats.reviewsToday}</span>
            <span class="label">Reviews Today</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><Icon name="archive" size={24} /></div>
          <div class="stat-content">
            <span class="value">{stats.totalReviews}</span>
            <span class="label">Total Reviews</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><Icon name="sparkles" size={24} /></div>
          <div class="stat-content">
            <span class="value {getRetentionColor(youngRetention())}">
              {youngRetention().toFixed(1)}%
            </span>
            <span class="label">Young Card Retention</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><Icon name="brain" size={24} /></div>
          <div class="stat-content">
            <span class="value {getRetentionColor(matureRetention())}">
              {matureRetention().toFixed(1)}%
            </span>
            <span class="label">Mature Card Retention</span>
          </div>
        </div>
      </div>

      <!-- Native Pie Chart Section -->
      <h3 class="section-title">Card Collection Breakdown</h3>
      <div class="chart-container">
        <!-- --- THIS IS THE FIX --- -->
        {#if pieChartData().length > 0}
          <PieChart data={pieChartData()} />
        {:else}
          <div class="state-message chart-empty">
            Add some cards to see your collection breakdown.
          </div>
        {/if}
      </div>
    </div>
  {/if}
</nav>

<hr class="separator" />

<button
  class="action-button"
  onclick={() => commandBarStore.setView('study-hub')}
>
  <Icon name="x" size={18} />
  <span>Back to Decks</span>
</button>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
  .stats-view {
    padding: var(--space-sm);
  }
  .state-message {
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-secondary);
  }
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }
  .stat-card {
    background-color: var(--color-background);
    border: 1px solid var(--panel-border-light);
    border-radius: var(--space-sm);
    padding: var(--space-md);
    display: flex;
    align-items: center;
    gap: var(--space-md);
    transition: all 0.2s ease-out;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--panel-border-medium);
  }
  .stat-icon {
    color: var(--color-accent);
  }
  .stat-content {
    display: flex;
    flex-direction: column;
  }
  .stat-card .label {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }
  .stat-card .value {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.2;
    color: var(--color-text);
  }
  .retention-good {
    color: var(--color-green-500) !important;
  }
  .retention-ok {
    color: var(--color-orange-500) !important;
  }
  .retention-bad {
    color: var(--color-danger) !important;
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
    padding-left: var(--space-xs);
  }
  .chart-container {
    height: 180px;
    padding: var(--space-sm);
    background-color: var(--color-background);
    border: 1px solid var(--panel-border-light);
    border-radius: var(--space-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .chart-empty {
    padding: 0;
  }
  .separator {
    border: none;
    height: 1px;
    background-color: var(--panel-border-light);
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }
  :global(.dark-theme) .stat-card {
    background-color: var(--color-background-dark);
    border-color: var(--panel-border-dark);
  }
  :global(.dark-theme) .stat-card:hover {
    border-color: var(--panel-border-light);
  }
  :global(.dark-theme) .separator {
    background-color: var(--panel-border-dark);
  }
  :global(.dark-theme) .chart-container {
    background-color: var(--color-background-dark);
    border-color: var(--panel-border-dark);
  }
</style>
