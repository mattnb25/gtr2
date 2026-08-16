<script>
  import { project } from "$lib/core/index.svelte.js";
  import * as alphaTab from "@coderline/alphatab";
  import { DRUM_KIT } from "$lib/core/drums.svelte.js";

  let ed = $derived(project.editor);

  // Which track is currently in inline-rename mode (-1 = none)
  let renamingIndex = $state(-1);
  let renameValue = $state("");

  const GM_INSTRUMENTS = [
    "Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano",
    "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet",
    "Celesta", "Glockenspiel", "Music Box", "Vibraphone",
    "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
    "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ",
    "Reed Organ", "Accordion", "Harmonica", "Tango Accordion",
    "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)",
    "Electric Guitar (muted)", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics",
    "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass",
    "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2",
    "Violin", "Viola", "Cello", "Contrabass",
    "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani",
    "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2",
    "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit",
    "Trumpet", "Trombone", "Tuba", "Muted Trumpet",
    "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2",
    "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax",
    "Oboe", "English Horn", "Bassoon", "Clarinet",
    "Piccolo", "Flute", "Recorder", "Pan Flute",
    "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina",
    "Lead 1 (square)", "Lead 2 (sawtooth)", "Lead 3 (calliope)", "Lead 4 (chiff)",
    "Lead 5 (charang)", "Lead 6 (voice)", "Lead 7 (fifths)", "Lead 8 (bass + lead)",
    "Pad 1 (new age)", "Pad 2 (warm)", "Pad 3 (polysynth)", "Pad 4 (choir)",
    "Pad 5 (bowed)", "Pad 6 (metallic)", "Pad 7 (halo)", "Pad 8 (sweep)",
    "FX 1 (rain)", "FX 2 (soundtrack)", "FX 3 (crystal)", "FX 4 (atmosphere)",
    "FX 5 (brightness)", "FX 6 (goblins)", "FX 7 (echoes)", "FX 8 (sci-fi)",
    "Sitar", "Banjo", "Shamisen", "Koto",
    "Kalimba", "Bagpipe", "Fiddle", "Shanai",
    "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock",
    "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal",
    "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet",
    "Telephone Ring", "Helicopter", "Applause", "Gunshot",
  ];

  const STAFF_MODES = [
    { key: "standard", label: "Standard" },
    { key: "scoretab", label: "Standard + Tab" },
    { key: "tab", label: "Tab" },
    { key: "drum", label: "Drums" },
  ];

  const CLEFS = [
    { key: alphaTab.model.Clef.G2, label: "Treble" },
    { key: alphaTab.model.Clef.F4, label: "Bass" },
    { key: alphaTab.model.Clef.C4, label: "Alto" },
    { key: alphaTab.model.Clef.C3, label: "Tenor" },
    { key: alphaTab.model.Clef.Neutral, label: "Percussion" },
  ];

  const STAFF_PRESETS = [
    { key: "treble", label: "Treble", clefs: [alphaTab.model.Clef.G2], modes: ["standard"] },
    { key: "bass", label: "Bass", clefs: [alphaTab.model.Clef.F4], modes: ["standard"] },
    { key: "grand", label: "Grand Staff", clefs: [alphaTab.model.Clef.G2, alphaTab.model.Clef.F4], modes: ["standard", "standard"] },
    { key: "alto", label: "Alto", clefs: [alphaTab.model.Clef.C4], modes: ["standard"] },
    { key: "tenor", label: "Tenor", clefs: [alphaTab.model.Clef.C3], modes: ["standard"] },
  ];

  const selected = $derived(ed.selectedTrackIndex);
  const hasTracks = $derived(ed.tracks.length > 0);
  const mode = $derived(ed.getTrackStaffMode(selected));
  const isDrum = $derived(mode === "drum");
  const program = $derived(ed.getTrackProgram(selected));
  const isFretted = $derived(ed.isFrettedInstrument(selected));
  const stringCount = $derived(ed.getTrackStringCount(selected));
  const staffCount = $derived(ed.getStaffCount(selected));
  // Read the tuning fresh each time (it reads engine state) so edits re-render
  const tuningPitches = $derived.by(() => {
    const t = ed.getTrackTuning(selected);
    return t ? [...t.tunings] : [];
  });
  const drumKit = $derived(ed.drumKit);

  function startRename(index) {
    renamingIndex = index;
    renameValue = ed.tracks[index]?.name || "";
  }

  function commitRename(index) {
    if (renamingIndex === index && renameValue.trim()) {
      ed.renameTrack(index, renameValue);
    }
    renamingIndex = -1;
  }

  function setProgram(e) {
    ed.setTrackProgram(selected, Number(e.target.value));
  }

  function setMode(e) {
    ed.setTrackStaffMode(selected, e.target.dataset.mode);
  }

  function setCount(e) {
    ed.setTrackStringCount(selected, Number(e.target.value));
  }

  function nudgePitch(stringIndex, delta) {
    const midi = tuningPitches[stringIndex];
    if (midi != null) ed.setTrackStringPitch(selected, stringIndex, midi + delta);
  }

  function pitchName(midi) {
    const [n, o] = alphaTab.model.Tuning.getTextPartsForTuning(midi);
    return `${n}${o}`;
  }
