<script>
  import { onMount } from "svelte";
  import { project } from "$lib/project.svelte.js";

  let canvasEl;

  let apiSettings = {
    enableLazyLoading: true,
    core: {
      engine: "html5",
      fontDirectory: "/font/",
      includeNoteBounds: true,
    },
    player: {
      soundFont: "/soundfont/sonivox.sf3",
      enablePlayer: true,
      enableCursor: true,
      enableElementHighlighting: true,
      enableUserInteraction: true,
      scrollElement: canvasEl,
    },
    display: {
      padding: [18, 28],
    },
  };

  onMount(() => {
    project.initApi(canvasEl, apiSettings);
    project.newFile();
    return () => project.destroyApi();
  });
</script>

<div class="canvas" bind:this={canvasEl}></div>

<style>
  .canvas {
    flex-grow: 1;
    overflow-x: hidden;
  }
</style>
