<script>
  import { onMount } from "svelte";
  import { initApi, destroyApi, openFile } from "$lib/state.svelte.js";

  let canvasEl;

  let apiSettings = {
    enableLazyLoading: true,
    core: {
      fontDirectory: "/font/",
      includeNoteBounds: true,
    },
    player: {
      soundFont: "/soundfont/sonivox.sf3",
      enablePlayer: true,
    },
    display: {
      effectBandPaddingBottom: 8,
      firstNotationStaffPaddingTop: 4,
      resources: {
        copyrightFont: "bold 12px 'IBM Plex Sans', sans-serif",
        fretboardNumberFont: "12px 'IBM Plex Sans', sans-serif",
        numberedNotationFont: "16px 'IBM Plex Sans', sans-serif",
        tablatureFont: "13px 'IBM Plex Sans', sans-serif",
        graceFont: "11px 'IBM Plex Sans', sans-serif",
        barNumberFont: "11px 'IBM Plex Sans', sans-serif",
        timerFont: "12px 'IBM Plex Sans', sans-serif",

        // Serif Elements
        titleFont: "bold 28px 'IBM Plex Serif', serif",
        subTitleFont: "20px 'IBM Plex Serif', serif",
        wordsFont: "14px 'IBM Plex Serif', serif",
        effectFont: "italic 12px 'IBM Plex Serif', serif",
        directionsFont: "bold 14px 'IBM Plex Serif', serif",
        inlineFingeringFont: "12px 'IBM Plex Serif', serif",
        markerFont: "bold 14px 'IBM Plex Serif', serif",
      },
    },
  };

  onMount(() => {
    initApi(canvasEl, apiSettings);
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
