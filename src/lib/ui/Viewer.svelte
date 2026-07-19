<script>
    import { onMount } from "svelte";
    import { initApi, destroyApi } from "$lib/state.svelte.js";
    import { scoreCommands } from "$lib/commands.svelte.js";

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
        },
        display: {
            padding: [18, 28],
        },
    };

    onMount(() => {
        initApi(canvasEl, apiSettings);
        scoreCommands.newFile();
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
