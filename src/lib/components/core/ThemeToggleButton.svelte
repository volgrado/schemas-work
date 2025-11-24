<!-- src/lib/components/ui/ThemeToggleButton.svelte -->
<script lang="ts">
  // --- Imports for core functionality ---
  import { themeStore, type Theme } from '$lib/stores/themeStore.svelte';
  import Icon from '$lib/components/core/Icon.svelte';
  import Button from '$lib/components/core/Button.svelte';
  import { t } from '$lib/utils/i18n';
  import type { IconName } from '$lib/types/iconName';

  // --- Type definition for our configuration object ---
  interface Config {
    icon: IconName;
    label: string;
  }

  // --- A static object to map themes to their icon and label ---
  // The `$t` function is reactive, so this will update if the language changes.
  const themeConfig: Record<Theme, Config> = {
    light: {
      icon: 'sun',
      label: $t('theme.aria.switchToDark') || 'Switch to dark theme',
    },
    dark: {
      icon: 'moon',
      label: $t('theme.aria.switchToSystem') || 'Switch to system theme',
    },
    system: {
      icon: 'monitor',
      label: $t('theme.aria.switchToLight') || 'Switch to light theme',
    },
  };

  // --- The reactive core of the component ---
  // `$derived` creates a new reactive value that automatically updates
  // whenever `themeStore.theme` changes. This is the heart of the component.
  let currentConfig = $derived(themeConfig[themeStore.theme]);
</script>

<Button
  onclick={() => themeStore.cycle()}
  variant="icon"
  size="md"
  aria-label={currentConfig.label}
  title={currentConfig.label}
>
  <!--
    By removing the #key block and transitions, we get a simple, instant icon swap.
    The `name` prop is bound to our reactive `currentConfig.icon`.
    When `currentConfig` changes, Svelte will instantly re-render this Icon
    with the new name.
  -->
  <Icon name={currentConfig.icon} size={20} />
</Button>

<!-- No <style> tag is needed as there are no custom wrappers or animations. -->
