<!--
  @component
  StatisticsView

  @description
  A visual analytics dashboard for tracking spaced repetition progress.
  It aggregates review logs and card statuses to provide insights into retention and workload.

  Features:
  - **KPI Cards:** Displays total reviews, reviews today, and retention rates (Young/Mature).
  - **Pie Chart:** Visualizes the distribution of cards (New vs. Learning vs. Review).
  - **Async Data:** Fetches data from `statisticsService` on mount with a loading state.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import * as statisticsService from '$lib/modules/study/domain/statisticsService';
  import type {
    Statistics,
    CardStatusDistribution,
  } from '$lib/modules/study/domain/statisticsService';
  import { goBack } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';

  // --- UI Component Imports ---
  import Icon from '$lib/core/ui/Icon.svelte';
  import PieChart from '$lib/core/ui/PieChart.svelte';
  import ViewHeader from './ViewHeader.svelte';

  // --- State ---
  let stats = $state<Statistics | null>(null);
  let cardDistribution = $state<CardStatusDistribution | null>(null);
  let isLoading = $state(true);

  // --- Lifecycle ---
  onMount(async () => {
    isLoading = true;
    try {
      const [statsData, distributionData] = await Promise.all([
        statisticsService.generateStatistics(),
        statisticsService.getCardStatusDistribution(),
      ]);
      stats = statsData;
      cardDistribution = distributionData;
    } catch (error) {
      console.error('Failed to load statistics:', error);
      stats = null;
      cardDistribution = null;
    } finally {
      isLoading = false;
    }
  });

  // --- Derived State ---

  const pieChartData = $derived(() => {
    if (!cardDistribution) return [];

    const colors = {
      new: 'hsl(205, 90%, 60%)',
      learning: 'hsl(350, 85%, 60%)',
      young: 'hsl(145, 70%, 45%)',
      mature: 'hsl(45, 90%, 55%)',
    };

    return [
      {
        label: i18n.t('statistics.chart.new'),
        value: cardDistribution.new,
        color: colors.new,
      },
      {
        label: i18n.t('statistics.chart.learning'),
        value: cardDistribution.learning,
        color: colors.learning,
      },
      {
        label: i18n.t('statistics.chart.young'),
        value: cardDistribution.young,
        color: colors.young,
      },
      {
        label: i18n.t('statistics.chart.mature'),
        value: cardDistribution.mature,
        color: colors.mature,
      },
    ].filter((d) => d.value > 0);
  });

  const youngRetention = $derived(() => stats?.retention.young ?? 0);
  const matureRetention = $derived(() => stats?.retention.mature ?? 0);

  function getRetentionColor(percentage: number): string {
    if (percentage >= 85) return 'retention-good';
    if (percentage >= 70) return 'retention-ok';
    return 'retention-bad';
  }
</script>

<div class="view-container">
  <ViewHeader title={i18n.t('statistics.title')} onBack={goBack} />

  <div class="content-area">
    {#if isLoading}
      <div class="state-message">{i18n.t('statistics.loading')}</div>
    {:else if !stats || !cardDistribution}
      <div class="state-message">{i18n.t('statistics.noData')}</div>
    {:else}
      <div class="stats-content" in:fade={{ duration: 300 }}>
        <!-- Key Performance Indicators -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon"><Icon name="check-circle" size={24} /></div>
            <div class="stat-content">
              <span class="value">{stats.reviewsToday}</span>
              <span class="label">{i18n.t('statistics.reviewsToday')}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><Icon name="archive" size={24} /></div>
            <div class="stat-content">
              <span class="value">{stats.totalReviews}</span>
              <span class="label">{i18n.t('statistics.totalReviews')}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><Icon name="sparkles" size={24} /></div>
            <div class="stat-content">
              <span class="value {getRetentionColor(youngRetention())}">
                {youngRetention().toFixed(1)}%
              </span>
              <span class="label">{i18n.t('statistics.youngRetention')}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><Icon name="award" size={24} /></div>
            <div class="stat-content">
              <span class="value {getRetentionColor(matureRetention())}">
                {matureRetention().toFixed(1)}%
              </span>
              <span class="label">{i18n.t('statistics.matureRetention')}</span>
            </div>
          </div>
        </div>

        <!-- Distribution Chart -->
        <h3 class="section-title">{i18n.t('statistics.breakdownTitle')}</h3>
        <div class="chart-container">
          {#if pieChartData().length > 0}
            <PieChart data={pieChartData()} />
          {:else}
            <div class="state-message chart-empty">
              {i18n.t('statistics.chartEmpty')}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .content-area {
    overflow-y: auto;
    padding: var(--space-sm);
  }

  :global(.back-button) {
    width: auto !important;
    padding: 8px !important;
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
    border: 1px solid var(--color-border);
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
    border-color: var(--color-border);
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

  .retention-good { color: var(--color-green-500) !important; }
  .retention-ok { color: var(--color-orange-500) !important; }
  .retention-bad { color: var(--color-danger) !important; }

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
    border: 1px solid var(--color-border);
    border-radius: var(--space-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chart-empty {
    padding: 0;
  }

  :global(.dark-theme) .stat-card {
    background-color: var(--color-background-dark);
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .stat-card:hover {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .chart-container {
    background-color: var(--color-background-dark);
    border-color: var(--color-border-dark);
  }
</style>
