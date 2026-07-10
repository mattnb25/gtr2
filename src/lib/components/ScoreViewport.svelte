<script>
  import { onMount } from "svelte";
  import * as alphaTab from "@coderline/alphatab";

  let tabApi;
  let canvasEl;

  onMount(() => {
    const settings = {
      file: "https://www.alphatab.net/files/canon.gp",
      enableLazyLoading: true,
      core: {
        fontDirectory: "/font/",
        includeNoteBounds: true,
      },
      player: {
        soundFont: "/soundfont/sonivox.sf2",
        enablePlayer: true,
      },
      display: {
        effectBandPaddingBottom: 8,
        firstNotationStaffPaddingTop: 4,
      },
    };

    const tabApi = new alphaTab.AlphaTabApi(canvasEl, settings);

    return () => {
      tabApi.destroy();
    };
  });
</script>

<div class="canvas" style="overflow-x: hidden;" bind:this={canvasEl}></div>
