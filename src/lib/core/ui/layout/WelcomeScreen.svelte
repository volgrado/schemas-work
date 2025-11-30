<!--
  @component
  WelcomeScreen

  @description
  An exceptional welcome and feature overview screen for the application. It creates a
  strong first impression with a clean layout and a delightful, staggered entrance
  animation for all its content.

  @props
  - `onstart`: {() => void} - Callback fired when the user clicks the "Start Creating" button.
  - `onLanguageStart`: {() => void} - Callback fired when the user clicks the "Enter Language OS" button.
-->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- UI Components & Utilities ---
  import { i18n } from '$lib/utils/i18n.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';

  const { onstart, onLanguageStart } = $props<{
    onstart: () => void;
    onLanguageStart?: () => void;
  }>();

  // --- Landing Page Data ---
  const features = [
    {
      icon: 'monitor',
      title: 'Language OS',
      desc: 'Immersive 3D environment for language acquisition.',
    },
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
      icon: 'wifi-off',
      title: 'feature.privacy.title',
      desc: 'feature.privacy.description',
    },
  ] as const;
</script>

<div class="welcome-container">
  <div class="background-mesh"></div>
  <div class="content-panel glass-panel">
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
          <div class="icon-wrapper">
            <Icon name={feature.icon} size={24} />
          </div>
          <div class="feature-text">
            <h2 class="feature-title">{feature.title === 'Language OS' ? feature.title : i18n.t(feature.title)}</h2>
            <p>{feature.desc.startsWith('feature.') ? i18n.t(feature.desc) : feature.desc}</p>
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

        <Button
          onclick={() => {
            if (typeof onLanguageStart === 'function') onLanguageStart();
          }}
          size="lg"
          variant="ghost"
        >
          <span class="icon">🌐</span>
          Enter Language OS
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
    background-color: var(--color-background);
  }

  /* Mesh Gradient Background */
  .background-mesh {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: radial-gradient(
        circle at 15% 50%,
        hsl(var(--color-accent-hsl) / 0.15),
        transparent 25%
      ),
      radial-gradient(
        circle at 85% 30%,
        hsl(var(--color-accent-hsl) / 0.1),
        transparent 25%
      );
    filter: blur(60px);
    pointer-events: none;
  }

  /* --- Landing Styles --- */
  .content-panel {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 800px; /* Wider for better grid layout */
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    padding: var(--space-xl);
    border-radius: 24px;
    border: 1px solid var(--color-border);
    background: rgba(255, 255, 255, 0.03); /* Subtle glass tint */
    backdrop-filter: blur(20px);
    box-shadow:
      0 4px 24px -1px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }

  :global(.dark-theme) .content-panel {
    background: rgba(0, 0, 0, 0.2);
    box-shadow:
      0 8px 32px -4px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }

  .header,
  .footer {
    text-align: center;
  }
  .title {
    font-family: var(--font-main);
    font-size: 4rem;
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
    font-size: 1.35rem;
    color: var(--color-text-secondary);
    margin-top: var(--space-md);
    font-weight: 400;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.5;
  }
  .features-grid {
    display: grid;
    gap: var(--space-lg);
    margin: var(--space-md) 0;
  }

  @media (min-width: 768px) {
    .features-grid {
      grid-template-columns: 1fr 1fr;
      gap: var(--space-xl);
    }
    .content-panel {
      padding: 60px;
      gap: var(--space-xxl);
    }
  }

  .feature {
    display: flex;
    text-align: left;
    align-items: flex-start;
    gap: var(--space-md);
    padding: var(--space-md);
    border-radius: 12px;
    transition: background-color 0.2s ease;
  }

  .feature:hover {
    background-color: var(--color-background-faint);
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background-color: hsl(var(--color-accent-hsl) / 0.1);
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .feature-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 var(--space-xs) 0;
    color: var(--color-text);
  }
  .feature-text {
    min-width: 0;
  }
  .feature-text p {
    margin: 0;
    line-height: 1.6;
    color: var(--color-text-secondary);
    font-size: 0.95rem;
  }
  .cta-support-text {
    font-size: 0.9rem;
    color: var(--color-text-tertiary);
    margin-top: var(--space-md);
    font-weight: 500;
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
    .content-panel {
      padding: var(--space-lg);
    }
  }
  @media (max-width: 480px) {
    .feature {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .icon-wrapper {
      margin-bottom: var(--space-xs);
    }
  }
</style>
