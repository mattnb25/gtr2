<script>
    import { ctrlCommands } from "$lib/commands.svelte.js";
    import { project } from "$lib/state.svelte.js";

    let playbackBtnText = $state("play");

    project.api.playerStateChanged.on((e) => {
        playbackBtnText = e.state === 1 ? "pause" : "play";
    });
</script>

<button onclick={() => ctrlCommands.togglePlayback()}>
    {playbackBtnText}
</button>
