<!--
  @component
  WelcomeScreen

  @description
  An exceptional welcome and feature overview screen for the application. It creates a
  strong first impression with a clean layout and a delightful, staggered entrance
  animation for all its content.

  @props
  - `onstart`: {() => void} - Callback fired when the user clicks the "Start Creating" button.
-->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- UI Components & Utilities ---
  import { i18n } from '$lib/utils/i18n.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';

  const { onstart } = $props<{
    onstart: () => void;
  }>();

  // --- Landing Page Data ---
  const features = [
    {
      icon: 'sparkles',
      title: 'feature.ai_structure.title',
      desc: 'feature.ai_structure.description',
    },
    {
      icon: 'git-branch',
      title: 'feature.visualize.title',
      desc: 'feature.visualize.description',
    },
    {
      icon: 'zap',
      title: 'feature.learn.title',
      desc: 'feature.learn.description',
    },
    {
      icon: 'lock',
      title: 'feature.privacy.title',
      desc: 'feature.privacy.description',
    },
  ] as const;
</script>

<div class="welcome-container">
  <div class="content-panel">
    <header
      class="header"
      in:fly={{ y: 20, duration: 500, easing: quintOut, delay: 100 }}
    >
      <h1 class="title">
        {i18n.t('app_name')}<span class="accent-word">.Work</span>
      </h1>
      <p class="subtitle">{i18n.t('welcome.tagline')}</p>
    </header>

    <main class="features-grid">
      {#each features as feature, i (feature.icon)}
        <div
          class="feature"
          in:fly={{
            y: 20,
            duration: 400,
            easing: quintOut,
            delay: 300 + i * 100,
          }}
        >
          <Icon name={feature.icon} size={24} />
          <div class="feature-text">
            <h2 class="feature-title">{i18n.t(feature.title)}</h2>
            <p>{i18n.t(feature.desc)}</p>
          </div>
        </div>
      {/each}
    </main>

    <footer
      class="footer"
      in:fly={{ y: 20, duration: 500, easing: quintOut, delay: 700 }}
    >
      <div class="button-group">
        <Button
          onclick={() => {
            if (typeof onstart === 'function') onstart();
          }}
          size="lg"
          variant="primary"
        >
          {i18n.t('welcome.cta')}
        </Button>
      </div>
      <p class="cta-support-text">{i18n.t('welcome.cta_support')}</p>
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
    overflow-y: auto;
    position: relative;
    background: radial-gradient(
      circle at 50% 30%,
      hsl(var(--color-accent-hsl) / 0.08) 0%,
      transparent 60%
    );
  }

  /* --- Landing Styles --- */
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
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    margin: 0;
    background: linear-gradient(
      135deg,
      var(--color-text) 30%,
      var(--color-accent)
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent;
    display: inline-block;
  }
  .accent-word {
    color: var(--color-accent);
    -webkit-text-fill-color: var(--color-accent);
  }
  .subtitle {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin-top: var(--space-sm);
    font-weight: 400;
    max-width: 450px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.5;
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
    margin-top: 2px;
    filter: drop-shadow(0 2px 4px hsl(var(--color-accent-hsl) / 0.3));
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
  }
  .cta-support-text {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin-top: var(--space-sm);
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    align-items: stretch;
  }

  @media (min-width: 480px) {
    .button-group {
      flex-direction: row;
      justify-content: center;
      align-items: center;
    }
  }

  @media (max-width: 640px) {
    .title {
      font-size: 2.5rem;
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
