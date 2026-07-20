<script>
  import { project } from "$lib/project.svelte.js";
  import PopoverBtn from "$lib/assets/PopoverBtn.svelte";
</script>

<button onclick={() => project.togglePlayback()}>
  {project.isPlaying ? "pause" : "play"}
</button>

<PopoverBtn name="playback options"></PopoverBtn>
