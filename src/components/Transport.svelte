<script>
  import { storeWritable, getState, setState } from "../store.js";
  import { undo, redo } from "../lib/historyRouter.js";
  import { exportScore, newEmptyScore } from "../lib/atManager.js";
  import { syncSoundFont, SOUND_FONTS, setSoundFont } from "../lib/soundfont.js";
  import { clearHistory } from "../lib/historyRouter.js";
  import { clearSelection } from "../lib/selection.js";
  import { updateScoreInfo } from "../lib/commands/index.js";
  import * as alphaTab from "@coderline/alphatab";

  let st = $storeWritable;
  $: st = $storeWritable;
  $: api = st.api;
  $: playing = st.transport?.playing ?? false;
  $: canUndo = st.canUndo;
  $: canRedo = st.canRedo;
  $: tracks = st.api?.score?.tracks ?? [];
  $: activeTrackIndex = st.selection?.trackIndex ?? 0;

  let menuOpen = false;
  let fileInput;
  let editTitle = "";
  let editArtist = "";

  $: if (menuOpen && api?.score) {
    editTitle = api.score.title || "";
    editArtist = api.score.artist || "";
  }

  function handlePlay() { if (!api) return; playing ? api.pause() : api.play(); }
  function handleStop() { api?.stop(); }

  function handleNew() {
    if (!confirm("Start a new score? Unsaved changes will be lost.")) return;
    if (!api) return;
    clearSelection(); clearHistory(); newEmptyScore(api); menuOpen = false;
  }
  function handleImport() { fileInput?.click(); menuOpen = false; }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file || !api) return;
    e.target.value = "";
    const buf = await file.arrayBuffer();
    api.load(new Uint8Array(buf));
  }

  function doExport(format) {
    const result = exportScore(api, format);
    if (!result) { alert("Nothing to export."); return; }
    const { bytes, ext, mime } = result;
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const title = api?.score?.title?.trim() || "score";
    a.href = url; a.download = `${title}.${ext}`; a.click();
    URL.revokeObjectURL(url);
    menuOpen = false;
  }

  function commitScoreInfo() {
    if (api?.score) updateScoreInfo(editTitle, editArtist);
  }

  function handleZoom(delta) {
    const z = Math.max(0.5, Math.min(2, (getState().view?.zoom ?? 1) + delta));
    setState({ view: { ...getState().view, zoom: z } });
    if (api) { api.settings.display.scale = z; api.updateSettings(); api.render(); }
  }

  function handleLayout(e) {
    if (!api) return;
    const mode = e.target.value;
    setState({ view: { ...getState().view, layoutMode: mode } });
    api.settings.display.layoutMode = mode === "horizontal"
      ? alphaTab.LayoutMode.Horizontal : alphaTab.LayoutMode.Page;
    api.updateSettings(); api.render();
  }

  function handleNotation(e) {
    if (!api) return;
    const val = e.target.value;
    setState({ view: { ...getState().view, notation: val } });
    if (val === "stems") {
      api.settings.notation.staveProfile = alphaTab.StaveProfile.Tab;
      api.settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
    } else {
      api.settings.notation.staveProfile = alphaTab.StaveProfile.Default;
      api.settings.notation.rhythmMode = alphaTab.TabRhythmMode.Hidden;
    }
    api.updateSettings(); api.render();
  }

  function handleMetronome(e) {
    if (!api) return;
    api.settings.player.metronomeVolume = e.target.checked ? 3 : 0;
    api.updateSettings();
    setState({ transport: { ...getState().transport, metronome: e.target.checked } });
  }
  function handleCountIn(e) {
    if (!api) return;
    api.settings.player.enableCountIn = e.target.checked;
    api.updateSettings();
    setState({ transport: { ...getState().transport, countIn: e.target.checked } });
  }
  function handleSpeed(e) {
    if (!api) return;
    const s = Number(e.target.value) / 100;
    api.settings.player.playbackSpeed = s;
    api.updateSettings();
    setState({ transport: { ...getState().transport, playbackSpeed: s } });
  }
  function handleSoundFont(e) { setSoundFont(e.target.value); }

  function closeMenu() { menuOpen = false; }

  function selectTrack(idx) {
    const { selection } = getState();
    if (selection) setState({ selection: { ...selection, trackIndex: idx, staffIndex: 0 } });
    else setState({ selection: { trackIndex: idx, staffIndex: 0, voiceIndex: 0, barIndex: 0, beatIndex: 0 } });
  }
