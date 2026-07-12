<script>
  import Score from "./tabs/Score.svelte";
  import Track from "./tabs/Track.svelte";
  import Bar from "./tabs/Bar.svelte";
  import Beat from "./tabs/Beat.svelte";
  import Note from "./tabs/Note.svelte";

  let activeTab = $state("score");
</script>

<div id="tab-content">
  {#if activeTab === "score"}
    <Score></Score>
  {:else if activeTab === "track"}
    <Track></Track>
  {:else if activeTab === "bar"}
    <Bar></Bar>
  {:else if activeTab === "beat"}
    <Beat></Beat>
  {:else if activeTab === "note"}
    <Note></Note>
  {/if}
</div>

<div id="tabs">
  {#each ["score", "track", "bar", "beat", "note"] as tab}
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
    background: #f5f5f5;
    border: solid #e0e0e0;
    border-width: 1px 0;
    padding: 4px;
    gap: 4px;
  }

  #tabs button {
    border: 1px solid transparent;
    color: dimgray;
  }

  #tabs button.active {
    background: #fff;
    color: black;
    border: 1px solid #e0e0e0;
  }

  #tabs button:hover:not(.active) {
    color: black;
  }

  #tab-content {
    display: flex;
    padding: 4px;
    gap: 4px;
    align-items: center;
  }
</style>
