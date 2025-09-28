<!-- src/lib/components/ui/Icon.svelte (ACTUALIZADO CON ICONO DE CARPETA) -->
<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  // --- Iconos de `svelte-feather-icons` ---
  import {
    // Iconos existentes
    PlusIcon,
    CommandIcon,
    DownloadCloudIcon,
    UploadCloudIcon,
    FileTextIcon,
    XIcon,
    CopyIcon,
    Trash2Icon,
    StarIcon, // Usado para 'sparkles'
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

    // *** NUEVO ICONO AÑADIDO PARA SPRINT 3 ***
    FolderIcon,
  } from 'svelte-feather-icons';

  interface FeatherIconProps {
    size?: string;
    strokeWidth?: number;
    class?: string;
  }

  const icons: Record<string, typeof SvelteComponent<FeatherIconProps>> = {
    // Generales y de Archivo
    plus: PlusIcon,
    command: CommandIcon,
    'download-cloud': DownloadCloudIcon,
    'upload-cloud': UploadCloudIcon,
    'file-text': FileTextIcon,
    folder: FolderIcon, // <-- ¡AÑADIDO AQUÍ!

    // UI y Acciones
    x: XIcon,
    copy: CopyIcon,
    'trash-2': Trash2Icon,
    sparkles: StarIcon,
    'pen-tool': PenToolIcon,

    // Funcionalidades
    zap: ZapIcon,
    'volume-2': Volume2Icon,
    play: PlayIcon,
    pause: PauseIcon,
    'x-circle': XCircleIcon,

    // Onboarding y Ayuda
    lock: LockIcon,
    'help-circle': HelpCircleIcon,

    // Editor de Texto
    bold: BoldIcon,
    italic: ItalicIcon,
    list: ListIcon,
    type: TypeIcon,
  };

  export let name: keyof typeof icons;
  export let size: number = 16;
  export let strokeWidth: number = 2;
</script>

<svelte:component this={icons[name]} size={String(size)} {strokeWidth} />
