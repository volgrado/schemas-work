<!--
  @component
  LanguageSwitcher

  @description
  A dropdown component for changing the application's locale.

  Features:
  - **Reactive State:** Updates `i18n` store on selection.
  - **Accessibility:** Uses ARIA roles (`menu`, `menuitem`) and manages focus.
  - **Popup Primitives:** Leverages the `Popup` component for positioning.
  - **Dismissal:** Closes on outside clicks (`clickOutside` action) or Escape key.
-->
<script lang="ts">
  import { i18n, translations } from '$lib/utils/i18n.svelte';
  import type { Action } from 'svelte/action';

  // --- UI Components ---
  import Popup from '$lib/core/ui/Popup.svelte';
  import Button from '$lib/core/ui/Button.svelte';

  // --- State ---
  let menuVisible = $state(false);
  let triggerEl = $state<HTMLElement | null>(null);
  let menuEl = $state<HTMLUListElement | null>(null);

  // --- Actions ---
  const clickOutside: Action<HTMLElement, () => void> = (node, callback) => {
    const handleClick = (event: MouseEvent) => {
      if (
        node &&
        !node.contains(event.target as Node) &&
        !event.defaultPrevented
      ) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClick, true);
    return {
      destroy() {
        document.removeEventListener('mousedown', handleClick, true);
      },
    };
  };

  // --- Effects ---

  // Effect: Keyboard navigation (Escape to close)
  $effect(() => {
    if (!menuVisible) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        menuVisible = false;
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  // Effect: Auto-focus first item on open
  $effect(() => {
    if (menuVisible && menuEl) {
      setTimeout(() => {
        const firstItem =
          menuEl?.querySelector<HTMLButtonElement>('[role="menuitem"]');
        firstItem?.focus();
      }, 100);
    }
  });

  function changeLanguage(lang: string) {
    if (i18n.locale !== lang) {
      i18n.setLocale(lang);
    }
    menuVisible = false;
  }
</script>

<div class="lang-switcher">
  <div bind:this={triggerEl}>
    <Button
      variant="ghost"
      size="sm"
      onclick={() => (menuVisible = !menuVisible)}
      aria-haspopup="true"
      aria-expanded={menuVisible}
      aria-label={i18n.t('languages.switcher_aria_label')}
    >
      {i18n.locale.toUpperCase()}
    </Button>
  </div>

  <Popup
    isVisible={menuVisible}
    referenceEl={triggerEl}
    placement="bottom-end"
    offsetValue={4}
  >
    <ul
      class="lang-menu"
      bind:this={menuEl}
      role="menu"
      use:clickOutside={() => (menuVisible = false)}
    >
      {#each Object.keys(translations) as lang (lang)}
        <li role="presentation">
          <button
            role="menuitem"
            class:current={i18n.locale === lang}
            onclick={() => changeLanguage(lang)}
          >
            {i18n.t(`languages.${lang}`)}
          </button>
        </li>
      {/each}
    </ul>
  </Popup>
</div>

<style>
  .lang-switcher {
    position: relative;
    display: inline-block;
  }
  .lang-menu {
    padding: var(--space-xs);
    list-style: none;
    margin: 0;
    min-width: 150px;
    background-color: var(--color-background-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-lg);
  }
  .lang-menu li button {
    display: block;
    width: 100%;
    text-align: left;
    padding: var(--space-sm);
    border-radius: var(--border-radius-sm);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--color-text);
    transition: background-color 0.2s ease;
  }
  .lang-menu li button:hover,
  .lang-menu li button:focus-visible {
    background-color: var(--btn-hover-bg);
    outline: none;
  }
  .lang-menu li button.current {
    font-weight: 600;
    color: var(--color-accent);
  }
  :global(.dark-theme) .lang-menu {
    background-color: var(--panel-bg-dark);
    border-color: var(--panel-border-dark);
  }
  :global(.dark-theme) .lang-menu li button {
    color: var(--color-text-dark);
  }
  :global(.dark-theme) .lang-menu li button:hover,
  :global(.dark-theme) .lang-menu li button:focus-visible {
    background-color: var(--btn-hover-bg-dark);
  }
</style>
