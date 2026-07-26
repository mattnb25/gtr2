<script>
  import { project } from "$lib/core/index.svelte";
  import SplitPopoverBtn from "$lib/assets/SplitPopoverBtn.svelte";
</script>

<SplitPopoverBtn
  name="playback-options"
  label={project.playback.isPlaying ? "pause" : "play"}
  onclick={() => project.playback.toggle()}
>
  <div class="header">Playback Options</div>
  <button onclick={() => console.log("Option 1")}>Option 1</button>
  <button onclick={() => console.log("Option 2")}>Option 2</button>
</SplitPopoverBtn>