</script>

<svelte:window on:keydown={(e) => { if (e.key === "Escape") closeMenu(); }} />

<input bind:this={fileInput} type="file"
  accept=".gp,.gp3,.gp4,.gp5,.gpx,.gp7,.gpif,.alphaTex,.tex"
  style="display:none;" on:change={handleFileSelected} />

<header class="top-bar">
  <!-- Play controls -->
  <div class="bar-group">
    <button class="icon-btn play" class:playing on:click={handlePlay} disabled={!api}>
      {playing ? "⏸" : "▶"}
    </button>
    <button class="icon-btn" on:click={handleStop} disabled={!api}>⏹</button>
  </div>

  <div class="bar-sep"></div>

  <!-- Undo/Redo -->
  <div class="bar-group">
    <button class="icon-btn" on:click={undo} disabled={!canUndo} title="Undo">↩</button>
    <button class="icon-btn" on:click={redo} disabled={!canRedo} title="Redo">↪</button>
  </div>

  <div class="bar-sep"></div>

  <!-- Zoom -->
  <div class="bar-group">
    <button class="icon-btn small" on:click={() => handleZoom(-0.1)} disabled={!api}>−</button>
    <span class="zoom-val">{Math.round((st.view?.zoom ?? 1) * 100)}%</span>
    <button class="icon-btn small" on:click={() => handleZoom(0.1)} disabled={!api}>+</button>
  </div>

  <div class="spacer"></div>

  <!-- Track selector (center) -->
  {#if tracks.length > 0}
    <div class="track-selector">
      {#each tracks as track, i}
        <button class="track-pill" class:active={activeTrackIndex === i}
          on:click={() => selectTrack(i)} title={track.name || `Track ${i+1}`}>
          {track.name || `Track ${i+1}`}
        </button>
      {/each}
    </div>
  {/if}

  <div class="spacer"></div>

  <!-- Hamburger menu -->
  <div class="menu-wrap">
    <button class="icon-btn menu-btn" on:click|stopPropagation={() => menuOpen = !menuOpen}>☰</button>

    {#if menuOpen}
      <div class="menu-backdrop" on:click={closeMenu} role="presentation"></div>
      <div class="menu-sheet" on:click|stopPropagation on:keydown|stopPropagation role="dialog" tabindex="0">

        <!-- Score info -->
        <div class="menu-section-label">Score</div>
        <div class="menu-field-row">
          <span>Title</span>
          <input class="menu-field-input" type="text" bind:value={editTitle}
            on:blur={commitScoreInfo}
            on:keydown={(e) => e.key === "Enter" && commitScoreInfo()} />
        </div>
        <div class="menu-field-row">
          <span>Artist</span>
          <input class="menu-field-input" type="text" bind:value={editArtist}
            on:blur={commitScoreInfo}
            on:keydown={(e) => e.key === "Enter" && commitScoreInfo()} />
        </div>

        <div class="menu-divider"></div>
        <div class="menu-section-label">File</div>
        <button class="menu-item" on:click={handleNew} disabled={!api}>📄 New score</button>
        <button class="menu-item" on:click={handleImport}>📂 Import .gp file…</button>
        <button class="menu-item" on:click={() => doExport("gp")} disabled={!api}>⬇ Export Guitar Pro (.gp)</button>
        <button class="menu-item" on:click={() => doExport("alphatex")} disabled={!api}>⬇ Export AlphaTex (.alphatex)</button>

        <div class="menu-divider"></div>
        <div class="menu-section-label">Display</div>

        <div class="menu-row">
          <span>Notation</span>
          <select class="menu-select" value={st.view?.notation ?? "both"} on:change={handleNotation} disabled={!api}>
            <option value="both">Full Notation</option>
            <option value="stems">Stems Only</option>
          </select>
        </div>

        <div class="menu-row">
          <span>Layout</span>
          <select class="menu-select" value={st.view?.layoutMode ?? "page"} on:change={handleLayout} disabled={!api}>
            <option value="page">Page</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </div>

        <div class="menu-row">
          <span>Sound</span>
          <select class="menu-select" value={st.soundFont ?? "sonivox"} on:change={handleSoundFont} disabled={!api}>
            {#each SOUND_FONTS as sf}
              <option value={sf.id}>{sf.label}</option>
            {/each}
          </select>
        </div>

        <div class="menu-divider"></div>
        <div class="menu-section-label">Playback</div>

        <label class="menu-toggle">
          <span>Metronome</span>
          <input type="checkbox" checked={st.transport?.metronome} on:change={handleMetronome} disabled={!api} />
        </label>
        <label class="menu-toggle">
          <span>Count-in</span>
          <input type="checkbox" checked={st.transport?.countIn} on:change={handleCountIn} disabled={!api} />
        </label>
        <div class="menu-row">
          <span>Speed</span>
          <input type="range" min="25" max="200"
            value={Math.round((st.transport?.playbackSpeed ?? 1) * 100)}
            on:input={handleSpeed} disabled={!api} class="menu-slider" />
          <span class="menu-val">{Math.round((st.transport?.playbackSpeed ?? 1) * 100)}%</span>
        </div>
      </div>
    {/if}
  </div>
</header>

<style>
  .top-bar {
    display: flex; align-items: center; gap: 2px;
    padding: 0 8px; height: 48px;
    background: #1a1a1a; flex-shrink: 0;
    position: relative; z-index: 10;
  }
  .bar-group { display: flex; align-items: center; gap: 2px; }
  .bar-sep { width: 1px; height: 20px; background: #444; margin: 0 4px; flex-shrink: 0; }
  .spacer { flex: 1; min-width: 4px; }

  .icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border: none; border-radius: 8px;
    background: transparent; color: #ddd; font-size: 16px; line-height: 1;
    touch-action: manipulation; transition: background 0.15s;
  }
  .icon-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
  .icon-btn:active:not(:disabled) { background: rgba(255,255,255,0.2); }
  .icon-btn:disabled { opacity: 0.35; cursor: default; }
  .icon-btn.play { color: #fff; }
  .icon-btn.playing { background: rgba(80,200,80,0.2); color: #80e080; }
  .icon-btn.small { width: 28px; height: 28px; font-size: 14px; }

  .zoom-val { font-size: 11px; color: #aaa; min-width: 32px; text-align: center; user-select: none; }

  /* Track selector */
  .track-selector {
    display: flex; align-items: center; gap: 4px;
    overflow-x: auto; max-width: 300px;
    -webkit-overflow-scrolling: touch;
  }
  .track-selector::-webkit-scrollbar { display: none; }
  .track-pill {
    padding: 4px 10px; border: 1px solid #444; border-radius: 20px;
    background: transparent; color: #888; font-size: 11px; white-space: nowrap;
    touch-action: manipulation; flex-shrink: 0;
    transition: all 0.15s;
  }
  .track-pill.active { background: rgba(255,255,255,0.15); color: #fff; border-color: #666; }
  .track-pill:hover:not(.active) { border-color: #555; color: #bbb; }

  /* Hamburger */
  .menu-wrap { position: relative; }
  .menu-btn { font-size: 20px; color: #ddd; }

  .menu-backdrop { position: fixed; inset: 0; z-index: 49; }
  .menu-sheet {
    position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
    background: #fff; border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.35);
    min-width: 280px; padding: 8px 0;
    max-height: 80vh; overflow-y: auto;
  }
  .menu-section-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #999; padding: 8px 16px 2px;
  }
  .menu-item {
    display: block; width: 100%; padding: 10px 16px;
    text-align: left; background: none; border: none;
    font-size: 14px; color: #111; cursor: pointer;
  }
  .menu-item:hover:not(:disabled) { background: #f5f5f5; }
  .menu-item:disabled { opacity: 0.4; cursor: default; }
  .menu-divider { height: 1px; background: #eee; margin: 4px 0; }

  .menu-field-row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 16px;
  }
  .menu-field-row span { font-size: 13px; color: #666; min-width: 40px; }
  .menu-field-input {
    flex: 1; padding: 6px 10px;
    border: 1px solid #e0e0e0; border-radius: 8px;
    font-size: 14px; background: #fafafa;
    outline: none;
  }
  .menu-field-input:focus { border-color: #4a90e2; background: #fff; }

  .menu-toggle {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; font-size: 14px; color: #111; cursor: pointer;
  }
  .menu-toggle input { width: 20px; height: 20px; }
  .menu-row {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 16px; font-size: 14px; color: #111;
  }
  .menu-row span { flex: 1; }
  .menu-slider { flex: 2; height: 4px; accent-color: #4a90e2; }
  .menu-val { font-size: 12px; color: #666; min-width: 36px; text-align: right; }
  .menu-select {
    flex: 2; padding: 4px 8px;
    border: 1px solid #ccc; border-radius: 6px;
    font-size: 13px; background: #fff;
  }
</style>
