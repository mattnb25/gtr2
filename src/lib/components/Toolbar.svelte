<script>
  import Score from "./tabs/Score.svelte";
  import Track from "./tabs/Track.svelte";
  import Bar from "./tabs/Bar.svelte";
  import Beat from "./tabs/Beat.svelte";
  import Note from "./tabs/Note.svelte";

  let activeTab = $state("score");
</script>

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

<style>
  #tabs {
    display: flex;
    background: #f5f5f5;
    border-top: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
    padding: 4px;
    gap: 2px;
  }
  #tabs button {
    text-transform: capitalize;
    padding: 6px 14px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: dimgray;
    transition: all 0.15s;
  }
  #tabs button.active {
    background: #fff;
    color: #111;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  }
</style>
