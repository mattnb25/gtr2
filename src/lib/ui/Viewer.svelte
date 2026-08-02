<script>
  import { onMount } from "svelte";
  import { project } from "$lib/core/index.svelte.js";

  let canvasEl = $state(null);

  onMount(() => {
    project.init(canvasEl);
    project.io.newFile();
    return () => project.engine.destroy();
  });
</script>

<div class="canvas" bind:this={canvasEl}></div>

<style>
  .canvas {
    scrollbar-width: none;
    overflow: auto;
    flex-grow: 1;
  }
</style>
