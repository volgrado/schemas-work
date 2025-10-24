<!--
  @component
  StatisticsView

  This component provides a dashboard for visualizing the user's study statistics.
  It fetches all review logs and calculates and displays several key metrics.

  Key Features:
  - Displays summary cards for total reviews and overall retention rate.
  - Renders a bar chart showing the number of reviews completed per day for the last 30 days.
  - Uses Svelte 5's `$derived` rune for efficient, reactive calculations from the raw log data.
  - Shows a clear loading state while fetching data and an empty state if no reviews have been completed.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as reviewLogService from '$lib/services/features/reviewLogService';
  import type { ReviewLog } from '$lib/services/features/reviewLogService';

  let logs = $state<ReviewLog[]>([]);
  let isLoading = $state(true);

  onMount(async () => {
    logs = await reviewLogService.getAllLogs();
    isLoading = false;
  });

  const reviewsPerDay = $derived(() => {
    const map = new Map<string, number>();
    for (const log of logs) {
      const date = new Date(log.reviewTime).toISOString().split('T')[0];
      map.set(date, (map.get(date) || 0) + 1);
    }
    // Sort and take the last 30 days for a cleaner chart
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30);
  });

  const retentionRate = $derived(() => {
    const reviewLogs = logs.filter((log) => log.state === 'review');
    if (reviewLogs.length === 0) return 0;
    const correct = reviewLogs.filter((log) => log.quality >= 3).length;
    return (correct / reviewLogs.length) * 100;
  });

  const totalReviews = $derived(logs.length);
</script>

=
<div class="stats-view">
  {#if isLoading}
    <p>Loading statistics...</p>
  {:else if logs.length === 0}
    <div class="empty-state">
      <h3>No Reviews Yet</h3>
      <p>Complete a review session to see your statistics here.</p>
    </div>
  {:else}
    <div class="summary-cards">
      <div class="stat-card">
        <span class="label">Total Reviews</span>
        <!-- The compiler auto-unwraps 'totalReviews' here -->
        <span class="value">{totalReviews}</span>
      </div>
      <div class="stat-card">
        <span class="label">Retention Rate (Reviews)</span>
        <!-- FIX IS HERE: Call the signal as a function before using its methods -->
        <span class="value">{retentionRate().toFixed(1)}%</span>
      </div>
    </div>

    <h4>Reviews Over Time (Last 30 Days)</h4>
    <div class="chart-container">
      <!-- The compiler auto-unwraps 'reviewsPerDay' in the #each block -->
      <div class="chart">
        {#each reviewsPerDay() as [date, count]}
          <div class="bar-item">
            <div
              class="bar"
              style="height: {Math.min(150, count * 2)}px"
              title="{count} reviews on {new Date(date).toLocaleDateString()}"
            ></div>
            <div class="bar-label">
              {new Date(date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .stats-view {
    padding: var(--space-md);
  }
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }
  .stat-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-md);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }
  .stat-card .label {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }
  .stat-card .value {
    font-size: 1.5rem;
    font-weight: 600;
  }
  h4 {
    margin-bottom: var(--space-md);
    font-weight: 600;
  }
  .chart-container {
    overflow-x: auto;
    padding-bottom: var(--space-md);
  }
  .chart {
    display: flex;
    align-items: flex-end;
    gap: var(--space-md);
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    height: 220px;
    min-width: fit-content;
  }
  .bar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
  }
  .bar {
    width: 25px;
    background-color: var(--color-accent);
    border-radius: 3px;
    transition: height 0.3s ease-out;
  }
  .bar-label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }
  .empty-state {
    text-align: center;
    padding: var(--space-xl) 0;
    color: var(--color-text-secondary);
  }
</style>
