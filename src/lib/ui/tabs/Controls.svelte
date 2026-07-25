<script>
  import { project } from "$lib/core/index.svelte";
  import PopoverBtn from "$lib/assets/PopoverBtn.svelte";
</script>

<button onclick={() => project.playback.toggle()}>
  {project.playback.isPlaying ? "pause" : "play"}
</button>

<PopoverBtn name="playback options"></PopoverBtn>
