<script>
  import { storeWritable, getState, setState } from "../store.js";
  import { resolveBeat } from "../lib/selection.js";
  import { resolveNote } from "../lib/scoreMutator.js";
  import { moveBeat, moveString } from "../lib/selection.js";
  import { undo, redo } from "../lib/historyRouter.js";
  import * as alphaTab from "@coderline/alphatab";
  import {
    changeSelectedFret, deleteSelectedNote, deleteSelectedBeat,
    insertBeatAfterSelection, stepSelectedDuration, toggleSelectedDot,
    DURATION_LADDER, setSelectedDuration,
    toggleSelectedPalmMute, toggleSelectedGhost, toggleSelectedDead,
    toggleSelectedLetRing, toggleSelectedHammerPull,
    cycleSelectedVibrato, VIBRATO_LABELS,
    tieSelectedNote,
    DYNAMICS_LADDER, DYNAMICS_LABELS, setSelectedDynamics,
    SLIDE_OUT_OPTIONS, SLIDE_IN_OPTIONS, setSelectedSlideOut, setSelectedSlideIn,
    BEND_PRESETS, setSelectedBend, clearSelectedBend,
    WHAMMY_PRESETS, setSelectedWhammy, clearSelectedWhammy,
    TREMOLO_PRESETS, setSelectedTremolo, clearSelectedTremolo,
    toggleSelectedTap,
    HARMONIC_OPTIONS, setSelectedHarmonic,
    GRACE_OPTIONS, insertSelectedGrace,
    setSelectedTimeSignature, setSelectedTempo,
    KEY_SIGNATURE_OPTIONS, setSelectedKeySignature,
    insertMeasureAfterSelection, deleteSelectedMeasure,
    setSelectedBeatText, SetRepeatOpenCommand, SetRepeatCloseCommand, SetVoltaCommand,
    setSelectedOttava, setSelectedBrush, setSelectedLyrics,
    toggleTrackMute, toggleTrackSolo, setSelectedTuning,
    setSelectedClef, setSelectedTripletFeel, setSelectedTuplet,
    setSelectedWah, setSelectedCrescendo, setSelectedPickStroke,
    setSelectedFade, setSelectedRasgueado, toggleSelectedLeftHandTap,
    setSelectedAccent, setSelectedDots,
    toggleSelectedSlap, toggleSelectedPop, setSelectedTextAnnotation,
    setSelectedRepeatStart, setSelectedRepeatCount
  } from "../lib/commands/index.js";

  let st = $storeWritable;
  $: st = $storeWritable;

  $: api = st.api;
  $: sel = st.selection;
  $: selectedString = st.selectedString;

  $: beat = sel && api?.score ? resolveBeat(api.score, sel) : null;
  $: note = beat && sel ? resolveNote(api.score, sel, selectedString) : null;
  $: disabled = !beat;

  $: beatDuration = beat?.duration ?? alphaTab.model.Duration.Quarter;
  $: beatDots = beat?.dots ?? 0;
  $: beatDynamics = beat?.dynamics ?? alphaTab.model.DynamicValue.MF;
  $: beatTap = beat?.tap ?? false;
  $: beatWhammy = beat?.whammyBarType ?? alphaTab.model.WhammyType.None;
  $: beatTremolo = beat?.tremoloSpeed ?? null;

  $: noteVibrato = note?.vibrato ?? alphaTab.model.VibratoType.None;
  $: notePalmMute = note?.isPalmMute ?? false;
  $: noteGhost = note?.isGhost ?? false;
  $: noteDead = note?.isDead ?? false;
  $: noteLetRing = note?.isLetRing ?? false;
  $: noteHopo = note?.isHammerPullOrigin ?? false;
  $: noteTie = note?.isTieDestination ?? false;
  $: noteSlideOut = note?.slideOutType ?? alphaTab.model.SlideOutType.None;
  $: noteSlideIn = note?.slideInType ?? alphaTab.model.SlideInType.None;
  $: noteBend = note?.bendType ?? alphaTab.model.BendType.None;
  $: noteHarmonic = note?.harmonicType ?? alphaTab.model.HarmonicType.None;

  const DURATION_LABELS = ["𝅝", "𝅗𝅥", "♩", "♪", "𝅘𝅥𝅯", "𝅘𝅥𝅰"];
  const DURATION_LABELS_TEXT = ["Whole", "Half", "¼", "⅛", "1/16", "1/32"];

  let activeTab = "input";
  const TABS = [
    { id: "input", label: "Input" },
    { id: "note",  label: "Note" },
    { id: "fx",    label: "FX" },
    { id: "bar",   label: "Bar" },
    { id: "tracks", label: "Tracks & Tuning" }
  ];

  // Extra menus
  let showSlideMenu = false;
  let showBendMenu = false;
  let showWhammyMenu = false;
  let showTremoloMenu = false;
  let showHarmonicMenu = false;
  let showGraceMenu = false;
  let showTimeSig = false;
  let showKeySig = false;
  let showOttavaMenu = false;
  let showWahMenu = false;
  let showCrescendoMenu = false;
  let showPickStrokeMenu = false;
  let showFadeMenu = false;
  let showRasgueadoMenu = false;
  let showClefMenu = false;
  let showTripletFeelMenu = false;
  let showTupletMenu = false;
  let showAccentMenu = false;
  let showBrushMenu = false;
  let showRepeatCloseMenu = false;
  let showVoltaMenu = false;

  let timeSigNum = 4;
  let timeSigDenom = 4;
  let tempoVal = 120;

  // Reactivity for new advanced features
  $: beatLyricsText = beat?.lyrics?.[0] ?? "";
  $: beatTextVal = beat?.text ?? "";
  $: currRepeatCloseCount = sel && api?.score ? (api.score.masterBars[sel.barIndex]?.repeatCount ?? 0) : 0;
  $: currAlternateEnding = sel && api?.score ? (api.score.masterBars[sel.barIndex]?.alternateEndings ?? 0) : 0;
  $: beatOttava = beat?.ottava ?? 2; // Default Regular
  $: beatBrushType = beat?.brushType ?? 0;
  $: beatBrushDuration = beat?.brushDuration ?? 30;
  $: beatWah = beat?.wahPedal ?? 0;
  $: beatCrescendo = beat?.crescendo ?? 0;
  $: beatPickStroke = beat?.pickStroke ?? 0;
  $: beatFade = beat?.fade ?? 0;
  $: beatRasgueado = beat?.rasgueado ?? 0;
  $: beatTupletNum = beat?.tupletNumerator ?? -1;
  $: beatTupletDen = beat?.tupletDenominator ?? -1;

  $: noteAccentValue = note?.accentuated ?? 0; // AccentuationType
  $: noteLhtActive = note?.isLeftHandTapped ?? false;

  $: barClefValue = beat?.voice?.bar?.clef ?? 4; // Default G2
  $: mbTripletFeel = sel && api?.score ? (api.score.masterBars[sel.barIndex]?.tripletFeel ?? 0) : 0;
  $: mbSectionTextVal = sel && api?.score ? (api.score.masterBars[sel.barIndex]?.section?.text ?? "") : "";

  // Track rendering visibility state
  let visibleTracks = [0];
  $: {
    if (api?.score && visibleTracks.length === 0) {
      visibleTracks = [sel?.trackIndex ?? 0];
    }
  }

  const TUNING_PRESETS = {
    4: [
      { name: "Bass Standard Tuning", tunings: [55, 47, 43, 38] },
      { name: "Bass Dropped D", tunings: [55, 47, 43, 36] }
    ],
    5: [
      { name: "Bass 5-String Standard", tunings: [55, 47, 43, 38, 31] }
    ],
    6: [
      { name: "Guitar Standard Tuning", tunings: [64, 59, 55, 50, 45, 40] },
      { name: "Guitar Tune down ½ step", tunings: [63, 58, 54, 49, 44, 39] },
      { name: "Guitar Dropped D Tuning", tunings: [64, 59, 55, 50, 45, 38] },
      { name: "Guitar Dropped C Tuning", tunings: [62, 57, 53, 48, 43, 36] }
    ],
    7: [
      { name: "Guitar 7-String Standard", tunings: [64, 59, 55, 50, 45, 40, 31] }
    ],
    8: [
      { name: "Guitar 8-String Standard", tunings: [64, 59, 55, 50, 45, 40, 31, 26] }
    ]
  };

  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function getNoteName(midi) {
    const note = midi % 12;
    const oct = Math.floor(midi / 12) - 1;
    return `${NOTE_NAMES[note]}${oct}`;
  }

  function toggleTrackVisibility(idx) {
    if (visibleTracks.includes(idx)) {
      if (visibleTracks.length > 1) {
        visibleTracks = visibleTracks.filter(t => t !== idx);
      }
    } else {
      visibleTracks = [...visibleTracks, idx];
    }
    if (api) {
      const tracksToRender = visibleTracks.map(i => api.score.tracks[i]).filter(Boolean);
      api.renderTracks(tracksToRender);
    }
  }

  function triggerScoreUpdate() {
    if (api) {
      api.score.finish(api.settings);
      api.render();
      st.scoreVersion = (st.scoreVersion || 0) + 1;
      storeWritable.set(st);
    }
  }

  function applyTuningPreset(name) {
    const stringCount = api.score.tracks[sel?.trackIndex ?? 0]?.staves?.[0]?.stringCount || 6;
    const p = TUNING_PRESETS[stringCount]?.find(item => item.name === name);
    if (p) {
      setSelectedTuning(sel.trackIndex, p.name, p.tunings);
      triggerScoreUpdate();
    }
  }

  function updateStringPitch(sIdx, newMidi) {
    const trackIdx = sel?.trackIndex ?? 0;
    const staff = api.score.tracks[trackIdx]?.staves?.[0];
    if (!staff) return;
    const tunings = staff.tuning?.tunings ? [...staff.tuning.tunings] : [64, 59, 55, 50, 45, 40];
    tunings[sIdx] = newMidi;
    setSelectedTuning(trackIdx, "Custom", tunings);
    triggerScoreUpdate();
  }

  function adjustStringCount(delta) {
    const trackIdx = sel?.trackIndex ?? 0;
    const staff = api.score.tracks[trackIdx]?.staves?.[0];
    if (!staff) return;
    const newCount = (staff.stringCount || 6) + delta;
    if (newCount < 4 || newCount > 8) return;
    let tunings = [];
    if (newCount === 4) tunings = [55, 47, 43, 38];
    else if (newCount === 5) tunings = [55, 47, 43, 38, 31];
    else if (newCount === 6) tunings = [64, 59, 55, 50, 45, 40];
    else if (newCount === 7) tunings = [64, 59, 55, 50, 45, 40, 31];
    else if (newCount === 8) tunings = [64, 59, 55, 50, 45, 40, 31, 26];

    setSelectedTuning(trackIdx, `Guitar ${newCount}-String Standard`, tunings);
    triggerScoreUpdate();
  }

  // Repeats triggers
  function triggerRepeatOpen() {
    const mb = api.score.masterBars[sel.barIndex];
    if (mb) {
      mb.isRepeatStart = !mb.isRepeatStart;
      triggerScoreUpdate();
    }
  }

  function triggerRepeatClose(count) {
    const mb = api.score.masterBars[sel.barIndex];
    if (mb) {
      mb.repeatCount = count;
      triggerScoreUpdate();
    }
  }

  function triggerVolta(alternateEndings) {
    const mb = api.score.masterBars[sel.barIndex];
    if (mb) {
      mb.alternateEndings = alternateEndings;
      triggerScoreUpdate();
    }
  }

  function triggerSectionText(text) {
    const mb = api.score.masterBars[sel.barIndex];
    if (mb) {
      if (!mb.section) {
        try { mb.section = new alphaTab.model.Section(); } catch { mb.section = { text: "", marker: "A" }; }
      }
      mb.section.text = text;
      mb.section.marker = text ? text[0] : "";
      triggerScoreUpdate();
    }
  }

  $: {
    if (sel && api?.score) {
      const mb = api.score.masterBars[sel.barIndex];
      if (mb) {
        timeSigNum = mb.timeSignatureNumerator;
        timeSigDenom = mb.timeSignatureDenominator;
        const auto = mb.tempoAutomations?.find(a =>
          a.type === alphaTab.model.AutomationType.Tempo && a.ratioPosition === 0);
        if (auto) tempoVal = auto.value;
      }
    }
  }

  function closeAll() {
    showSlideMenu = showBendMenu = showWhammyMenu = showTremoloMenu =
    showHarmonicMenu = showGraceMenu = showTimeSig = showKeySig =
    showOttavaMenu = showWahMenu = showCrescendoMenu = showPickStrokeMenu =
    showFadeMenu = showRasgueadoMenu = showClefMenu = showTripletFeelMenu =
    showTupletMenu = showAccentMenu = showBrushMenu = showRepeatCloseMenu =
    showVoltaMenu = false;
  }

  function toggleMenu(name) {
    const was = {
      showSlideMenu, showBendMenu, showWhammyMenu, showTremoloMenu,
      showHarmonicMenu, showGraceMenu, showTimeSig, showKeySig,
      showOttavaMenu, showWahMenu, showCrescendoMenu, showPickStrokeMenu,
      showFadeMenu, showRasgueadoMenu, showClefMenu, showTripletFeelMenu,
      showTupletMenu, showAccentMenu, showBrushMenu, showRepeatCloseMenu,
      showVoltaMenu
    }[name];
    closeAll();
    if (!was) {
      if (name === "showSlideMenu") showSlideMenu = true;
      else if (name === "showBendMenu") showBendMenu = true;
      else if (name === "showWhammyMenu") showWhammyMenu = true;
      else if (name === "showTremoloMenu") showTremoloMenu = true;
      else if (name === "showHarmonicMenu") showHarmonicMenu = true;
      else if (name === "showGraceMenu") showGraceMenu = true;
      else if (name === "showTimeSig") showTimeSig = true;
      else if (name === "showKeySig") showKeySig = true;
      else if (name === "showOttavaMenu") showOttavaMenu = true;
      else if (name === "showWahMenu") showWahMenu = true;
      else if (name === "showCrescendoMenu") showCrescendoMenu = true;
      else if (name === "showPickStrokeMenu") showPickStrokeMenu = true;
      else if (name === "showFadeMenu") showFadeMenu = true;
      else if (name === "showRasgueadoMenu") showRasgueadoMenu = true;
      else if (name === "showClefMenu") showClefMenu = true;
      else if (name === "showTripletFeelMenu") showTripletFeelMenu = true;
      else if (name === "showTupletMenu") showTupletMenu = true;
      else if (name === "showAccentMenu") showAccentMenu = true;
      else if (name === "showBrushMenu") showBrushMenu = true;
      else if (name === "showRepeatCloseMenu") showRepeatCloseMenu = true;
      else if (name === "showVoltaMenu") showVoltaMenu = true;
    }
  }

  function applyTimeSig() { setSelectedTimeSignature(timeSigNum, timeSigDenom); showTimeSig = false; }
  function applyTempo() { setSelectedTempo(tempoVal); }

  function numpadFret(n) { changeSelectedFret(n); }
  function numpadLeft() { moveBeat(-1); }
  function numpadRight() { moveBeat(1); }
  function numpadUp() { moveString(-1); }
  function numpadDown() { moveString(1); }
  function numpadDelete() { deleteSelectedNote(); }
  function numpadDot() { toggleSelectedDot(); }
  function numpadInsert() { insertBeatAfterSelection(); }
