<!--
  @component
  ThemeToggleButton

  A simple UI component that allows the user to cycle through the available
  themes (light, dark, system). It gets its state from the `themeStore`
  and updates it by calling `cycleTheme`.
-->
<script lang="ts">
  import { theme, cycleTheme } from '$lib/stores/themeStore';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { t } from '$lib/utils/i18n';
  import type { IconName } from '$lib/types/iconName';

  let iconName: IconName = 'monitor';
  let ariaLabel: string = 'Change theme';

  // Reactively update the icon and ARIA label based on the current theme
  $: {
    if ($theme === 'light') {
      iconName = 'sun';
      ariaLabel = $t('theme.aria.switchToDark') || 'Switch to dark theme';
    } else if ($theme === 'dark') {
      iconName = 'moon';
      ariaLabel = $t('theme.aria.switchToSystem') || 'Switch to system theme';
    } else {
      iconName = 'monitor';
      ariaLabel = $t('theme.aria.switchToLight') || 'Switch to light theme';
    }
  }
</script>

<Button on:click={cycleTheme} variant="ghost" size="sm" {ariaLabel}>
  <Icon name={iconName} size={18} />
</Button>