</script>

<!--
  Track tab — instrumentation / mixer

  Add, Remove, Rename
  Mute, Solo, Visibility (per track)
  Multi-voice count (1–4, per track)
  Instrument (MIDI program)
  Staves (standard / standard+tab / drums)
  Tuning (string count, custom pitches) — guitar/tab only
  Drum kit (articulation picker) — drums only
-->

<div class="track-tab">
  <div class="track-strip">
    <div class="group">
      <span class="group-label">Tracks</span>
    </div>

    {#each ed.tracks as track, i}
      <div class="chip" class:active={i === ed.selectedTrackIndex}>
        {#if renamingIndex === i}
          <input
            class="rename-input"
            bind:value={renameValue}
            autofocus
            onkeydown={(e) => {
              if (e.key === "Enter") commitRename(i);
              if (e.key === "Escape") renamingIndex = -1;
            }}
            onblur={() => commitRename(i)}
          />
          <button
            class="mini ok"
            title="Save name"
            onclick={() => commitRename(i)}>✓</button
          >
        {:else}
          <button
            class="name-btn"
            class:active={i === ed.selectedTrackIndex}
            title={`Edit track ${i + 1}`}
            onclick={() => ed.selectTrack(i)}
          >
            {track.name || `Track ${i + 1}`}
          </button>
          <button
            class="mini mute"
            class:on={track.playbackInfo.isMute}
            title="Mute"
            onclick={() => ed.toggleTrackMute(i)}>M</button
          >
          <button
            class="mini solo"
            class:on={track.playbackInfo.isSolo}
            title="Solo"
            onclick={() => ed.toggleTrackSolo(i)}>S</button
          >
          <button
            class="mini"
            class:on={track.isVisibleOnMultiTrack}
            title={track.isVisibleOnMultiTrack ? "Hide track" : "Show track"}
            onclick={() => ed.toggleTrackVisible(i)}>👁</button
          >
          <button
            class="mini voices"
            class:on={i === ed.selectedTrackIndex}
            title="Voices per bar (1–4) — configure in the detail panel"
            onclick={() => ed.selectTrack(i)}
          >{ed.getTrackVoiceCount(i)}v</button>
          <button
            class="mini"
            title="Rename"
            onclick={() => startRename(i)}>✏</button
          >
          <button
            class="mini danger"
            title="Remove track"
            disabled={ed.tracks.length <= 1}
            onclick={() => ed.removeTrack(i)}>✕</button
          >
        {/if}
      </div>
    {/each}

    <div class="divider"></div>

    <button class="add-btn" onclick={() => ed.addTrack()} title="Add track">
      + Add Track
    </button>
  </div>

  {#if hasTracks}
    <div class="detail">
      <div class="detail-label" title="Selected track">{ed.tracks[selected]?.name || `Track ${selected + 1}`}</div>

      <div class="field">
        <span class="field-label">Instrument</span>
        {#if isDrum}
          <span class="drum-note">Drums (Percussion)</span>
        {:else}
          <select value={program} onchange={setProgram}>
            {#each GM_INSTRUMENTS as name, p}
              <option value={p}>{name}</option>
            {/each}
          </select>
        {/if}
      </div>

      <div class="field">
        <span class="field-label">Staves</span>
        <div class="seg">
          {#each STAFF_MODES as m}
            <button
              class:active={mode === m.key}
              data-mode={m.key}
              title={m.label}
              onclick={setMode}
            >{m.label}</button>
          {/each}
        </div>
      </div>

      <div class="field">
        <span class="field-label">Staff Preset</span>
        <div class="seg">
          {#each STAFF_PRESETS as p}
            <button
              class:active={ed.getTrackStaffPreset(selected) === p.key}
              data-preset={p.key}
              title={p.label}
              onclick={(e) => ed.setTrackStaffPreset(selected, e.target.dataset.preset)}
            >{p.label}</button>
          {/each}
        </div>
      </div>

      <div class="field">
        <span class="field-label">Clefs ({staffCount})</span>
        <div class="clefs">
          {#each Array(staffCount) as _, si}
            <div class="clef-row">
              <span class="clef-label">Staff {si + 1}</span>
              <select
                value={ed.getStaffClef(selected, si)}
                onchange={(e) => ed.setStaffClef(selected, si, Number(e.target.value))}
              >
                {#each CLEFS as c}
                  <option value={c.key}>{c.label}</option>
                {/each}
              </select>
              {#if staffCount > 1}
                <button
                  class="mini danger"
                  title="Remove staff"
                  onclick={() => ed.removeStaff(selected, si)}
                >✕</button>
              {/if}
            </div>
          {/each}
        </div>
        <button
          class="mini"
          title="Add staff"
          onclick={() => ed.addStaff(selected)}
        >+ Staff</button>
      </div>

      <div class="field">
        <span class="field-label">Voices</span>
        <div class="seg">
          {#each [1, 2, 3, 4] as vn}
            <button
              class:active={ed.activeVoiceIndex === vn - 1}
              class:disabled={vn > ed.getTrackVoiceCount(selected)}
              title={`Edit voice ${vn}`}
              onclick={() => ed.selectVoice(vn - 1)}
            >{vn}</button>
          {/each}
        </div>
        <button
          class="mini"
          title="Add voice"
          disabled={ed.getTrackVoiceCount(selected) >= 4}
          onclick={() => ed.addVoiceToTrack(selected)}
        >+</button>
        <button
          class="mini danger"
          title="Remove last voice (only if empty, so no notes are lost)"
          disabled={ed.getTrackVoiceCount(selected) <= 1}
          onclick={() => ed.removeVoiceFromTrack(selected)}
        >−</button>
        <span class="voices-hint">
          Editing voice {ed.activeVoiceIndex + 1} of {ed.getTrackVoiceCount(selected)}
        </span>
      </div>

      {#if isDrum}
        <div class="field drum-kit">
          <span class="field-label">Drum Kit</span>
          <div class="pads">
            {#each drumKit as item, i}
              <button
                class="pad"
                class:active={ed.drumSlot === i}
                title={item.name}
                onclick={() => ed.setDrumSlot(i)}
              >{item.short}</button>
            {/each}
          </div>
          <select
            value={ed.drumSlot}
            onchange={(e) => ed.setDrumSlot(Number(e.target.value))}
            title="All drum sounds"
          >
            {#each drumKit as item, i}
              <option value={i}>{item.name}</option>
            {/each}
          </select>
        </div>
      {:else if isFretted}
        <div class="field tuning">
          <span class="field-label">Tuning</span>
          <select
            class="count"
            value={stringCount}
            onchange={setCount}
            title="Number of strings (4–8)"
          >
            {#each [4, 5, 6, 7, 8] as c}
              <option value={c}>{c} strings</option>
            {/each}
          </select>
          <div class="pitches">
            {#each tuningPitches as midi, s}
              <div class="pitch-row">
                <span
                  class="pitch-num"
                  title={`String ${stringCount - s}`}
                >{stringCount - s}</span>
                <button
                  class="mini"
                  title="Lower pitch"
                  onclick={() => nudgePitch(s, -1)}
                >−</button>
                <span class="pitch-name">{pitchName(midi)}</span>
                <button
                  class="mini"
                  title="Raise pitch"
                  onclick={() => nudgePitch(s, 1)}
                >+</button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .track-tab {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    width: 100%;
  }

  .track-strip {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-wrap: nowrap;
  }

  .group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .group-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    padding: 0 4px;
    white-space: nowrap;
  }

  .divider {
    width: 1px;
    height: 20px;
    background: var(--color-border);
    margin: 0 var(--spacing-xs);
    flex-shrink: 0;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-subtle);
    flex-shrink: 0;
  }

  .chip.active {
    border-color: var(--color-primary);
    background: var(--color-primary-alpha-10);
  }

  .name-btn {
    border: 1px solid transparent;
    background: transparent;
    font-weight: 700;
    color: var(--color-text-dark);
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .name-btn.active {
    color: var(--color-primary);
  }

  .rename-input {
    width: 120px;
    padding: 2px 6px;
    font-size: 0.8rem;
  }

  .mini {
    padding: var(--spacing-xs) 6px;
    font-size: 0.75rem;
    border-radius: var(--radius-sm);
  }

  .mini.on {
    color: var(--color-bg);
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  .mini.mute.on {
    background: #d64541;
    border-color: #d64541;
  }

  .mini.solo.on {
    background: #e8a33d;
    border-color: #e8a33d;
  }

  .mini.danger {
    color: #d64541;
  }

  .mini.danger:disabled {
    color: var(--color-text-muted);
    cursor: default;
    opacity: 0.5;
  }

  .mini.ok {
    color: var(--color-primary);
  }

  .add-btn {
    flex-shrink: 0;
  }

  .detail {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-subtle);
    flex-wrap: wrap;
  }

  .detail-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-primary);
    white-space: nowrap;
  }

  .field {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .field-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .drum-note {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    padding: 2px 8px;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-sm);
  }

  .seg {
    display: flex;
    gap: 2px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 2px;
    background: var(--color-bg);
  }

  .seg button {
    padding: 2px 10px;
    font-size: 0.75rem;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .seg button.active {
    color: var(--color-bg);
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  .seg button.disabled {
    color: var(--color-text-muted);
    opacity: 0.4;
    pointer-events: none;
  }

  .voices-hint {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .drum-kit {
    align-items: flex-start;
    flex-direction: column;
  }

  .pads {
    display: grid;
    grid-template-columns: repeat(8, auto);
    gap: 2px;
  }

  .pad {
    padding: 2px 8px;
    font-size: 0.7rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  .pad.active {
    color: var(--color-bg);
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  .tuning select.count {
    width: 110px;
  }

  .pitches {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .pitch-row {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
  }

  .pitch-num {
    width: 14px;
    text-align: center;
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .pitch-name {
    width: 30px;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text-dark);
  }

  .clefs {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .clef-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .clef-label {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    width: 50px;
    flex-shrink: 0;
  }

  .clef-row select {
    width: 100px;
    font-size: 0.75rem;
  }

  .clef-row select.staff-mode {
    width: 120px;
  }

  .clefs {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .clef-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .clef-label {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    width: 50px;
    flex-shrink: 0;
  }
</style>