</script>

<svelte:window on:click={closeAll} />

<div class="bottom-panel" on:click|stopPropagation role="presentation">
  <!-- Tab bar -->
  <div class="tab-bar">
    {#each TABS as tab}
      <button class="tab-btn" class:active={activeTab === tab.id}
        on:click={() => { activeTab = tab.id; closeAll(); }}>
        {tab.label}
      </button>
    {/each}

    <!-- Selection hint at right -->
    <div class="sel-hint">
      {#if sel}
        Bar {sel.barIndex + 1} · Beat {sel.beatIndex + 1} · Str {selectedString}
      {:else}
        tap a note
      {/if}
    </div>
  </div>

  <!-- Tab content -->
  <div class="tab-content">

    <!-- ── INPUT tab: numpad + dpad ── -->
    {#if activeTab === "input"}
      <div class="input-grid">
        <!-- D-pad column -->
        <div class="dpad">
          <div class="dpad-row">
            <div class="dpad-empty"></div>
            <button class="dpad-btn" on:click={numpadUp}>↑</button>
            <div class="dpad-empty"></div>
          </div>
          <div class="dpad-row">
            <button class="dpad-btn" on:click={numpadLeft}>←</button>
            <div class="dpad-empty"></div>
            <button class="dpad-btn" on:click={numpadRight}>→</button>
          </div>
          <div class="dpad-row">
            <div class="dpad-empty"></div>
            <button class="dpad-btn" on:click={numpadDown}>↓</button>
            <div class="dpad-empty"></div>
          </div>
          <div class="dpad-row">
            <button class="dpad-btn action" on:click={numpadDelete} disabled={!sel}>⌫</button>
            <button class="dpad-btn action" on:click={numpadDot} disabled={!sel}>·</button>
            <button class="dpad-btn action" on:click={numpadInsert} disabled={!sel}>+</button>
          </div>
        </div>

        <!-- Numpad column -->
        <div class="numpad">
          <div class="numpad-row">
            <button class="num-btn" on:click={() => numpadFret(7)} disabled={!sel}>7</button>
            <button class="num-btn" on:click={() => numpadFret(8)} disabled={!sel}>8</button>
            <button class="num-btn" on:click={() => numpadFret(9)} disabled={!sel}>9</button>
          </div>
          <div class="numpad-row">
            <button class="num-btn" on:click={() => numpadFret(4)} disabled={!sel}>4</button>
            <button class="num-btn" on:click={() => numpadFret(5)} disabled={!sel}>5</button>
            <button class="num-btn" on:click={() => numpadFret(6)} disabled={!sel}>6</button>
          </div>
          <div class="numpad-row">
            <button class="num-btn" on:click={() => numpadFret(1)} disabled={!sel}>1</button>
            <button class="num-btn" on:click={() => numpadFret(2)} disabled={!sel}>2</button>
            <button class="num-btn" on:click={() => numpadFret(3)} disabled={!sel}>3</button>
          </div>
          <div class="numpad-row">
            <button class="num-btn zero" on:click={() => numpadFret(0)} disabled={!sel}>0</button>
          </div>
        </div>
      </div>

    <!-- ── NOTE tab ── -->
    {:else if activeTab === "note"}
      <div class="scroll-row">
        <div class="btn-group-label">Duration</div>
        {#each DURATION_LADDER as dur, i}
          <button class="eff-btn" class:active={beatDuration === dur && !disabled}
            on:click={() => setSelectedDuration(dur)} {disabled}
            title={DURATION_LABELS_TEXT[i]}>
            {DURATION_LABELS_TEXT[i]}
          </button>
        {/each}

        <div class="grp-sep"></div>
        <div class="btn-group-label">Dots</div>
        <button class="eff-btn" class:active={beatDots === 0 && !disabled} on:click={() => setSelectedDots(0)} {disabled}>No Dot</button>
        <button class="eff-btn" class:active={beatDots === 1 && !disabled} on:click={() => setSelectedDots(1)} {disabled}>·</button>
        <button class="eff-btn" class:active={beatDots === 2 && !disabled} on:click={() => setSelectedDots(2)} {disabled}>··</button>

        <div class="grp-sep"></div>
        <div class="btn-group-label">Dynamics</div>
        {#each DYNAMICS_LADDER as dyn, i}
          <button class="eff-btn dyn-btn" class:active={beatDynamics === dyn && !disabled}
            on:click={() => setSelectedDynamics(dyn)} {disabled}>{DYNAMICS_LABELS[i]}</button>
        {/each}

        <div class="grp-sep"></div>
        <div class="btn-group-label">Articulation</div>
        <button class="eff-btn" class:active={notePalmMute && !disabled}
          on:click={toggleSelectedPalmMute} {disabled}>PM</button>
        <button class="eff-btn" class:active={noteGhost && !disabled}
          on:click={toggleSelectedGhost} {disabled}>Ghost</button>
        <button class="eff-btn" class:active={noteDead && !disabled}
          on:click={toggleSelectedDead} {disabled}>Dead</button>
        <button class="eff-btn" class:active={noteVibrato !== 0 && !disabled}
          on:click={cycleSelectedVibrato} {disabled}>
          {noteVibrato !== 0 ? (VIBRATO_LABELS[noteVibrato] ?? "Vibrato") : "Vibrato"}
        </button>
        <button class="eff-btn" class:active={beatTap && !disabled}
          on:click={toggleSelectedTap} {disabled}>Tap</button>
        <button class="eff-btn" class:active={noteLhtActive && !disabled}
          on:click={toggleSelectedLeftHandTap} {disabled}>LH Tap</button>

        <div class="grp-sep"></div>
        <div class="btn-group-label">Accentuation</div>
        <button class="eff-btn" class:active={noteAccentValue === 0 && !disabled} on:click={() => setSelectedAccent(0)} {disabled}>None</button>
        <button class="eff-btn" class:active={noteAccentValue === 1 && !disabled} on:click={() => setSelectedAccent(1)} {disabled}>Accent</button>
        <button class="eff-btn" class:active={noteAccentValue === 2 && !disabled} on:click={() => setSelectedAccent(2)} {disabled}>Heavy</button>
        <button class="eff-btn" class:active={noteAccentValue === 3 && !disabled} on:click={() => setSelectedAccent(3)} {disabled}>Tenuto</button>

        <div class="grp-sep"></div>
        <div class="btn-group-label">Pick Stroke</div>
        <button class="eff-btn" class:active={beatPickStroke === 0 && !disabled} on:click={() => setSelectedPickStroke(0)} {disabled}>None</button>
        <button class="eff-btn" class:active={beatPickStroke === 2 && !disabled} on:click={() => setSelectedPickStroke(2)} {disabled}>🖚 Down</button>
        <button class="eff-btn" class:active={beatPickStroke === 1 && !disabled} on:click={() => setSelectedPickStroke(1)} {disabled}>🖙 Up</button>

        <div class="grp-sep"></div>
        <div class="btn-group-label">Pitch</div>
        <button class="eff-btn" class:active={noteLetRing && !disabled}
          on:click={toggleSelectedLetRing} {disabled}>Let ring</button>
        <button class="eff-btn" class:active={noteHopo && !disabled}
          on:click={toggleSelectedHammerPull} {disabled}>HO/PO</button>
        <button class="eff-btn" class:active={noteTie && !disabled}
          on:click={tieSelectedNote} {disabled}>Tie</button>
      </div>

    <!-- ── FX tab ── -->
    {:else if activeTab === "fx"}
      <div class="scroll-row">
        <!-- Slide -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={noteSlideOut !== 0 || noteSlideIn !== 0}
            on:click|stopPropagation={() => toggleMenu("showSlideMenu")} {disabled}>Slide ▾</button>
          {#if showSlideMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <div class="dd-group-label">Slide out</div>
              {#each SLIDE_OUT_OPTIONS as opt}
                <button class="dd-item" class:active={noteSlideOut === opt.value}
                  on:click={() => { setSelectedSlideOut(opt.value); closeAll(); }}>{opt.label}</button>
              {/each}
              <div class="dd-group-label">Slide in</div>
              {#each SLIDE_IN_OPTIONS as opt}
                <button class="dd-item" class:active={noteSlideIn === opt.value}
                  on:click={() => { setSelectedSlideIn(opt.value); closeAll(); }}>{opt.label}</button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Bend -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={noteBend !== 0 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showBendMenu")} {disabled}>Bend ▾</button>
          {#if showBendMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              {#each BEND_PRESETS as p}
                <button class="dd-item" class:active={noteBend === p.bendType}
                  on:click={() => { setSelectedBend(p); closeAll(); }}>{p.label}</button>
              {/each}
              <button class="dd-item clear" on:click={() => { clearSelectedBend(); closeAll(); }}>Clear</button>
            </div>
          {/if}
        </div>

        <!-- Whammy -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={beatWhammy !== 0 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showWhammyMenu")} {disabled}>Whammy ▾</button>
          {#if showWhammyMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              {#each WHAMMY_PRESETS as p}
                <button class="dd-item" class:active={beatWhammy === p.whammyType}
                  on:click={() => { setSelectedWhammy(p); closeAll(); }}>{p.label}</button>
              {/each}
              <button class="dd-item clear" on:click={() => { clearSelectedWhammy(); closeAll(); }}>Clear</button>
            </div>
          {/if}
        </div>

        <!-- Tremolo -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={beatTremolo !== null && !disabled}
            on:click|stopPropagation={() => toggleMenu("showTremoloMenu")} {disabled}>Tremolo ▾</button>
          {#if showTremoloMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              {#each TREMOLO_PRESETS as p}
                <button class="dd-item" class:active={beatTremolo === p.speed}
                  on:click={() => { setSelectedTremolo(p); closeAll(); }}>{p.label}</button>
              {/each}
              <button class="dd-item clear" on:click={() => { clearSelectedTremolo(); closeAll(); }}>Clear</button>
            </div>
          {/if}
        </div>

        <!-- Harmonic -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={noteHarmonic !== 0 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showHarmonicMenu")} {disabled}>Harmonic ▾</button>
          {#if showHarmonicMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              {#each HARMONIC_OPTIONS as opt}
                <button class="dd-item" class:active={noteHarmonic === opt.value}
                  on:click={() => { setSelectedHarmonic(opt.value); closeAll(); }}>{opt.label}</button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Grace -->
        <div class="dd-wrap">
          <button class="eff-btn" on:click|stopPropagation={() => toggleMenu("showGraceMenu")} {disabled}>Grace ▾</button>
          {#if showGraceMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              {#each GRACE_OPTIONS as opt}
                <button class="dd-item" on:click={() => { insertSelectedGrace(opt.value); closeAll(); }}>{opt.label}</button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Ottava -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={beatOttava !== 2 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showOttavaMenu")} {disabled}>Ottava ▾</button>
          {#if showOttavaMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={beatOttava === 2} on:click={() => { setSelectedOttava(2); closeAll(); }}>Regular (None)</button>
              <button class="dd-item" class:active={beatOttava === 1} on:click={() => { setSelectedOttava(1); closeAll(); }}>8va (Octave Up)</button>
              <button class="dd-item" class:active={beatOttava === 0} on:click={() => { setSelectedOttava(0); closeAll(); }}>15ma (2 Octaves Up)</button>
              <button class="dd-item" class:active={beatOttava === 3} on:click={() => { setSelectedOttava(3); closeAll(); }}>8vb (Octave Down)</button>
              <button class="dd-item" class:active={beatOttava === 4} on:click={() => { setSelectedOttava(4); closeAll(); }}>15mb (2 Octaves Down)</button>
            </div>
          {/if}
        </div>

        <!-- Rasgueado -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={beatRasgueado !== 0 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showRasgueadoMenu")} {disabled}>Rasgueado ▾</button>
          {#if showRasgueadoMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={beatRasgueado === 0} on:click={() => { setSelectedRasgueado(0); closeAll(); }}>None</button>
              <button class="dd-item" class:active={beatRasgueado === 1} on:click={() => { setSelectedRasgueado(1); closeAll(); }}>Ii</button>
              <button class="dd-item" class:active={beatRasgueado === 2} on:click={() => { setSelectedRasgueado(2); closeAll(); }}>Mi</button>
              <button class="dd-item" class:active={beatRasgueado === 3} on:click={() => { setSelectedRasgueado(3); closeAll(); }}>Mii Triplet</button>
              <button class="dd-item" class:active={beatRasgueado === 5} on:click={() => { setSelectedRasgueado(5); closeAll(); }}>Pmp Triplet</button>
            </div>
          {/if}
        </div>

        <!-- Brush & Arpeggio -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={beatBrushType !== 0 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showBrushMenu")} {disabled}>Arpeggio/Brush ▾</button>
          {#if showBrushMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={beatBrushType === 0} on:click={() => { setSelectedBrush(0); closeAll(); }}>None</button>
              <button class="dd-item" class:active={beatBrushType === 3} on:click={() => { setSelectedBrush(3); closeAll(); }}>Arpeggio Up</button>
              <button class="dd-item" class:active={beatBrushType === 4} on:click={() => { setSelectedBrush(4); closeAll(); }}>Arpeggio Down</button>
              <button class="dd-item" class:active={beatBrushType === 1} on:click={() => { setSelectedBrush(1); closeAll(); }}>Brush Up</button>
              <button class="dd-item" class:active={beatBrushType === 2} on:click={() => { setSelectedBrush(2); closeAll(); }}>Brush Down</button>
            </div>
          {/if}
        </div>

        <!-- Wah Pedal -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={beatWah !== 0 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showWahMenu")} {disabled}>Wah ▾</button>
          {#if showWahMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={beatWah === 0} on:click={() => { setSelectedWah(0); closeAll(); }}>None</button>
              <button class="dd-item" class:active={beatWah === 1} on:click={() => { setSelectedWah(1); closeAll(); }}>Open (o)</button>
              <button class="dd-item" class:active={beatWah === 2} on:click={() => { setSelectedWah(2); closeAll(); }}>Closed (+)</button>
            </div>
          {/if}
        </div>

        <!-- Crescendo & Decrescendo -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={beatCrescendo !== 0 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showCrescendoMenu")} {disabled}>Cresc / Decresc ▾</button>
          {#if showCrescendoMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={beatCrescendo === 0} on:click={() => { setSelectedCrescendo(0); closeAll(); }}>None</button>
              <button class="dd-item" class:active={beatCrescendo === 1} on:click={() => { setSelectedCrescendo(1); closeAll(); }}>Crescendo (&lt;)</button>
              <button class="dd-item" class:active={beatCrescendo === 2} on:click={() => { setSelectedCrescendo(2); closeAll(); }}>Decrescendo (&gt;)</button>
            </div>
          {/if}
        </div>

        <!-- Fade effects -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={beatFade !== 0 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showFadeMenu")} {disabled}>Fade ▾</button>
          {#if showFadeMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={beatFade === 0} on:click={() => { setSelectedFade(0); closeAll(); }}>None</button>
              <button class="dd-item" class:active={beatFade === 1} on:click={() => { setSelectedFade(1); closeAll(); }}>Fade In</button>
              <button class="dd-item" class:active={beatFade === 2} on:click={() => { setSelectedFade(2); closeAll(); }}>Fade Out</button>
              <button class="dd-item" class:active={beatFade === 3} on:click={() => { setSelectedFade(3); closeAll(); }}>Volume Swell</button>
            </div>
          {/if}
        </div>

        <!-- Tuplets -->
        <div class="dd-wrap">
          <button class="eff-btn" class:active={beatTupletNum !== -1 && !disabled}
            on:click|stopPropagation={() => toggleMenu("showTupletMenu")} {disabled}>Tuplets ▾</button>
          {#if showTupletMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={beatTupletNum === -1} on:click={() => { setSelectedTuplet(-1, -1); closeAll(); }}>No Tuplet</button>
              <button class="dd-item" class:active={beatTupletNum === 3 && beatTupletDen === 2} on:click={() => { setSelectedTuplet(3, 2); closeAll(); }}>Triplet (3:2)</button>
              <button class="dd-item" class:active={beatTupletNum === 5 && beatTupletDen === 4} on:click={() => { setSelectedTuplet(5, 4); closeAll(); }}>Quintuplet (5:4)</button>
              <button class="dd-item" class:active={beatTupletNum === 7 && beatTupletDen === 4} on:click={() => { setSelectedTuplet(7, 4); closeAll(); }}>Septuplet (7:4)</button>
            </div>
          {/if}
        </div>

        <div class="grp-sep"></div>
        <div class="btn-group-label">Slap/Pop</div>
        <button class="eff-btn" class:active={beat?.slap && !disabled} on:click={() => {
          if (beat) { beat.slap = !beat.slap; triggerScoreUpdate(); }
        }} {disabled}>Slap</button>
        <button class="eff-btn" class:active={beat?.pop && !disabled} on:click={() => {
          if (beat) { beat.pop = !beat.pop; triggerScoreUpdate(); }
        }} {disabled}>Pop</button>

        <div class="grp-sep"></div>
        <div class="btn-group-label">Lyrics</div>
        <input type="text" class="field-input lyrics-field" placeholder="Type lyrics..." value={beatLyricsText}
          on:change={(e) => { setSelectedLyrics(e.target.value); triggerScoreUpdate(); }} {disabled} />

        <div class="grp-sep"></div>
        <div class="btn-group-label">Beat Text</div>
        <input type="text" class="field-input text-annotation-field" placeholder="Text annotation..." value={beatTextVal}
          on:change={(e) => { setSelectedBeatText(e.target.value); triggerScoreUpdate(); }} {disabled} />
      </div>

    <!-- ── BAR tab ── -->
    {:else if activeTab === "bar"}
      <div class="scroll-row">
        <!-- Clef -->
        <div class="dd-wrap">
          <button class="eff-btn" on:click|stopPropagation={() => toggleMenu("showClefMenu")} {disabled}>Clef ▾</button>
          {#if showClefMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={barClefValue === 4} on:click={() => { setSelectedClef(4); closeAll(); }}>Treble Clef (G2)</button>
              <button class="dd-item" class:active={barClefValue === 3} on:click={() => { setSelectedClef(3); closeAll(); }}>Bass Clef (F4)</button>
              <button class="dd-item" class:active={barClefValue === 1} on:click={() => { setSelectedClef(1); closeAll(); }}>Alto Clef (C3)</button>
              <button class="dd-item" class:active={barClefValue === 2} on:click={() => { setSelectedClef(2); closeAll(); }}>Tenor Clef (C4)</button>
              <button class="dd-item" class:active={barClefValue === 0} on:click={() => { setSelectedClef(0); closeAll(); }}>Neutral/Percussion</button>
            </div>
          {/if}
        </div>

        <!-- Triplet Feel -->
        <div class="dd-wrap">
          <button class="eff-btn" on:click|stopPropagation={() => toggleMenu("showTripletFeelMenu")} {disabled}>Triplet Feel ▾</button>
          {#if showTripletFeelMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={mbTripletFeel === 0} on:click={() => { setSelectedTripletFeel(0); closeAll(); }}>None</button>
              <button class="dd-item" class:active={mbTripletFeel === 2} on:click={() => { setSelectedTripletFeel(2); closeAll(); }}>8th Triplet (Swing)</button>
              <button class="dd-item" class:active={mbTripletFeel === 1} on:click={() => { setSelectedTripletFeel(1); closeAll(); }}>16th Triplet</button>
              <button class="dd-item" class:active={mbTripletFeel === 4} on:click={() => { setSelectedTripletFeel(4); closeAll(); }}>8th Dotted</button>
              <button class="dd-item" class:active={mbTripletFeel === 3} on:click={() => { setSelectedTripletFeel(3); closeAll(); }}>16th Dotted</button>
            </div>
          {/if}
        </div>

        <!-- Time sig -->
        <div class="dd-wrap">
          <button class="eff-btn" on:click|stopPropagation={() => toggleMenu("showTimeSig")} {disabled}>Time sig ▾</button>
          {#if showTimeSig && !disabled}
            <div class="dropdown upward wide" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <div class="dd-form-row">
                <span>Numerator</span>
                <input type="number" min="1" max="32" bind:value={timeSigNum} class="dd-number" />
              </div>
              <div class="dd-form-row">
                <span>Denominator</span>
                <select bind:value={timeSigDenom} class="dd-select">
                  {#each [2,4,8,16] as d}<option value={d}>{d}</option>{/each}
                </select>
              </div>
              <button class="dd-apply" on:click={applyTimeSig}>Apply</button>
            </div>
          {/if}
        </div>

        <!-- Key sig -->
        <div class="dd-wrap">
          <button class="eff-btn" on:click|stopPropagation={() => toggleMenu("showKeySig")} {disabled}>Key ▾</button>
          {#if showKeySig && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              {#each KEY_SIGNATURE_OPTIONS as opt}
                <button class="dd-item" on:click={() => { setSelectedKeySignature(opt.value); closeAll(); }}>{opt.label}</button>
              {/each}
            </div>
          {/if}
        </div>

        <div class="grp-sep"></div>
        <div class="btn-group-label">Tempo</div>
        <input type="number" class="tempo-field" min="20" max="400"
          bind:value={tempoVal} on:change={applyTempo} on:blur={applyTempo} {disabled} />

        <div class="grp-sep"></div>
        <div class="btn-group-label">Section</div>
        <input type="text" class="field-input section-field" placeholder="Section name..." value={mbSectionTextVal}
          on:change={(e) => { triggerSectionText(e.target.value); }} {disabled} />

        <div class="grp-sep"></div>
        <div class="btn-group-label">Repeats</div>
        <button class="eff-btn" class:active={sel && api?.score?.masterBars[sel.barIndex]?.isRepeatStart}
          on:click={triggerRepeatOpen} {disabled}>𝄆 Repeat Open</button>

        <div class="dd-wrap">
          <button class="eff-btn" class:active={currRepeatCloseCount > 0}
            on:click|stopPropagation={() => toggleMenu("showRepeatCloseMenu")} {disabled}>
            Repeat Close ({currRepeatCloseCount > 0 ? currRepeatCloseCount + "x" : "Off"}) ▾
          </button>
          {#if showRepeatCloseMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={currRepeatCloseCount === 0} on:click={() => { triggerRepeatClose(0); closeAll(); }}>None</button>
              <button class="dd-item" class:active={currRepeatCloseCount === 2} on:click={() => { triggerRepeatClose(2); closeAll(); }}>2x</button>
              <button class="dd-item" class:active={currRepeatCloseCount === 3} on:click={() => { triggerRepeatClose(3); closeAll(); }}>3x</button>
              <button class="dd-item" class:active={currRepeatCloseCount === 4} on:click={() => { triggerRepeatClose(4); closeAll(); }}>4x</button>
            </div>
          {/if}
        </div>

        <div class="dd-wrap">
          <button class="eff-btn" class:active={currAlternateEnding > 0}
            on:click|stopPropagation={() => toggleMenu("showVoltaMenu")} {disabled}>
            Alternate Ending (Volta) ▾
          </button>
          {#if showVoltaMenu && !disabled}
            <div class="dropdown upward" on:click|stopPropagation on:keydown|stopPropagation role="menu" tabindex="0">
              <button class="dd-item" class:active={currAlternateEnding === 0} on:click={() => { triggerVolta(0); closeAll(); }}>None</button>
              <button class="dd-item" class:active={currAlternateEnding === 1} on:click={() => { triggerVolta(1); closeAll(); }}>1st Ending</button>
              <button class="dd-item" class:active={currAlternateEnding === 2} on:click={() => { triggerVolta(2); closeAll(); }}>2nd Ending</button>
              <button class="dd-item" class:active={currAlternateEnding === 3} on:click={() => { triggerVolta(3); closeAll(); }}>1st & 2nd Endings</button>
              <button class="dd-item" class:active={currAlternateEnding === 4} on:click={() => { triggerVolta(4); closeAll(); }}>3rd Ending</button>
            </div>
          {/if}
        </div>

        <div class="grp-sep"></div>
        <button class="eff-btn add-bar" on:click={insertMeasureAfterSelection} {disabled}>+ Bar</button>
        <button class="eff-btn del-bar" on:click={deleteSelectedMeasure} {disabled}>− Bar</button>
      </div>

    <!-- ── TRACKS & TUNING tab ── -->
    {:else if activeTab === "tracks"}
      <div class="tracks-tab-layout">
        {#if api?.score}
          <!-- Track List Column -->
          <div class="tracks-list-container">
            <div class="inner-title">Tracks</div>
            <div class="tracks-list-rows">
              {#each api.score.tracks as track, tIdx}
                <div class="track-row-item" class:active={sel?.trackIndex === tIdx}>
                  <button class="track-select-btn" on:click={() => {
                    setState({ selection: { ...sel, trackIndex: tIdx, staffIndex: 0, barIndex: 0, beatIndex: 0 } });
                  }}>
                    {track.name || `Track ${tIdx + 1}`}
                  </button>
                  <div class="track-controls-set">
                    <button class="track-control-action mute-action" class:active={track.playbackInfo?.isMute}
                      on:click={() => { toggleTrackMute(tIdx); triggerScoreUpdate(); }} title="Mute">M</button>
                    <button class="track-control-action solo-action" class:active={track.playbackInfo?.isSolo}
                      on:click={() => { toggleTrackSolo(tIdx); triggerScoreUpdate(); }} title="Solo">S</button>
                    <button class="track-control-action show-action" class:active={visibleTracks.includes(tIdx)}
                      on:click={() => toggleTrackVisibility(tIdx)} title="Toggle visibility">
                      {visibleTracks.includes(tIdx) ? "👁" : "👁‍🗨"}
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="divider-v"></div>

          <!-- Tuning Column -->
          <div class="tuning-container">
            <div class="inner-title">Tuning & Strings</div>
            {#if api.score.tracks[sel?.trackIndex ?? 0]?.staves?.[0]}
              {@const staff = api.score.tracks[sel?.trackIndex ?? 0].staves[0]}
              {@const tuningName = staff.tuning?.name || "Custom"}
              {@const stringCount = staff.stringCount || 6}
              <div class="tuning-grid-controls">
                <div class="tuning-header-info">
                  <span class="tuning-meta">Current: <strong>{tuningName}</strong> ({stringCount} strings)</span>
                  <select class="field-select" on:change={(e) => applyTuningPreset(e.target.value)}>
                    <option value="">-- Apply Preset --</option>
                    {#each TUNING_PRESETS[stringCount] || [] as p}
                      <option value={p.name}>{p.name}</option>
                    {/each}
                  </select>
                </div>

                <!-- Custom pitch values -->
                <div class="pitches-flex-row">
                  {#each Array(stringCount) as _, sIdx}
                    {@const midiVal = staff.tuning?.tunings?.[sIdx] ?? (64 - sIdx * 5)}
                    <div class="pitch-box">
                      <span class="string-index-num">Str {sIdx + 1}</span>
                      <input type="number" class="midi-pitch-field" min="20" max="120" value={midiVal}
                        on:change={(e) => updateStringPitch(sIdx, parseInt(e.target.value))} />
                      <span class="note-name-label">{getNoteName(midiVal)}</span>
                    </div>
                  {/each}
                </div>

                <!-- String count buttons -->
                <div class="string-count-adjuster">
                  <span class="adjuster-label">String Count:</span>
                  <button class="adj-btn" on:click={() => adjustStringCount(-1)} disabled={stringCount <= 4}>-</button>
                  <span class="adjuster-val">{stringCount}</span>
                  <button class="adj-btn" on:click={() => adjustStringCount(1)} disabled={stringCount >= 8}>+</button>
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="tracks-empty-state">No score loaded</div>
        {/if}
      </div>
    {/if}

  </div>
</div>

<style>
  .bottom-panel {
    flex-shrink: 0;
    background: #fff;
    border-top: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    user-select: none;
  }

  /* Tab bar */
  .tab-bar {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    height: 40px;
    padding: 0 4px;
    gap: 2px;
  }
  .tab-btn {
    padding: 6px 14px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: #666;
    transition: all 0.15s;
    touch-action: manipulation;
    white-space: nowrap;
  }
  .tab-btn.active {
    background: #fff;
    color: #111;
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
  }
  .sel-hint {
    margin-left: auto;
    font-size: 11px;
    color: #aaa;
    padding-right: 8px;
    white-space: nowrap;
  }

  /* Tab content */
  .tab-content {
    flex: 1;
    min-height: 0;
  }

  /* ── INPUT TAB ── */
  .input-grid {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    align-items: stretch;
    height: 100%;
  }

  /* D-pad */
  .dpad {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }
  .dpad-row {
    display: flex;
    gap: 4px;
    justify-content: center;
  }
  .dpad-btn {
    flex: 1;
    min-height: 44px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #f8f8f8;
    font-size: 18px;
    color: #333;
    display: flex; align-items: center; justify-content: center;
    touch-action: manipulation;
    transition: background 0.1s;
  }
  .dpad-btn:active:not(:disabled) { background: #e8eaf0; }
  .dpad-btn.action { font-size: 15px; background: #f0f0f0; color: #555; }
  .dpad-btn:disabled { opacity: 0.3; }
  .dpad-empty { flex: 1; min-height: 44px; }

  /* Numpad */
  .numpad {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }
  .numpad-row {
    display: flex;
    gap: 4px;
  }
  .num-btn {
    flex: 1;
    min-height: 44px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    background: #fff;
    font-size: 18px;
    font-weight: 500;
    color: #111;
    touch-action: manipulation;
    transition: background 0.1s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .num-btn:active:not(:disabled) { background: #dde4f5; box-shadow: none; }
  .num-btn:disabled { opacity: 0.3; }
  .num-btn.zero { width: 100%; }

  /* ── SHARED SCROLL ROW (Note / FX / Bar) ── */
  .scroll-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 10px;
    overflow-x: auto;
    overflow-y: visible;
    height: 100%;
    -webkit-overflow-scrolling: touch;
  }
  .scroll-row::-webkit-scrollbar { height: 3px; }
  .scroll-row::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }

  .btn-group-label {
    font-size: 10px;
    font-weight: 600;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
    flex-shrink: 0;
    padding: 0 2px;
  }
  .grp-sep {
    width: 1px; height: 28px;
    background: #e0e0e0;
    flex-shrink: 0;
    margin: 0 4px;
  }

  /* Effect buttons */
  .eff-btn {
    padding: 6px 12px;
    border: 1px solid #d5d5d5;
    border-radius: 8px;
    background: #fafafa;
    font-size: 13px;
    color: #222;
    white-space: nowrap;
    flex-shrink: 0;
    touch-action: manipulation;
    transition: background 0.1s;
    min-height: 36px;
  }
  .eff-btn:hover:not(:disabled) { background: #f0f0f0; }
  .eff-btn:active:not(:disabled) { background: #e8eaf0; }
  .eff-btn.active { background: #dde4f5; border-color: #6a90d0; color: #1a3a80; font-weight: 600; }
  .eff-btn:disabled { opacity: 0.35; cursor: default; }
  .eff-btn.add-bar { background: #edf7ed; border-color: #7ac87a; color: #1a6b1a; }
  .eff-btn.del-bar { background: #fdf0f0; border-color: #c88888; color: #8a1a1a; }
  .dyn-btn { font-style: italic; min-width: 28px; }

  /* Dropdown */
  .dd-wrap { position: relative; flex-shrink: 0; }
  .dropdown {
    position: absolute;
    left: 0;
    z-index: 200;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
    min-width: 160px;
    padding: 6px;
    max-height: 260px;
    overflow-y: auto;
  }
  .dropdown.upward { bottom: calc(100% + 6px); top: auto; }
  .dropdown.wide { min-width: 200px; }
  .dd-group-label {
    font-size: 10px; text-transform: uppercase;
    color: #aaa; padding: 4px 8px 2px;
    font-weight: 600; letter-spacing: 0.06em;
  }
  .dd-item {
    display: block; width: 100%;
    padding: 8px 10px;
    text-align: left; border: none;
    border-radius: 6px; background: none;
    font-size: 13px; color: #111;
    cursor: pointer;
  }
  .dd-item:hover { background: #f5f5f5; }
  .dd-item.active { background: #dde4f5; font-weight: 600; }
  .dd-item.clear { color: #c00; margin-top: 4px; border-top: 1px solid #eee; }
  .dd-form-row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px; font-size: 13px;
  }
  .dd-form-row span { flex: 1; }
  .dd-number { width: 52px; padding: 4px; border: 1px solid #ccc; border-radius: 5px; font-size: 13px; }
  .dd-select { padding: 4px; border: 1px solid #ccc; border-radius: 5px; font-size: 13px; }
  .dd-apply {
    display: block; width: calc(100% - 20px);
    margin: 6px 10px 4px;
    padding: 8px; background: #222;
    color: #fff; border: none; border-radius: 6px;
    font-size: 13px; font-weight: 600; cursor: pointer;
  }

  .tempo-field {
    width: 64px;
    padding: 6px 8px;
    border: 1px solid #d5d5d5;
    border-radius: 8px;
    font-size: 14px;
    text-align: center;
    background: #fafafa;
    flex-shrink: 0;
  }

  /* Custom input fields (lyrics, beat text, sections) */
  .field-input {
    min-width: 140px;
    padding: 6px 10px;
    border: 1px solid #d5d5d5;
    border-radius: 8px;
    font-size: 13px;
    background: #fafafa;
    color: #222;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .field-input:focus {
    outline: none;
    background: #fff;
    border-color: #6a90d0;
    box-shadow: 0 0 0 2px rgba(106, 144, 208, 0.2);
  }

  /* Tracks & Tuning Tab Styles */
  .tracks-tab-layout {
    display: flex;
    gap: 16px;
    padding: 12px 16px;
    height: 160px;
    background: #fff;
    overflow-y: hidden;
  }

  .tracks-list-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 220px;
    height: 100%;
  }

  .tuning-container {
    flex: 2;
    display: flex;
    flex-direction: column;
    min-width: 320px;
    height: 100%;
  }

  .inner-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    margin-bottom: 6px;
  }

  .tracks-list-rows {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 4px;
  }

  .track-row-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fcfcfc;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 4px 8px;
    transition: background 0.15s, border-color 0.15s;
  }
  .track-row-item:hover {
    background: #f5f7fa;
  }
  .track-row-item.active {
    background: #f0f4ff;
    border-color: #b4c6fc;
  }

  .track-select-btn {
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 500;
    color: #222;
    text-align: left;
    cursor: pointer;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 4px 0;
  }
  .track-row-item.active .track-select-btn {
    font-weight: 600;
    color: #1a3a80;
  }

  .track-controls-set {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .track-control-action {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 1px solid #d5d5d5;
    background: #fff;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .mute-action.active {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #b91c1c;
  }
  .solo-action.active {
    background: #fef3c7;
    border-color: #fcd34d;
    color: #b45309;
  }
  .show-action.active {
    background: #dbeafe;
    border-color: #93c5fd;
    color: #1d4ed8;
  }

  .divider-v {
    width: 1px;
    background: #e5e5e5;
    align-self: stretch;
  }

  .tuning-grid-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
  }

  .tuning-header-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .tuning-meta {
    font-size: 12px;
    color: #444;
  }

  .field-select {
    padding: 4px 8px;
    border: 1px solid #d5d5d5;
    border-radius: 6px;
    font-size: 12px;
    background: #fff;
    color: #222;
    outline: none;
    cursor: pointer;
  }

  .pitches-flex-row {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .pitch-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fafafa;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 4px 6px;
    min-width: 50px;
    text-align: center;
  }

  .string-index-num {
    font-size: 9px;
    font-weight: 600;
    color: #888;
    margin-bottom: 2px;
  }

  .midi-pitch-field {
    width: 38px;
    border: 1px solid #d5d5d5;
    border-radius: 5px;
    font-size: 11px;
    text-align: center;
    padding: 2px 0;
    background: #fff;
  }

  .note-name-label {
    font-size: 11px;
    font-weight: 700;
    color: #333;
    margin-top: 2px;
  }

  .string-count-adjuster {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: auto;
  }

  .adjuster-label {
    font-size: 12px;
    color: #555;
  }

  .adj-btn {
    width: 24px;
    height: 24px;
    border-radius: 5px;
    border: 1px solid #d5d5d5;
    background: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .adj-btn:hover {
    background: #f5f5f5;
  }
  .adj-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .adjuster-val {
    font-size: 13px;
    font-weight: 600;
    color: #222;
    min-width: 14px;
    text-align: center;
  }

  .tracks-empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    color: #888;
    font-size: 13px;
  }
</style>
