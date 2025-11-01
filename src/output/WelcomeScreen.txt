<!--
  @component
  WelcomeScreen

  The main welcome and feature overview screen for the application.
  It displays the brand name, a tagline, a grid of key features,
  and a primary call-to-action button to enter the main application.

  This component is purely presentational. Its only interactive element is the
  "Start Creating" button, which fires a `start` event to its parent.

  Events:
  - `start`: Fired when the user clicks the main call-to-action button.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // --- UI Components & Utilities ---
  import { t } from '$lib/utils/i18n';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  const dispatch = createEventDispatcher<{ start: void }>();
  /**
   * Dispatches the 'start' event when the main call-to-action button is clicked.
   */
  function handleStart() {
    dispatch('start');
  }
</script>

<div class="welcome-container">
  <div class="content-panel">
    <header class="header">
      <h1 class="title">
        {$t('app_name')}<span class="accent-word">.Work</span>
      </h1>
      <p class="subtitle">{$t('welcome.tagline')}</p>
    </header>

    <main class="features-grid">
      <div class="feature">
        <Icon name="sparkles" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">{$t('feature.ai_structure.title')}</h2>
          <p>{$t('feature.ai_structure.description')}</p>
        </div>
      </div>

      <div class="feature">
        <Icon name="git-branch" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">{$t('feature.visualize.title')}</h2>
          <p>{$t('feature.visualize.description')}</p>
        </div>
      </div>

      <div class="feature">
        <Icon name="zap" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">{$t('feature.learn.title')}</h2>
          <p>{$t('feature.learn.description')}</p>
        </div>
      </div>

      <div class="feature">
        <Icon name="lock" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">{$t('feature.privacy.title')}</h2>
          <p>{$t('feature.privacy.description')}</p>
        </div>
      </div>
    </main>

    <footer class="footer">
      <Button on:click={handleStart} size="lg" variant="primary">
        {$t('welcome.cta')}
      </Button>
      <p class="cta-support-text">{$t('welcome.cta_support')}</p>
    </footer>
  </div>
</div>

<style>
  .welcome-container {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    padding: var(--space-lg);
    box-sizing: border-box;
    overflow-y: auto; /* Allows vertical scrolling on smaller screens */
  }

  .content-panel {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .header,
  .footer {
    text-align: center;
  }

  .title {
    font-family: var(--font-main);
    font-size: 2.8rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    margin: 0;
  }
  .accent-word {
    color: var(--color-accent);
  }
  .subtitle {
    font-size: 1.25rem;
    color: var(--color-gray-500);
    margin-top: var(--space-sm);
    font-weight: 400;
    max-width: 450px;
    margin-left: auto;
    margin-right: auto;
  }

  .features-grid {
    display: grid;
    gap: var(--space-xl);
  }

  @media (min-width: 640px) {
    .features-grid {
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg) var(--space-xl);
    }
    .content-panel {
      gap: var(--space-xxl);
    }
  }

  .feature {
    display: flex;
    text-align: left;
    align-items: flex-start;
    gap: var(--space-md);
  }
  .feature :global(svg) {
    color: var(--color-accent);
    flex-shrink: 0;
  }
  .feature-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 var(--space-xs) 0;
  }
  .feature-text {
    min-width: 0;
  }
  .feature-text p {
    margin: 0;
    line-height: 1.6;
    color: var(--color-text);
    overflow-wrap: break-word;
    word-wrap: break-word;
  }

  .cta-support-text {
    font-size: 0.85rem;
    color: var(--color-gray-500);
    margin-top: var(--space-sm);
  }

  @media (max-width: 640px) {
    .title {
      font-size: 2.2rem;
    }
    .subtitle {
      font-size: 1.1rem;
    }
  }

  @media (max-width: 480px) {
    .feature {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
  }
</style>
