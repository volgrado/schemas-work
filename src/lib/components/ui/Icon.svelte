<!--
@component
Icon

Dynamic wrapper for rendering icons from `svelte-feather-icons`.
Allows rendering a specific icon by passing its name as a prop.
Provides consistent sizing, styling, and customization.
-->
<script lang="ts">
  import type { SvelteComponent, ComponentType } from 'svelte';

  // --- Icons from `svelte-feather-icons` ---
  import {
    // General UI
    PlusIcon,
    MinusIcon,
    XIcon,
    CommandIcon,
    HelpCircleIcon,
    CheckCircleIcon,
    XCircleIcon,
    AlertTriangleIcon,
    LoaderIcon,
    CopyIcon,
    Trash2Icon,
    Edit3Icon,
    PenToolIcon,
    FolderIcon,
    FileTextIcon,
    LockIcon,
    PlusSquareIcon,
    SunIcon,
    MoonIcon,
    MonitorIcon,
    SettingsIcon,

    // Media & Audio
    BookOpenIcon,
    PlayIcon,
    PauseIcon,
    MicIcon,
    Volume2Icon,
    FastForwardIcon,
    SkipBackIcon,
    SkipForwardIcon,
    ImageIcon,
    VideoIcon,

    // Text & Formatting
    TypeIcon,
    BoldIcon,
    ItalicIcon,
    ListIcon,

    // Conceptual
    ZapIcon,
    StarIcon,
    GitBranchIcon,
    DownloadCloudIcon,
    UploadCloudIcon,
  } from 'svelte-feather-icons';

  interface FeatherIconProps {
    size?: string;
    strokeWidth?: number;
    class?: string;
  }

  // --- Icon mapping ---
  const icons: Record<
    string,
    ComponentType<SvelteComponent<FeatherIconProps>>
  > = {
    // General & UI
    plus: PlusIcon,
    minus: MinusIcon,
    x: XIcon,
    command: CommandIcon,
    'help-circle': HelpCircleIcon,
    'check-circle': CheckCircleIcon,
    'x-circle': XCircleIcon,
    'alert-triangle': AlertTriangleIcon,
    loader: LoaderIcon,
    copy: CopyIcon,
    'trash-2': Trash2Icon,
    'edit-3': Edit3Icon,
    'pen-tool': PenToolIcon,
    folder: FolderIcon,
    'file-text': FileTextIcon,
    lock: LockIcon,
    'plus-square': PlusSquareIcon,
    sun: SunIcon,
    moon: MoonIcon,
    monitor: MonitorIcon,
    settings: SettingsIcon,

    // Media & Audio
    play: PlayIcon,
    pause: PauseIcon,
    mic: MicIcon,
    'volume-2': Volume2Icon,
    'fast-forward': FastForwardIcon,
    'skip-back': SkipBackIcon,
    'skip-forward': SkipForwardIcon,
    image: ImageIcon,
    video: VideoIcon,

    // Text & Formatting
    type: TypeIcon,
    bold: BoldIcon,
    italic: ItalicIcon,
    list: ListIcon,

    // Conceptual & App-Specific
    'book-open': BookOpenIcon,
    zap: ZapIcon,
    sparkles: StarIcon,
    'git-branch': GitBranchIcon,
    'download-cloud': DownloadCloudIcon,
    'upload-cloud': UploadCloudIcon,

    // Custom alias
    'plus-slash-minus': MinusIcon,
  };

  /** @prop {keyof typeof icons} name - Icon name */
  export let name: keyof typeof icons;

  /** @prop {string | number} [size='16'] - Icon size in pixels */
  export let size: string | number = '16';

  /** @prop {number} [strokeWidth=2] - Stroke width */
  export let strokeWidth: number = 2;
</script>

<span
  class="icon-wrapper {$$restProps.class || ''}"
  aria-hidden="true"
  style="width: {size}px; height: {size}px;"
  {...$$restProps}
>
  <svelte:component this={icons[name]} size={String(size)} {strokeWidth} />
</span>

<style>
  .icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1; /* Prevent extra space below icon */
  }
</style>
