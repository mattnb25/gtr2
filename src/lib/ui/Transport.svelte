<script>
  import { project } from "$lib/core/index.svelte.js";
  import SplitPopoverBtn from "$lib/assets/SplitPopoverBtn.svelte";
  import NumInput from "$lib/assets/NumInput.svelte";
  import Switch from "$lib/assets/Switch.svelte";

  let pb = $derived(project.playback);

  function fmt(ms) {
    if (!ms || ms < 0) return "00:00";
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  let pct = $derived(pb.endTime ? (pb.currentTime / pb.endTime) * 100 : 0);
</script>

<div class="transport-bar">
  {#if pb.isRendered && pb.isPlayerReady}
    <SplitPopoverBtn
      name="playback-options"
      label={pb.isPlaying ? "Pause" : "Play"}
      onclick={() => pb.toggle()}
    >
      <Switch
        label="Count-In"
        checked={pb.isCountInActive}
        onchange={(e) => pb.toggleCountIn(e.target.checked)}
      />
      <Switch
        label="Metronome"
        checked={pb.isMetronomeActive}
        onchange={(e) => pb.toggleMetronome(e.target.checked)}
      />

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

    <label for="scrubber" style="--progress: {pct}%">
      <div id="time-text">
        {fmt(pb.currentTime)}
      </div>
      <input
        id="scrubber"
        type="range"
        min="0"
        max={pb.endTime || 100}
        step="any"
        value={pb.currentTime}
        oninput={(e) => {
          pb.isSeeking = true;
          pb.currentTime = Number(e.target.value);
        }}
        onchange={(e) => {
          const t = Number(e.target.value);
          pb.seek(t);
        }}
      />
    </label>
  {:else}
    <span class="spinner"></span>
    {#if pb.isRendered}
      Loading player...
    {:else}
      Rendering notation…
    {/if}
  {/if}
</div>

<style>
  .transport-bar {
    padding: var(--spacing-xs);
    display: flex;
    border-top: 1px solid var(--color-border);
    align-items: center;
    gap: var(--spacing-sm);
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  label {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    width: 100%;
  }

  #time-text,
  #scrubber {
    grid-column: 1;
    grid-row: 1;
  }

  #time-text {
    padding: var(--spacing-sm);
    z-index: 1;
    pointer-events: none;
    color: black;
    text-align: end;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    overflow: clip;
    padding: 0;
    background-image: linear-gradient(var(--color-primary-alpha-10));
    background-size: var(--progress, 0%) 100%;
    background-repeat: no-repeat;
    transition: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
    height: 29px;
    width: 4px;
    background-color: var(--color-primary-alpha-50);
  }

  input[type="range"]::-moz-range-thumb {
    appearance: none;
    cursor: pointer;
    height: 100%;
    height: 29px;
    width: 4px;
    background-color: var(--color-primary-alpha-50);
  }

  :global(.transport-bar .main-btn) {
    width: 6rem;
    justify-content: center;
  }
</style>
