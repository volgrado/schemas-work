<!-- src/lib/components/ui/Icon.svelte -->
<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  // --- Iconos de `svelte-feather-icons` ---
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
    SkipBackIcon,
    SkipForwardIcon,
    MinusIcon,
    ImageIcon,
    VideoIcon,
  } from 'svelte-feather-icons';

  const icons: Record<string, any> = {
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
    'skip-back': SkipBackIcon,
    'skip-forward': SkipForwardIcon,
    minus: MinusIcon,
    image: ImageIcon,
    video: VideoIcon,
    'plus-slash-minus': MinusIcon,
  };

  export let name: keyof typeof icons;
  export let size: number = 16;
  export let strokeWidth: number = 2;
</script>

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
