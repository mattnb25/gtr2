<script>
    import Controls from "./tabs/Controls.svelte";
    import Score from "./tabs/Score.svelte";
    import Track from "./tabs/Track.svelte";
    import Bar from "./tabs/Bar.svelte";
    import Beat from "./tabs/Beat.svelte";
    import Note from "./tabs/Note.svelte";
    import { project } from "$lib/core/index.svelte.js";

    let activeTab = $state("score");
    let pb = $derived(project.playback);
</script>

<div id="tab-content" class:playing={pb.isPlaying}>
    {#if activeTab === "score"}
        <Score />
    {:else if activeTab === "controls"}
        <Controls />
    {:else if activeTab === "track"}
        <Track />
    {:else if activeTab === "bar"}
        <Bar />
    {:else if activeTab === "beat"}
        <Beat />
    {:else if activeTab === "note"}
        <Note />
    {/if}
</div>

<div id="tabs" class:playing={pb.isPlaying}>
    {#each ["score", "controls", "track", "bar", "beat", "note"] as tab}
        <button
            class:active={activeTab === tab}
            onclick={() => {
                activeTab = tab;
            }}
        >
            {tab}
        </button>
    {/each}
</div>

<style>
    #tabs {
        display: flex;
        background: var(--color-border);
        border-top: 1px solid var(--color-border);
        border-width: 1px 0;
        padding: var(--spacing-xs);
        gap: var(--spacing-xs);
        overflow-x: auto;
        flex-shrink: 0;
    }

    #tabs button {
        border: 1px solid transparent;
        color: var(--color-text-muted);
    }

    #tabs button.active {
        background: var(--color-bg);
        color: var(--color-text-dark);
        border: 1px solid var(--color-border);
    }

    #tabs button:hover:not(.active) {
        color: var(--color-text-dark);
    }

    #tab-content {
        display: flex;
        padding: var(--spacing-xs);
        border-top: 1px solid var(--color-border);
        gap: var(--spacing-xs);
        align-items: center;
        width: 100%;
        overflow-x: auto;
        flex-shrink: 0;
    }

    #tab-content.playing {
        pointer-events: none;
        opacity: 0.6;
    }

    #tabs.playing {
        pointer-events: none;
        opacity: 0.6;
    }
</style>
