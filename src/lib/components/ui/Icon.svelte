<!--
  @component
  Icon

  This component acts as a dynamic wrapper for rendering icons from the `svelte-feather-icons`
  library. It allows you to render a specific icon by passing its name as a prop, abstracting
  away the need to import each icon component individually in every file.

  It provides a consistent interface for sizing, styling, and customizing icons throughout the application.

  Props:
  - `name`: The name of the feather icon to display (e.g., 'plus', 'copy', 'git-branch'). This is a required prop.
  - `size`: The size of the icon in pixels, passed as a string or number. Defaults to '16'.
  - `strokeWidth`: The stroke width of the icon's lines. Defaults to 2.
  - `class`: Allows passing a custom CSS class to the wrapper span element.

  @restProps All other standard HTML attributes are passed directly to the wrapper `<span>` element.

  Usage:
  <Icon name="play" size="24" strokeWidth={1.5} class="text-green-500" />
-->
<script lang="ts">
  // CORRECTED: Import ComponentType to create a more specific type
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

    // Media & Audio
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

  // CORRECTED: Define a specific interface for the props our icons accept.
  // This makes our component type-safe.
  interface FeatherIconProps {
    size?: string;
    strokeWidth?: number;
    class?: string;
  }

  /**
   * A mapping of string names to their corresponding Svelte icon components.
   * This allows for dynamic icon rendering based on the `name` prop.
   */
  // CORRECTED: Use our more specific type for the icons dictionary.
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
    zap: ZapIcon, // Often used for AI or automation
    sparkles: StarIcon, // A common alias for special features
    'git-branch': GitBranchIcon, // For visualization/branching concepts
    'download-cloud': DownloadCloudIcon,
    'upload-cloud': UploadCloudIcon,

    // Special alias
    'plus-slash-minus': MinusIcon, // An example of a custom alias
  };

  /** @prop {keyof typeof icons} name - The name of the icon to render. */
  export let name: keyof typeof icons;
  /** @prop {string | number} [size='16'] - The size of the icon in pixels. */
  export let size: string | number = '16';
  /** @prop {number} [strokeWidth=2] - The stroke width for the icon lines. */
  export let strokeWidth: number = 2;
</script>

<!-- 
  The wrapper span ensures consistent layout and allows for easy styling.
  `aria-hidden="true"` is used because icons are typically decorative; 
  if an icon is interactive, its parent button should have an `aria-label`.
-->
<span
  class="icon-wrapper {$$props.class || ''}"
  aria-hidden="true"
  style="width: {size}px; height: {size}px;"
  {...$$restProps}
>
  <!-- 
    Dynamically renders the selected icon component.
    We convert `size` to a string to match the underlying library's prop type.
  -->
  <svelte:component this={icons[name]} size={String(size)} {strokeWidth} />
</span>

<style>
  .icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1; /* Prevents extra space below the icon */
  }
</style>
