<script>
  import { onMount } from "svelte";
  import { project } from "$lib/core/index.svelte.js";

  let canvasEl = $state(null);

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
    },
    display: {
      padding: [18, 28],
    },
  };

  onMount(() => {
    apiSettings.player.scrollElement = canvasEl;
    project.init(canvasEl, apiSettings);
    project.io.newFile();
    return () => project.engine.destroy();
  });
</script>

<div class="canvas" bind:this={canvasEl}></div>

<style>
  .canvas {
    flex-grow: 1;
    overflow-x: hidden;
  }
</style>
