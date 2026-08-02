<script>
  import { onMount } from "svelte";
  import { project } from "$lib/core/index.svelte.js";

  let canvasEl = $state(null);
  let ed = $derived(project.editor);
  let cursor = $derived(ed.cursorBox);
  let selBoxes = $derived(ed.selectionBoxes);

  onMount(() => {
    project.init(canvasEl);
    project.io.newFile();
    return () => project.engine.destroy();
  });
</script>

<div class="viewer-container">
  <div class="canvas" bind:this={canvasEl}></div>

  <!-- Range selection boxes -->
  {#each selBoxes as box}
    <div
      class="selection-range-box"
      style="left: {box.x}px; top: {box.y}px; width: {box.w}px; height: {box.h}px;"
    ></div>
  {/each}

  <!-- Active note/string cursor box -->
  {#if cursor}
    <div
      class="note-cursor"
      style="left: {cursor.x}px; top: {cursor.y}px; width: {cursor.w}px; height: {cursor.h}px;"
    ></div>
  {/if}
</div>

<style>
  .viewer-container {
    position: relative;
    flex: 1 1 0%;
    min-height: 0;
    width: 100%;
    overflow: auto;
  }

  .canvas {
    width: 100%;
    min-height: 100%;
  }

  .selection-range-box {
    position: absolute;
    background: rgba(90, 110, 224, 0.18);
    border: 1px dashed rgba(90, 110, 224, 0.6);
    border-radius: 3px;
    pointer-events: none;
    z-index: 5;
  }

  .note-cursor {
    position: absolute;
    border: 2px solid #5a6ee0;
    background: rgba(90, 110, 224, 0.3);
    border-radius: 4px;
    pointer-events: none;
    z-index: 10;
    box-shadow: 0 0 0 1px #ffffff, 0 0 6px rgba(90, 110, 224, 0.5);
    transition: all 0.05s ease-out;
  }
</style>
