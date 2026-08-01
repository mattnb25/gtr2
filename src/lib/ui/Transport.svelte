<script>
  import { project } from "$lib/core/index.svelte.js";
  import SplitPopoverBtn from "$lib/assets/SplitPopoverBtn.svelte";
  import NumInput from "$lib/assets/numInput.svelte";

  let pb = $derived(project.playback);

  function fmt(ms) {
    if (!ms || ms < 0) return "00:00";
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  let pct = $derived(pb.endTime ? (pb.currentTime / pb.endTime) * 100 : 0);
</script>

{#if pb.isRendered && pb.isPlayerReady}
  <div class="transport-bar">
    <SplitPopoverBtn
      name="playback-options"
      label={pb.isPlaying ? "Pause" : "Play"}
      onclick={() => pb.toggle()}
    >
      <div class="header">Playback</div>
      <label>
        <input
          type="checkbox"
          checked={pb.isMetronomeActive}
          onchange={(e) => pb.toggleMetronome(e.target.checked)}
        />
        Metronome
      </label>
      <label>
        <input
          type="checkbox"
          checked={pb.isCountInActive}
          onchange={(e) => pb.toggleCountIn(e.target.checked)}
        />
        Count-In
      </label>
      <div class="header">Tempo (%)</div>
      <NumInput
        min={25}
        max={200}
        step={5}
        value={Math.round(pb.playbackSpeed * 100)}
        callback={(v) => pb.setSpeed(v / 100)}
      />
      <div class="header">Metronome Vol (%)</div>
      <NumInput
        min={0}
        max={100}
        step={5}
        value={Math.round(pb.metronomeVol * 100)}
        callback={(v) => pb.setMetronomeVol(v / 100)}
      />
    </SplitPopoverBtn>

    <div class="scrubber">
      <div>
        {fmt(pb.currentTime)}
      </div>
      <input
        type="range"
        min="0"
        max={pb.endTime || 100}
        value={pb.currentTime}
        oninput={(e) => {
          pb.isSeeking = true;
          pb.currentTime = Number(e.target.value);
        }}
        onchange={(e) => pb.seek(Number(e.target.value))}
      />
    </div>
  </div>
{:else}
  <div class="transport-loading">
    <span class="spinner"></span>
    {#if pb.isRendered}
      Loading player...
    {:else}
      Rendering notation…
    {/if}
  </div>
{/if}

<style>

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

</style>
