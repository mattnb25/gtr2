<script>
  import { onMount } from "svelte";
  import { initApi, destroyApi, openFile } from "$lib/state.svelte.js";

  let canvasEl;

  onMount(() => {
    initApi(canvasEl);
    openFile("/bach.gp5");
    return () => destroyApi();
  });
</script>

<div class="canvas" bind:this={canvasEl}></div>

<style>
  .canvas {
    flex-grow: 1;
    overflow-x: hidden;
  }
</style>
