<!-- src/lib/components/ui/Icon.svelte (CORREGIDO CON EL TIPO ADECUADO) -->
<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  // --- Iconos de `svelte-feather-icons` ---
  // ... (todos tus imports se mantienen igual) ...
  import {
    PlusIcon,
    CommandIcon,
    DownloadCloudIcon,
    UploadCloudIcon,
    FileTextIcon,
    XIcon,
    CopyIcon,
    Trash2Icon,
    StarIcon,
    ZapIcon,
    Volume2Icon,
    PlayIcon,
    PauseIcon,
    XCircleIcon,
    LockIcon,
    HelpCircleIcon,
    PenToolIcon,
    BoldIcon,
    ItalicIcon,
    ListIcon,
    TypeIcon,
    FolderIcon,
    CheckCircleIcon,
    GitBranchIcon,
    Edit3Icon,
    LoaderIcon,
    AlertTriangleIcon,
    MicIcon,
    FastForwardIcon,
  } from 'svelte-feather-icons';

  // --- LA SOLUCIÓN ESTÁ EN ESTA LÍNEA ---
  // En lugar de `typeof SvelteComponent`, usamos `any`.
  // Esto le dice a TypeScript: "Confía en mí, sé que todos los valores en este
  // objeto son constructores de componentes de Svelte compatibles."
  const icons: Record<string, any> = {
    // ... (tu mapa de iconos se mantiene EXACTAMENTE igual) ...
    plus: PlusIcon,
    command: CommandIcon,
    'download-cloud': DownloadCloudIcon,
    'upload-cloud': UploadCloudIcon,
    'file-text': FileTextIcon,
    folder: FolderIcon,
    x: XIcon,
    copy: CopyIcon,
    'trash-2': Trash2Icon,
    sparkles: StarIcon,
    'pen-tool': PenToolIcon,
    zap: ZapIcon,
    'volume-2': Volume2Icon,
    play: PlayIcon,
    pause: PauseIcon,
    'x-circle': XCircleIcon,
    lock: LockIcon,
    'help-circle': HelpCircleIcon,
    bold: BoldIcon,
    italic: ItalicIcon,
    list: ListIcon,
    type: TypeIcon,
    'check-circle': CheckCircleIcon,
    'git-branch': GitBranchIcon,
    'edit-3': Edit3Icon,
    loader: LoaderIcon,
    'alert-triangle': AlertTriangleIcon,
    mic: MicIcon,
    'fast-forward': FastForwardIcon,
  };

  // --- Props del componente (sin cambios) ---
  export let name: keyof typeof icons;
  export let size: number = 16;
  export let strokeWidth: number = 2;
</script>

<!--
  El resto del componente (el `<span>` wrapper y el `<svelte:component>`)
  se mantiene EXACTAMENTE igual que en la solución anterior.
-->
<span
  class="icon-wrapper {$$props.class || ''}"
  aria-hidden="true"
  {...$$restProps}
>
  <svelte:component this={icons[name]} size={String(size)} {strokeWidth} />
</span>

<style>
  .icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
</style>
