import * as alphaTab from "@coderline/alphatab";
import { DRUM_KIT } from "./drums.svelte.js";

export class Editor {
  #engine;
  #project;

  activeBeat = $state(null);
  activeNote = $state(null);
  activeString = $state(1);

  // Drum kit: which percussion articulation a new drum note uses
  drumSlot = $state(0);
  drumKit = DRUM_KIT;

  // Which track is currently being edited
  selectedTrackIndex = $state(0);

  // Which voice (1-4) of the current track is being edited
  activeVoiceIndex = $state(0);

  // Selection: null means no range, otherwise {anchor, active} are beat objects
  selectionAnchor = $state(null);

  clipboard = $state(null); // array of beat snapshots

  // Remembers last fret used so addNote can repeat it
  #lastFret = 0;

  // Whether the current render is filtered to visible tracks only
  #renderFilterActive = false;

  // Coalesces repeated visibility toggles into one re-render
  #visibilityRenderQueued = false;

  // Render context of the last completed render; partial re-renders are only
  // allowed when the context (tracks, visibility, layout) is unchanged.
  #lastRenderContext = null;

  // Reference to the active auto-scroll handler so track changes can reset it
  #scrollHandler = null;

  // Scale the user had before auto-fit lowered it for horizontal layout; it is
  // restored when switching back to page layout.
  #horizontalPrevScale = null;

  // Two separate visual indicators:
  beatCursorBox = $state(null);  // full-column highlight for the current beat
  cursorBox = $state(null);      // single-string-row highlight for the note target
  selectionBoxes = $state([]);   // highlight boxes for selected beat range

  constructor(engine, project) {
    this.#engine = engine;
    this.#project = project;
  }

  initListeners() {
    const api = this.#engine.api;
    if (!api) return;

    // Auto-scroll follows the SELECTED track during playback, not the first one
    this.#scrollHandler = new ActiveTrackScrollHandler(api, this);
    api.customScrollHandler = this.#scrollHandler;

    api.activeBeatsChanged?.on((args) => {
      const beats = args.activeBeats || [];
      if (!beats.length) return;
      // Prefer the beat that belongs to the track currently being edited
      const selTrack = this.tracks?.[this.selectedTrackIndex];
      const beat = beats.find((b) => b.voice?.bar?.staff?.track === selTrack) || beats[0];
      // Playback cursor moved — follow it but don't disrupt editing state
      this.activeBeat = beat;
      this.updateOverlay();
    });

    api.beatMouseDown?.on((beat) => {
      if (beat) {
        this.selectionAnchor = null;
        this.selectBeat(beat);
      }
    });

    api.postRenderFinished?.on(() => {
      this.updateOverlay();
    });

    api.scoreLoaded?.on(() => {
      this.selectedTrackIndex = 0;
      this.activeVoiceIndex = 0;
      this.#renderFilterActive = false;
      this.#lastRenderContext = null;
      this.#applyVisibility();
      const firstBeat = this.getFirstBeat();
      if (firstBeat) this.selectBeat(firstBeat);
      this.#finishRender();
      if (this.settings?.display?.layoutMode === 1) {
        this.#fitHorizontalScale(this.#engine.api);
      }
    });
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get score() {
    this.#engine.currentTick;
    return this.#engine.api?.score;
  }

  get currentTrack() {
    this.#engine.currentTick;
    const tracks = this.#engine.api?.score?.tracks;
    return tracks?.[this.selectedTrackIndex] || null;
  }

  get tracks() {
    this.#engine.currentTick;
    return this.#engine.api?.score?.tracks || [];
  }

  get settings() {
    this.#engine.currentTick;
    return this.#engine.api?.settings;
  }

  get stringCount() {
    const tunings = this.currentTrack?.staves?.[0]?.stringTuning?.tunings;
    return tunings ? tunings.length : 6;
  }

  get beatNotes() {
    // Notes sorted by string number ascending
    return [...(this.currentActiveBeat?.notes || [])].sort((a, b) => a.string - b.string);
  }

  get currentActiveBeat() {
    return this.activeBeat || this.getFirstBeat();
  }

  get hasSelection() {
    return this.selectionAnchor !== null;
  }

  get hasActiveNote() {
    return this.activeNote !== null;
  }

  get activeNoteName() {
    if (!this.activeNote) return null;
    const tuning = this.currentTrack?.staves?.[0]?.stringTuning?.tunings;
    if (!tuning?.length) return null;
    const idx = this.stringCount - this.activeNote.string;
    if (idx < 0 || idx >= tuning.length) return null;
    const midi = tuning[idx] + (this.activeNote.fret ?? 0);
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
  }

  getFirstBeat() {
    const track = this.currentTrack;
    const voices = track?.staves?.[0]?.bars?.[0]?.voices;
    const voice = voices?.[Math.min(this.activeVoiceIndex, voices.length - 1)];
    return voice?.beats?.[0] || null;
  }

  // ── Staff Beat List ──────────────────────────────────────────────────────────

  #getAllBeats() {
    const beat = this.currentActiveBeat;
    if (!beat?.voice?.bar?.staff) return [];
    const staff = beat.voice.bar.staff;
    const beats = [];
    for (const bar of staff.bars || []) {
      const voice = bar.voices?.[Math.min(this.activeVoiceIndex, (bar.voices?.length || 1) - 1)];
      for (const b of voice?.beats || []) {
        beats.push(b);
      }
    }
    return beats;
  }

  // ── Overlay / Indicators ────────────────────────────────────────────────────

  #findNoteBounds(beatBounds, note) {
    if (!note || !beatBounds?.notes) return null;
    for (const nb of beatBounds.notes) {
      if (nb.note === note && nb.noteHeadBounds) return nb;
    }
    for (const nb of beatBounds.notes) {
      if (nb.noteHeadBounds && nb.note.string === note.string && nb.note.fret === note.fret) return nb;
    }
    for (const nb of beatBounds.notes) {
      if (nb.noteHeadBounds && nb.note.string === note.string) return nb;
    }
    return null;
  }

  updateOverlay() {
    const api = this.#engine.api;
    const beat = this.currentActiveBeat;

    if (!api?.boundsLookup || !beat) {
      this.beatCursorBox = null;
      this.cursorBox = null;
      this.selectionBoxes = [];
      return;
    }

    try {
      const beatBounds = api.boundsLookup.findBeat(beat);
      if (!beatBounds?.visualBounds) {
        this.beatCursorBox = null;
        this.cursorBox = null;
        this.selectionBoxes = [];
        return;
      }

      const vb = beatBounds.visualBounds;

      // 1. Beat indicator — full column covering the whole beat area
      this.beatCursorBox = {
        x: vb.x - 2,
        y: vb.y - 4,
        w: Math.max(vb.w + 4, 18),
        h: vb.h + 8,
      };

      // 2. Note indicator — snap to the actual notehead in standard notation
      const noteBounds = this.#findNoteBounds(beatBounds, this.activeNote);
      if (noteBounds?.noteHeadBounds) {
        const nb = noteBounds.noteHeadBounds;
        this.cursorBox = {
          x: nb.x - 4,
          y: nb.y - 4,
          w: Math.max(nb.w + 8, 22),
          h: Math.max(nb.h + 8, 20),
        };
      } else if (this.activeNote) {
        const activeStr = this.activeNote.string ?? this.activeString;
        const clampedStr = Math.min(Math.max(activeStr, 1), this.stringCount);
        const stringGap = Math.max(vb.h / Math.max(this.stringCount - 1, 1), 14);
        const stringY = vb.y + (clampedStr - 1) * stringGap;
        this.cursorBox = {
          x: (beatBounds.onNotesX ?? vb.x) - 4,
          y: stringY - 9,
          w: Math.max(vb.w + 6, 20),
          h: Math.max(18, stringGap),
        };
      } else {
        this.cursorBox = null;
      }

      // 3. Selection range boxes (multi-beat highlight)
      const selected = this.getSelectedBeats();
      if (selected.length > 1) {
        this.selectionBoxes = selected.map((b) => {
          const bi = api.boundsLookup.findBeat(b);
          if (!bi?.visualBounds) return null;
          const bvb = bi.visualBounds;
          return {
            x: bvb.x - 2,
            y: bvb.y - 4,
            w: Math.max(bvb.w + 4, 18),
            h: bvb.h + 8,
          };
        }).filter(Boolean);
      } else {
        this.selectionBoxes = [];
      }
    } catch {
      this.beatCursorBox = null;
      this.cursorBox = null;
      this.selectionBoxes = [];
    }
  }

  // ── Beat Selection ───────────────────────────────────────────────────────────

  selectBeat(beat) {
    if (!beat) return;
    this.activeBeat = beat;
    // Selecting a beat in another voice switches the active editing voice
    const vIdx = beat.voice?.index;
    if (vIdx != null && beat.voice?.bar?.staff?.track === this.currentTrack) {
      this.activeVoiceIndex = vIdx;
    }
    // Sync active note: prefer keeping same string, otherwise first note
    const noteOnStr = beat.notes?.find((n) => n.string === this.activeString);
    this.activeNote = noteOnStr || beat.notes?.[0] || null;
    if (this.activeNote) this.activeString = this.activeNote.string;
    this.updateOverlay();
    this.#engine.ping();
  }

  getSelectedBeats() {
    if (!this.selectionAnchor) {
      return this.currentActiveBeat ? [this.currentActiveBeat] : [];
    }
    const all = this.#getAllBeats();
    const ia = all.indexOf(this.selectionAnchor);
    const ib = all.indexOf(this.currentActiveBeat);
    if (ia === -1 || ib === -1) return [this.currentActiveBeat].filter(Boolean);
    const start = Math.min(ia, ib);
    const end = Math.max(ia, ib);
    return all.slice(start, end + 1);
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  moveBeat(delta) {
    const beats = this.#getAllBeats();
    const idx = beats.indexOf(this.currentActiveBeat);
    const next = beats[idx + delta];
    if (!next) return;
    // Moving beat clears range selection
    this.selectionAnchor = null;
    this.selectBeat(next);
  }

  // Extend or start a multi-beat selection
  extendSelection(delta) {
    if (!this.selectionAnchor) {
      this.selectionAnchor = this.currentActiveBeat;
    }
    const beats = this.#getAllBeats();
    const idx = beats.indexOf(this.currentActiveBeat);
    const next = beats[idx + delta];
    if (!next) return;
    // Move the active beat without clearing anchor
    this.activeBeat = next;
    const noteOnStr = next.notes?.find((n) => n.string === this.activeString);
    this.activeNote = noteOnStr || next.notes?.[0] || null;
    if (this.activeNote) this.activeString = this.activeNote.string;
    this.updateOverlay();
    this.#engine.ping();
  }

  clearSelection() {
    this.selectionAnchor = null;
    this.updateOverlay();
  }

  // Move note target to next/prev existing note within current beat (alphaTab order)
  moveNote(delta) {
    const notes = this.currentActiveBeat?.notes;
    if (!notes?.length) return;

    const idx = notes.indexOf(this.activeNote);
    if (idx === -1) {
      this.activeNote = notes[0];
      this.activeString = notes[0].string;
      this.updateOverlay();
      return;
    }

    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= notes.length) return;

    this.activeNote = notes[nextIdx];
    this.activeString = notes[nextIdx].string;
    this.updateOverlay();
  }

  // Move cursor position to different string while preserving pitch
  moveString(delta) {
    const staff = this.currentActiveBeat?.voice?.bar?.staff;
    if (staff?.isPercussion) {
      const len = this.drumKit.length;
      if (!len) return;
      this.drumSlot = (this.drumSlot + delta + len) % len;
      this.#engine.ping();
      return;
    }
    const tunings = staff?.stringTuning?.tunings || [];
    if (!tunings.length) return;
    const currentString = this.activeString;
    const currentFret = this.activeNote?.fret ?? 0;
    const currentPitch = tunings[tunings.length - currentString] + currentFret;

    let targetString = -1;
    let targetFret = -1;
    for (let s = currentString + delta; s >= 1 && s <= tunings.length; s += delta) {
      const fret = currentPitch - tunings[tunings.length - s];
      if (fret >= 0 && fret <= 24) {
        targetString = s;
        targetFret = fret;
        break;
      }
    }
    if (targetString === -1 || targetString === currentString) return;

    if (this.activeNote) {
      this.#project.history.snapshot();
      this.activeNote.string = targetString;
      this.activeNote.fret = targetFret;
      this.activeString = targetString;
      this.#finishAndUpdate();
    } else {
      this.activeString = targetString;
      this.updateOverlay();
    }
  }

  get canMoveStringUp() {
    if (!this.hasActiveNote) return false;
    const staff = this.currentActiveBeat?.voice?.bar?.staff;
    const tunings = staff?.stringTuning?.tunings || [];
    if (!tunings.length) return false;
    const currentString = this.activeString;
    const currentFret = this.activeNote?.fret ?? 0;
    const currentPitch = tunings[tunings.length - currentString] + currentFret;
    for (let s = currentString - 1; s >= 1; s--) {
      const fret = currentPitch - tunings[tunings.length - s];
      if (fret >= 0 && fret <= 24) return true;
    }
    return false;
  }

  get canMoveStringDown() {
    if (!this.hasActiveNote) return false;
    const staff = this.currentActiveBeat?.voice?.bar?.staff;
    const tunings = staff?.stringTuning?.tunings || [];
    if (!tunings.length) return false;
    const currentString = this.activeString;
    const currentFret = this.activeNote?.fret ?? 0;
    const currentPitch = tunings[tunings.length - currentString] + currentFret;
    for (let s = currentString + 1; s <= tunings.length; s++) {
      const fret = currentPitch - tunings[tunings.length - s];
      if (fret >= 0 && fret <= 24) return true;
    }
    return false;
  }

  setDrumSlot(slot) {
    if (!this.drumKit.length) return;
    this.drumSlot = Math.max(0, Math.min(this.drumKit.length - 1, Math.round(slot)));
    this.#engine.ping();
  }

  // ── Note Editing ─────────────────────────────────────────────────────────────

  addNote() {
    const beat = this.currentActiveBeat;
    if (!beat) return;
    // Percussion staves have no strings/frets — add the selected drum sound
    if (beat.voice?.bar?.staff?.isPercussion) {
      this.#addDrumNote(beat);
      return;
    }

    this.#project.history.snapshot();
    if (beat.isEmpty) beat.isEmpty = false;

    const note = new alphaTab.model.Note();
    note.string = this.activeString;
    note.fret = this.activeNote?.fret ?? this.#lastFret;
    beat.addNote(note);
    this.activeNote = note;
    this.#lastFret = note.fret;

    this.#finishAndUpdate();
  }

  #addDrumNote(beat) {
    const item = this.drumKit[this.drumSlot];
    if (!item) return;
    this.#project.history.snapshot();
    if (beat.isEmpty) beat.isEmpty = false;
    const note = new alphaTab.model.Note();
    note.percussionArticulation = item.id;
    note.string = -1;
    note.fret = -1;
    beat.addNote(note);
    this.activeNote = note;
    this.#finishAndUpdate();
  }

  deleteNote() {
    const beat = this.currentActiveBeat;
    if (!beat || !this.activeNote) return;
    this.#project.history.snapshot();
    beat.removeNote(this.activeNote);
    this.activeNote = this.beatNotes[0] || null;
    if (this.activeNote) this.activeString = this.activeNote.string;
    this.#finishAndUpdate();
  }

  changeFret(delta) {
    if (!this.currentActiveBeat) return;
    if (this.currentActiveBeat.voice?.bar?.staff?.isPercussion) return;
    if (!this.activeNote) {
      // Ensure a note exists without double-snapshotting
      const beat = this.currentActiveBeat;
      let note = beat.notes?.find((n) => n.string === this.activeString);
      if (!note) {
        this.#project.history.snapshot();
        if (beat.isEmpty) beat.isEmpty = false;
        note = new alphaTab.model.Note();
        note.string = this.activeString;
        note.fret = this.#lastFret;
        beat.addNote(note);
        this.activeNote = note;
        this.#lastFret = note.fret;
      } else {
        this.activeNote = note;
        this.#lastFret = note.fret ?? 0;
      }
    }
    const nextFret = Math.max(0, Math.min(24, (this.activeNote.fret ?? 0) + delta));
    this.#project.history.snapshot();
    this.activeNote.fret = nextFret;
    this.#lastFret = nextFret;
    this.#finishAndUpdate();
  }

  // ── Beat / Bar Structure ──────────────────────────────────────────────────────

  addBeat() {
    const beat = this.currentActiveBeat;
    if (!beat?.voice) return;
    this.#project.history.snapshot();

    const newBeat = new alphaTab.model.Beat();
    newBeat.duration = beat.duration;
    newBeat.voice = beat.voice;

    const idx = beat.voice.beats.indexOf(beat);
    if (idx !== -1) {
      beat.voice.beats.splice(idx + 1, 0, newBeat);
    } else {
      beat.voice.addBeat(newBeat);
    }

    this.selectionAnchor = null;
    this.#finishAndUpdate();
    const resolved = beat.voice.beats[idx + 1] || beat.voice.beats[beat.voice.beats.length - 1];
    if (resolved) this.selectBeat(resolved);
  }

  deleteBeat() {
    const beat = this.activeBeat || this.currentActiveBeat;
    if (!beat?.voice) return;
    const voice = beat.voice;
    const idx = voice.beats.indexOf(beat);
    if (idx === -1) return;
    this.#project.history.snapshot();

    const prev = beat.previousBeat;
    const next = beat.nextBeat;
    voice.beats.splice(idx, 1);
    if (prev) prev.nextBeat = next;
    else if (next) next.previousBeat = null;
    if (next) next.previousBeat = prev;

    voice.beats.forEach((b, i) => {
      b.index = i;
    });

    // A bar with no beats in a voice is invalid — leave a full-bar rest behind
    if (voice.beats.length === 0) {
      const rest = new alphaTab.model.Beat();
      rest.duration = alphaTab.model.Duration.Whole;
      voice.addBeat(rest);
    }

    this.selectionAnchor = null;
    const sel = voice.beats[Math.min(idx, voice.beats.length - 1)] || this.getFirstBeat();
    this.activeBeat = sel;
    this.activeNote = null;
    this.#finishAndUpdate();
    if (sel) this.selectBeat(sel);
  }

  deleteBar() {
    const beat = this.activeBeat || this.currentActiveBeat;
    const bar = beat?.voice?.bar;
    const score = this.score;
    if (!bar || !score || score.masterBars.length <= 1) return;
    const mbIdx = bar.index;
    if (mbIdx < 0 || mbIdx >= score.masterBars.length) return;
    this.#project.history.snapshot();
    this.selectionAnchor = null;

    // Detach the current beat so #finishAndUpdate does not re-resolve it
    this.activeBeat = null;
    this.activeNote = null;

    score.masterBars.splice(mbIdx, 1);
    score.masterBars.forEach((m, i) => {
      m.index = i;
      m.previousMasterBar = i > 0 ? score.masterBars[i - 1] : null;
      m.nextMasterBar = i < score.masterBars.length - 1 ? score.masterBars[i + 1] : null;
      const prev = score.masterBars[i - 1];
      m.start = i === 0 ? 0 : prev.start + (prev.isAnacrusis ? 0 : prev.calculateDuration());
    });

    for (const track of score.tracks) {
      for (const staff of track.staves) {
        staff.bars.splice(mbIdx, 1);
        staff.bars.forEach((b, i) => {
          b.index = i;
          b.previousBar = i > 0 ? staff.bars[i - 1] : null;
          b.nextBar = i < staff.bars.length - 1 ? staff.bars[i + 1] : null;
        });
      }
    }

    score.rebuildRepeatGroups();
    this.#finishAndUpdate();
    const firstBeat = this.getFirstBeat();
    if (firstBeat) this.selectBeat(firstBeat);
  }

  addBar() {
    const beat = this.currentActiveBeat;
    if (!beat?.voice?.bar) return;
    this.#project.history.snapshot();

    const currentBar = beat.voice.bar;
    const currentStaff = currentBar.staff;
    if (!currentStaff || !this.score) return;

    const masterBar = new alphaTab.model.MasterBar();
    const prevMb = currentBar.masterBar;
    if (prevMb) {
      masterBar.timeSignatureNumerator = prevMb.timeSignatureNumerator;
      masterBar.timeSignatureDenominator = prevMb.timeSignatureDenominator;
    }
    this.score.addMasterBar(masterBar);

    const newBar = new alphaTab.model.Bar();
    currentStaff.addBar(newBar);

    const newVoice = new alphaTab.model.Voice();
    newBar.addVoice(newVoice);

    const newBeat = new alphaTab.model.Beat();
    newBeat.duration = alphaTab.model.Duration.Quarter;
    newVoice.addBeat(newBeat);

    this.selectionAnchor = null;
    this.#finishAndUpdate();
    const resolvedStaff = currentStaff.bars?.[currentStaff.bars.length - 1];
    const resolvedBeat = resolvedStaff?.voices?.[0]?.beats?.[0];
    if (resolvedBeat) this.selectBeat(resolvedBeat);
  }

  // ── Copy / Paste / Cut ───────────────────────────────────────────────────────

  copy() {
    const beats = this.getSelectedBeats();
    if (!beats.length) return;
    this.clipboard = beats.map((b) => ({
      duration: b.duration,
      notes: (b.notes || []).map((n) => ({ string: n.string, fret: n.fret })),
    }));
  }

  paste() {
    if (!this.clipboard?.length) return;
    const startBeat = this.currentActiveBeat;
    if (!startBeat?.voice) return;
    this.#project.history.snapshot();

    const voice = startBeat.voice;
    let insertIdx = voice.beats.indexOf(startBeat);

    for (const clip of this.clipboard) {
      const newBeat = new alphaTab.model.Beat();
      newBeat.duration = clip.duration;
      newBeat.voice = voice;

      for (const nd of clip.notes) {
        const note = new alphaTab.model.Note();
        note.string = nd.string;
        note.fret = nd.fret;
        newBeat.addNote(note);
      }

      insertIdx += 1;
      if (insertIdx <= voice.beats.length) {
        voice.beats.splice(insertIdx, 0, newBeat);
      } else {
        voice.addBeat(newBeat);
        insertIdx = voice.beats.length - 1;
      }
    }

    this.selectionAnchor = null;
    this.#finishAndUpdate();
    const resolved = voice.beats[insertIdx] || voice.beats[voice.beats.length - 1];
    if (resolved) this.selectBeat(resolved);
  }

  cut() {
    this.copy();
    this.deleteNote();
  }

  // ── Track Management ─────────────────────────────────────────────────────────

  selectTrack(index) {
    const tracks = this.tracks;
    if (!tracks.length) return;
    this.selectedTrackIndex = Math.max(0, Math.min(index, tracks.length - 1));
    this.activeVoiceIndex = Math.min(
      this.activeVoiceIndex,
      Math.max(0, this.getTrackVoiceCount(this.selectedTrackIndex) - 1),
    );
    this.activeString = Math.min(this.activeString, this.stringCount);
    this.selectionAnchor = null;
    const firstBeat = this.getFirstBeat();
    if (firstBeat) this.selectBeat(firstBeat);
    // Re-target the auto-scroll so playback follows this track
    this.#scrollHandler?.onTrackChanged();
    // When editing voice 1 the default rendering already matches; only
    // re-render when a non-default voice needs to become opaque.
    if (this.activeVoiceIndex > 0) {
      this.#applyVoiceDisplay();
      this.#finishRender();
    }
  }

  addTrack() {
    const score = this.score;
    if (!score) return;
    this.#project.history.snapshot();

    const track = new alphaTab.model.Track();
    track.name = `Track ${score.tracks.length + 1}`;
    track.shortName = track.name;
    track.playbackInfo.volume = 15;
    track.playbackInfo.program = 24;

    const palette = [
      [90, 110, 224],
      [200, 60, 60],
      [60, 160, 90],
      [220, 150, 50],
      [150, 90, 200],
      [60, 150, 170],
    ];
    const [r, g, b] = palette[score.tracks.length % palette.length];
    track.color = new alphaTab.model.Color(r, g, b, 255);

    const staff = new alphaTab.model.Staff();
    staff.stringTuning =
      alphaTab.model.Tuning.getDefaultTuningFor(6) ||
      new alphaTab.model.Tuning("Guitar", [64, 59, 55, 50, 45, 40], true);
    staff.showTablature = true;
    staff.showStandardNotation = true;
    track.addStaff(staff);

    // Mirror the voice count of the first track
    const voiceCount = Math.max(
      1,
      score.tracks[0]?.staves?.[0]?.bars?.[0]?.voices?.length || 1,
    );
    if (score.masterBars.length === 0) {
      const bar = new alphaTab.model.Bar();
      staff.addBar(bar);
      const voice = new alphaTab.model.Voice();
      bar.addVoice(voice);
      const beat = new alphaTab.model.Beat();
      beat.duration = alphaTab.model.Duration.Whole;
      voice.addBeat(beat);
    }
    for (const masterBar of score.masterBars) {
      const bar = new alphaTab.model.Bar();
      staff.addBar(bar);
      for (let v = 0; v < voiceCount; v++) {
        const voice = new alphaTab.model.Voice();
        bar.addVoice(voice);
        const beat = new alphaTab.model.Beat();
        beat.duration = alphaTab.model.Duration.Whole;
        voice.addBeat(beat);
      }
    }

    score.addTrack(track);
    this.#assignChannels();
    this.selectionAnchor = null;
    this.selectedTrackIndex = score.tracks.length - 1;
    this.#applyVoiceDisplay();
    this.#finishAndUpdate(true);
    const firstBeat = this.getFirstBeat();
    if (firstBeat) this.selectBeat(firstBeat);
  }

  removeTrack(index) {
    const score = this.score;
    if (!score || score.tracks.length <= 1) return;
    const track = score.tracks[index];
    if (!track) return;
    this.#project.history.snapshot();

    score.tracks.splice(index, 1);
    score.tracks.forEach((t, i) => {
      t.index = i;
    });

    if (this.selectedTrackIndex >= score.tracks.length) {
      this.selectedTrackIndex = score.tracks.length - 1;
    }
    this.selectionAnchor = null;
    this.#finishAndUpdate(true);
    const firstBeat = this.getFirstBeat();
    if (firstBeat) this.selectBeat(firstBeat);
  }

  renameTrack(index, name) {
    const track = this.score?.tracks?.[index];
    if (!track) return;
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return;
    this.#project.history.snapshot();
    track.name = trimmed;
    track.shortName = trimmed.slice(0, 10);
    this.#engine.requestUpdate();
  }

  toggleTrackMute(index) {
    const track = this.score?.tracks?.[index];
    if (!track) return;
    this.#project.history.snapshot();
    track.playbackInfo.isMute = !track.playbackInfo.isMute;
    try {
      this.#engine.api?.changeTrackMute([track], track.playbackInfo.isMute);
    } catch {}
    this.#engine.ping();
  }

  toggleTrackSolo(index) {
    const track = this.score?.tracks?.[index];
    if (!track) return;
    this.#project.history.snapshot();
    track.playbackInfo.isSolo = !track.playbackInfo.isSolo;
    try {
      this.#engine.api?.changeTrackSolo([track], track.playbackInfo.isSolo);
    } catch {}
    this.#engine.ping();
  }

  toggleTrackVisible(index) {
    const track = this.score?.tracks?.[index];
    if (!track) return;
    this.#project.history.snapshot();
    track.isVisibleOnMultiTrack = !track.isVisibleOnMultiTrack;
    this.#applyVisibility();
    this.#finishAndUpdate(true);
  }

  getTrackVoiceCount(index) {
    const track = this.score?.tracks?.[index];
    return track?.staves?.[0]?.bars?.[0]?.voices?.length || 1;
  }

  // Switch which voice (1-4) is being edited in the selected track
  selectVoice(index) {
    const count = this.getTrackVoiceCount(this.selectedTrackIndex);
    if (count <= 0) return;
    this.activeVoiceIndex = Math.max(0, Math.min(index, count - 1));
    this.selectionAnchor = null;
    const firstBeat = this.getFirstBeat();
    if (firstBeat) this.selectBeat(firstBeat);
    // The edited voice renders opaque; the other voices are dimmed
    this.#applyVoiceDisplay();
    this.#finishRender();
  }

  // Adds an empty voice to every bar of the track and selects it for editing
  addVoiceToTrack(index) {
    this.setTrackVoiceCount(index, this.getTrackVoiceCount(index) + 1);
    this.selectedTrackIndex = index;
    this.activeVoiceIndex = this.getTrackVoiceCount(index) - 1;
    const firstBeat = this.getFirstBeat();
    if (firstBeat) this.selectBeat(firstBeat);
  }

  // Removes the last voice of the track. Never deletes data: a voice is only
  // removed when it is empty in every bar (e.g. freshly added or blank).
  removeVoiceFromTrack(index) {
    this.setTrackVoiceCount(index, this.getTrackVoiceCount(index) - 1);
  }

  setTrackVoiceCount(index, count) {
    const track = this.score?.tracks?.[index];
    if (!track || !track.staves?.length) return;
    count = Math.max(1, Math.min(4, Math.round(count)));
    const current = this.getTrackVoiceCount(index);
    if (current === count) return;
    this.#project.history.snapshot();

    // Grow: append empty (invisible) voices
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        while (bar.voices.length < count) {
          const voice = new alphaTab.model.Voice();
          bar.addVoice(voice);
          const beat = new alphaTab.model.Beat();
          beat.duration = alphaTab.model.Duration.Whole;
          beat.isEmpty = true;
          voice.addBeat(beat);
        }
      }
    }

    // Shrink: pop trailing voices ONLY if they are empty in every bar
    while (this.getTrackVoiceCount(index) > count) {
      const last = this.getTrackVoiceCount(index) - 1;
      let canRemove = true;
      for (const staff of track.staves) {
        for (const bar of staff.bars) {
          const v = bar.voices?.[last];
          if (v && !v.isEmpty) {
            canRemove = false;
            break;
          }
        }
        if (!canRemove) break;
      }
      if (!canRemove) break;
      for (const staff of track.staves) {
        for (const bar of staff.bars) {
          if (bar.voices.length > 1) bar.voices.pop();
        }
      }
    }

    this.activeVoiceIndex = Math.min(
      this.activeVoiceIndex,
      Math.max(0, this.getTrackVoiceCount(index) - 1),
    );
    this.#applyVoiceDisplay();
    this.#finishAndUpdate(true);
    const firstBeat = this.getFirstBeat();
    if (firstBeat) this.selectBeat(firstBeat);
  }

  // ── Track Instrumentation ─────────────────────────────────────────────────────

  isTrackDrum(index) {
    return !!this.score?.tracks?.[index]?.staves?.[0]?.isPercussion;
  }

  getTrackStaffMode(index) {
    const track = this.score?.tracks?.[index];
    if (!track) return "tab";
    if (track.staves.some((s) => s.isPercussion)) return "drum";
    if (track.staves.length >= 2) {
      const clefs = track.staves.map((s) => s.bars[0]?.clef).filter((c) => c != null);
      if (clefs.includes(alphaTab.model.Clef.G2) && clefs.includes(alphaTab.model.Clef.F4)) {
        return "grand";
      }
    }
    const staff = track.staves[0];
    if (staff.showTablature && staff.showStandardNotation) return "scoretab";
    if (staff.showTablature) return "tab";
    return "standard";
  }

  getTrackStaffPreset(index) {
    const track = this.score?.tracks?.[index];
    if (!track) return "treble";
    const clefs = track.staves.map((s) => s.bars[0]?.clef).filter((c) => c != null);
    if (clefs.includes(alphaTab.model.Clef.G2) && clefs.includes(alphaTab.model.Clef.F4)) return "grand";
    if (clefs.includes(alphaTab.model.Clef.F4)) return "bass";
    if (clefs.includes(alphaTab.model.Clef.C4)) return "alto";
    if (clefs.includes(alphaTab.model.Clef.C3)) return "tenor";
    return "treble";
  }

  setTrackStaffPreset(index, preset) {
    const track = this.score?.tracks?.[index];
    if (!track) return;
    this.#project.history.snapshot();

    const presetData = [
      { key: "treble", clefs: [alphaTab.model.Clef.G2], modes: ["standard"] },
      { key: "bass", clefs: [alphaTab.model.Clef.F4], modes: ["standard"] },
      { key: "grand", clefs: [alphaTab.model.Clef.G2, alphaTab.model.Clef.F4], modes: ["standard", "standard"] },
      { key: "alto", clefs: [alphaTab.model.Clef.C4], modes: ["standard"] },
      { key: "tenor", clefs: [alphaTab.model.Clef.C3], modes: ["standard"] },
    ].find((p) => p.key === preset) || { key: "treble", clefs: [alphaTab.model.Clef.G2], modes: ["standard"] };

    while (track.staves.length > presetData.clefs.length) {
      track.staves.pop();
    }
    while (track.staves.length < presetData.clefs.length) {
      const newStaff = new alphaTab.model.Staff();
      const firstStaff = track.staves[0];
      newStaff.showStandardNotation = true;
      newStaff.showTablature = false;
      if (firstStaff?.stringTuning?.tunings?.length) {
        newStaff.stringTuning = new alphaTab.model.Tuning(firstStaff.stringTuning.name, [...firstStaff.stringTuning.tunings], false);
      }
      if (firstStaff) {
        for (const bar of firstStaff.bars) {
          const newBar = new alphaTab.model.Bar();
          newBar.clef = presetData.clefs[track.staves.length];
          newStaff.addBar(newBar);
        }
      }
      track.addStaff(newStaff);
    }

    for (let i = 0; i < track.staves.length; i++) {
      const staff = track.staves[i];
      staff.clef = presetData.clefs[i];
      staff.showStandardNotation = presetData.modes[i] === "standard" || presetData.modes[i] === "scoretab";
      staff.showTablature = presetData.modes[i] === "tab" || presetData.modes[i] === "scoretab";
      staff.isPercussion = false;
      if (!staff.stringTuning?.tunings?.length) {
        staff.stringTuning = alphaTab.model.Tuning.getDefaultTuningFor(6) ||
          new alphaTab.model.Tuning("Guitar Standard Tuning", [64, 59, 55, 50, 45, 40], true);
      }
    }

    this.#applyVoiceDisplay();
    this.#finishAndUpdate(true);
  }

  getStaffCount(index) {
    return this.score?.tracks?.[index]?.staves?.length ?? 0;
  }

  getStaffClef(index, staffIndex) {
    const bar = this.score?.tracks?.[index]?.staves?.[staffIndex]?.bars?.[0];
    return bar?.clef ?? alphaTab.model.Clef.G2;
  }

  setTrackStaffMode(index, mode) {
    const track = this.score?.tracks?.[index];
    if (!track || !track.staves.length) return;
    const currentMode = this.getTrackStaffMode(index);
    if (mode === currentMode) return;
    this.#project.history.snapshot();

    if (mode === "drum") {
      for (const staff of track.staves) {
        staff.isPercussion = true;
        staff.showTablature = false;
        staff.showStandardNotation = true;
        staff.stringTuning = new alphaTab.model.Tuning("", [], false);
        for (const bar of staff.bars) {
          bar.clef = alphaTab.model.Clef.Neutral;
          for (const voice of bar.voices) {
            for (const beat of voice.beats) {
              for (const note of beat.notes || []) {
                note.percussionArticulation = note.percussionArticulation < 0 ? 36 : note.percussionArticulation;
                note.string = -1;
                note.fret = -1;
              }
            }
          }
        }
      }
    } else if (mode === "grand") {
      while (track.staves.length < 2) {
        const newStaff = new alphaTab.model.Staff();
        const firstStaff = track.staves[0];
        newStaff.showStandardNotation = true;
        newStaff.showTablature = true;
        if (firstStaff?.stringTuning?.tunings?.length) {
          newStaff.stringTuning = new alphaTab.model.Tuning(firstStaff.stringTuning.name, [...firstStaff.stringTuning.tunings], false);
        }
        if (firstStaff) {
          for (const bar of firstStaff.bars) {
            const newBar = new alphaTab.model.Bar();
            newBar.clef = alphaTab.model.Clef.F4;
            newStaff.addBar(newBar);
          }
        }
        track.addStaff(newStaff);
      }
      while (track.staves.length > 2) {
        track.staves.pop();
      }
      track.staves[0].clef = alphaTab.model.Clef.G2;
      track.staves[0].showStandardNotation = true;
      track.staves[0].showTablature = true;
      track.staves[0].isPercussion = false;
      if (track.staves[1]) {
        track.staves[1].clef = alphaTab.model.Clef.F4;
        track.staves[1].showStandardNotation = true;
        track.staves[1].showTablature = true;
        track.staves[1].isPercussion = false;
      }
    } else {
      const showStandard = mode === "standard" || mode === "scoretab";
      const showTab = mode === "tab" || mode === "scoretab";
      for (const staff of track.staves) {
        staff.isPercussion = false;
        staff.showStandardNotation = showStandard;
        staff.showTablature = showTab;
        if (!staff.stringTuning?.tunings?.length) {
          staff.stringTuning = alphaTab.model.Tuning.getDefaultTuningFor(6) ||
            new alphaTab.model.Tuning("Guitar Standard Tuning", [64, 59, 55, 50, 45, 40], true);
        }
        const tunings = staff.stringTuning.tunings;
        let hasPianoNote = false;
        for (const bar of staff.bars) {
          bar.clef = alphaTab.model.Clef.G2;
          for (const voice of bar.voices) {
            for (const beat of voice.beats) {
              for (const note of beat.notes || []) {
                note.percussionArticulation = -1;
                if (note.octave >= 0 && note.tone >= 0) hasPianoNote = true;
              }
            }
          }
        }
        if (hasPianoNote) this.#retuneToTuning(staff, tunings);
        for (const bar of staff.bars) {
          for (const voice of bar.voices) {
            for (const beat of voice.beats) {
              for (const note of beat.notes || []) {
                if (!note.isStringed && !(note.octave >= 0 && note.tone >= 0)) {
                  note.string = 1;
                  note.fret = 0;
                }
              }
            }
          }
        }
      }
    }
    this.#applyVoiceDisplay();
    this.#finishAndUpdate(true);
  }

  setStaffClef(index, staffIndex, clef) {
    const staff = this.score?.tracks?.[index]?.staves?.[staffIndex];
    if (!staff) return;
    this.#project.history.snapshot();
    for (const bar of staff.bars) {
      bar.clef = clef;
    }
    this.#finishAndUpdate(true, true);
  }

  addStaff(trackIndex) {
    const track = this.score?.tracks?.[trackIndex];
    if (!track) return;
    this.#project.history.snapshot();
    const newStaff = new alphaTab.model.Staff();
    const firstStaff = track.staves[0];
    newStaff.showStandardNotation = firstStaff?.showStandardNotation ?? true;
    newStaff.showTablature = firstStaff?.showTablature ?? false;
    if (firstStaff?.stringTuning?.tunings?.length) {
      newStaff.stringTuning = new alphaTab.model.Tuning(firstStaff.stringTuning.name, [...firstStaff.stringTuning.tunings], false);
    }
    if (firstStaff) {
      for (const bar of firstStaff.bars) {
        const newBar = new alphaTab.model.Bar();
        newBar.clef = alphaTab.model.Clef.G2;
        newStaff.addBar(newBar);
      }
    }
    track.addStaff(newStaff);
    this.#finishAndUpdate(true, true);
  }

  removeStaff(trackIndex, staffIndex) {
    const track = this.score?.tracks?.[trackIndex];
    if (!track || track.staves.length <= 1) return;
    this.#project.history.snapshot();
    track.staves.splice(staffIndex, 1);
    for (let i = staffIndex; i < track.staves.length; i++) {
      track.staves[i].index = i;
    }
    this.#finishAndUpdate(true);
  }

  getTrackProgram(index) {
    return this.score?.tracks?.[index]?.playbackInfo?.program ?? 0;
  }

  setTrackProgram(index, program) {
    const track = this.score?.tracks?.[index];
    if (!track || this.isTrackDrum(index)) return;
    this.#project.history.snapshot();
    track.playbackInfo.program = Math.max(0, Math.min(127, Math.round(program)));
    this.#applyInstrumentDefaults(index);
    this.#assignChannels();
    this.#applyVoiceDisplay();
    this.#finishAndUpdate(true);
  }

  // Whether the track's instrument is a fretted/stringed one that shows tab.
  // Drives the Tuning section of the Track tab so piano etc. don't expose it.
  isFrettedInstrument(index) {
    const track = this.score?.tracks?.[index];
    const staff = track?.staves?.[0];
    if (!track || !staff || staff.isPercussion) return false;
    return !!this.#tuningForProgram(track.playbackInfo?.program ?? 0);
  }

  // Default tunings for fretted instruments (mirrors alphaTab's own import
  // heuristic in ScoreImporter._detectTuningForStaff). Arrays are ordered
  // highest string first, lowest last. Returns null for non-fretted programs.
  #tuningForProgram(program) {
    if (program >= 24 && program <= 31) return { name: "Guitar Standard Tuning", tunings: [64, 59, 55, 50, 45, 40] };
    if (program >= 32 && program <= 39) return { name: "Bass Standard Tuning", tunings: [43, 38, 33, 28] };
    if (program === 104) return { name: "Sitar Tuning", tunings: [64, 59, 50, 45, 40] };
    if (program === 105) return { name: "Banjo Tuning", tunings: [50, 47, 43, 38, 55] };
    if (program === 106) return { name: "Shamisen Tuning", tunings: [57, 52, 45] };
    if (program === 107) return { name: "Koto Tuning", tunings: [52, 45, 38, 31] };
    if (program === 110) return { name: "Steel Drums Tuning", tunings: [64, 57, 50, 43] };
    return null;
  }

  #tuningsEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  // Applies the display/tuning defaults for the track's current program.
  // Fretted instruments get a real string tuning + tablature and their notes
  // are remapped to strings/frets; everything else falls back to standard
  // notation (converting stringed notes back to octave/tone pairs).
  #applyInstrumentDefaults(index) {
    const staff = this.score?.tracks?.[index]?.staves?.[0];
    if (!staff || staff.isPercussion) return;
    const program = staff.track.playbackInfo.program;
    const preset = this.#tuningForProgram(program);

    if (preset) {
      const current = staff.stringTuning?.tunings || [];
      let hasUnstringedNote = false;
      for (const bar of staff.bars || []) {
        for (const voice of bar.voices || []) {
          for (const beat of voice.beats || []) {
            for (const note of beat.notes || []) {
              if (!note.isStringed) { hasUnstringedNote = true; break; }
            }
            if (hasUnstringedNote) break;
          }
          if (hasUnstringedNote) break;
        }
        if (hasUnstringedNote) break;
      }
      if (!this.#tuningsEqual(current, preset.tunings) || hasUnstringedNote) {
        const oldTunings = staff.stringTuning?.tunings?.length ? [...staff.stringTuning.tunings] : [];
        staff.stringTuning = new alphaTab.model.Tuning(preset.name, [...preset.tunings], false);
        this.#retuneToTuning(staff, preset.tunings, oldTunings);
      }
      staff.showTablature = true;
      staff.showStandardNotation = true;
      for (const bar of staff.bars || []) bar.clef = alphaTab.model.Clef.G2;
    } else {
      staff.showTablature = false;
      staff.showStandardNotation = true;
      this.#convertToStandardNotation(staff);
    }
  }

  // Remaps every note of a staff onto the given tuning (highest string first).
  // Stringed notes are re-fretted from their old pitch; piano-style notes
  // (octave/tone) are assigned to the closest string+fret. Notes that cannot
  // be fretted within 0-24 are removed.
  #retuneToTuning(staff, newTunings, oldTunings) {
    if (!staff?.bars) return;
    if (!oldTunings || !oldTunings.length) {
      oldTunings = staff.stringTuning?.tunings?.length ? [...staff.stringTuning.tunings] : [];
    }
    const hasOldTuning = oldTunings.length > 0;
    for (const bar of staff.bars) {
      for (const voice of bar.voices || []) {
        for (const beat of voice.beats || []) {
          const toRemove = [];
          for (const note of beat.notes || []) {
            if (note.isPercussion) continue;
            let pitch = null;
            if (note.isStringed && hasOldTuning && note.string >= 1 && note.string <= oldTunings.length) {
              pitch = oldTunings[oldTunings.length - note.string] + (note.fret > -1 ? note.fret : 0);
            } else if (note.octave >= 0 && note.tone >= 0) {
              pitch = note.octave * 12 + note.tone;
            }
            if (pitch == null) continue;
            let bestString = -1;
            let bestFret = 99;
            for (let s = 1; s <= newTunings.length; s++) {
              const f = pitch - newTunings[newTunings.length - s];
              if (f >= 0 && f <= 24 && f < bestFret) {
                bestFret = f;
                bestString = s;
              }
            }
            if (bestString !== -1) {
              note.string = bestString;
              note.fret = bestFret;
              note.octave = -1;
              note.tone = -1;
            } else {
              toRemove.push(note);
            }
          }
          for (const note of toRemove) beat.removeNote(note);
          if (beat.noteStringLookup) {
            beat.noteStringLookup.clear();
            for (const n of beat.notes) if (n.isStringed) beat.noteStringLookup.set(n.string, n);
          }
        }
      }
    }
  }

  // Converts stringed notes of a staff to piano-style (octave/tone) notes so
  // they render correctly in standard notation on non-fretted instruments.
  #convertToStandardNotation(staff) {
    if (!staff?.bars) return;
    const tuning = staff.stringTuning?.tunings?.length ? [...staff.stringTuning.tunings] : [];
    for (const bar of staff.bars) {
      for (const voice of bar.voices || []) {
        for (const beat of voice.beats || []) {
          for (const note of beat.notes || []) {
            if (note.isPercussion) continue;
            let pitch = null;
            if (note.isStringed && tuning.length && note.string >= 1 && note.string <= tuning.length) {
              pitch = tuning[tuning.length - note.string] + (note.fret > -1 ? note.fret : 0);
            } else if (note.octave >= 0 && note.tone >= 0) {
              pitch = note.octave * 12 + note.tone;
            }
            if (pitch == null) continue;
            note.octave = Math.floor(pitch / 12);
            note.tone = pitch % 12;
            note.string = -1;
            note.fret = -1;
          }
          if (beat.noteStringLookup) {
            beat.noteStringLookup.clear();
            for (const n of beat.notes) if (n.isStringed) beat.noteStringLookup.set(n.string, n);
          }
        }
      }
    }
  }

  // The edited voice renders fully opaque; all other voices are dimmed.
  // Uses alphaTab's public per-voice style API (VoiceSubElement.Glyphs).
  #applyVoiceDisplay() {
    const track = this.currentTrack;
    const staff = track?.staves?.[0];
    if (!staff) return;
    const active = this.activeVoiceIndex;
    const opaque = new alphaTab.model.Color(0, 0, 0, 255);
    const dimmed = new alphaTab.model.Color(0, 0, 0, 70);
    for (const bar of staff.bars || []) {
      for (const voice of bar.voices || []) {
        if (voice.isEmpty) continue;
        if (!voice.style) voice.style = new alphaTab.model.VoiceStyle();
        voice.style.colors.set(
          alphaTab.model.VoiceSubElement.Glyphs,
          voice.index === active ? opaque : dimmed,
        );
      }
    }
  }

  getTrackTuning(index) {
    return this.score?.tracks?.[index]?.staves?.[0]?.stringTuning || null;
  }

  getTrackStringCount(index) {
    const tunings = this.getTrackTuning(index)?.tunings;
    return tunings ? tunings.length : 6;
  }

  setTrackStringCount(index, count) {
    const staff = this.score?.tracks?.[index]?.staves?.[0];
    const tuning = staff?.stringTuning;
    if (!tuning || staff.isPercussion) return;
    count = Math.max(4, Math.min(8, Math.round(count)));
    const current = [...(tuning.tunings || [])];
    if (current.length === count) return;
    this.#project.history.snapshot();
    if (count > current.length) {
      // Append new strings below the current lowest (end of array)
      let pitch = (current.length ? current[current.length - 1] : 40) - 5;
      const added = [];
      while (added.length < count - current.length) {
        added.push(Math.max(24, pitch));
        pitch -= 5;
      }
      tuning.tunings = [...current, ...added];
    } else {
      // Drop the lowest strings (tail of array)
      tuning.tunings = current.slice(0, count);
    }
    tuning.name = "Custom";
    this.#retuneStaffNotes(staff, current, tuning.tunings);
    this.#finishAndUpdate(true);
  }

  setTrackStringPitch(index, stringIndex, midi) {
    const staff = this.score?.tracks?.[index]?.staves?.[0];
    const tuning = staff?.stringTuning;
    if (!tuning || staff.isPercussion) return;
    stringIndex = Math.round(stringIndex);
    if (stringIndex < 0 || stringIndex >= (tuning.tunings?.length || 0)) return;
    midi = Math.max(24, Math.min(84, Math.round(midi)));
    if (tuning.tunings[stringIndex] === midi) return;
    this.#project.history.snapshot();
    const oldTunings = [...tuning.tunings];
    const pitches = [...oldTunings];
    pitches[stringIndex] = midi;
    tuning.tunings = pitches;
    tuning.name = "Custom";
    // Preserve the sounded pitch: recompute frets so notes don't change key
    this.#retuneStaffNotes(staff, oldTunings, tuning.tunings);
    this.#finishAndUpdate(true);
  }

  // ── Score Field Helpers ───────────────────────────────────────────────────────

  updateScoreField(field, value) {
    if (!this.#engine.api?.score) return;
    this.#project.history.snapshot();
    this.#engine.api.score[field] = value;
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();
  }

  updateSettingsField(group, field, value) {
    const api = this.#engine.api;
    if (!api?.settings) return;
    api.settings[group][field] = value;
    // Lazy loading is unreliable in horizontal layout (one giant system), so
    // render horizontal scores fully. Page layout can go back to lazy loading.
    if (field === "layoutMode") {
      api.settings.core.enableLazyLoading = value !== 1;
      if (value === 1) {
        this.#horizontalPrevScale = api.settings.display.scale;
        this.#fitHorizontalScale(api);
      } else if (this.#horizontalPrevScale != null) {
        api.settings.display.scale = this.#horizontalPrevScale;
        this.#horizontalPrevScale = null;
      }
    }
    api.updateSettings();
    // Re-target the track list explicitly and scroll back to the start; a plain
    // render() can reuse stale track/partial state and break multitrack layouts.
    this.#scrollHandler?.onTrackChanged();
    this.#finishRender();
    const scrollEl = api.settings.player?.scrollElement;
    if (scrollEl) {
      scrollEl.scrollTop = 0;
      scrollEl.scrollLeft = 0;
    }
  }

  // Horizontal layout renders the whole song as ONE giant system (alphaTab's
  // barCountPerPartial splitting is defeated by multi-bar effects such as
  // let-ring/palm-mute). On big multitrack files that single canvas can be
  // 100k+ px wide, which exceeds browser canvas limits and/or takes ages to
  // rasterize (blank score / freeze). After the layout mode changes, poll
  // renderer.totalWidth and reduce display.scale just enough to fit.
  #fitHorizontalScale(api) {
    if (!api?.score) return;
    const maxWidth = 28000;
    const minScale = 0.15;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.#horizontalPrevScale === null) {
      this.#horizontalPrevScale = api.settings.display.scale;
    }
    api.settings.core.enableLazyLoading = false;
    api.updateSettings();

    let attempts = 0;
    const maxAttempts = 20;
    const check = () => {
      attempts++;
      const total = api.renderer?.totalWidth;
      if (!total || total <= 0) {
        if (attempts < maxAttempts) {
          setTimeout(check, 150);
        }
        return;
      }
      if (total * dpr > maxWidth) {
        api.settings.display.scale = Math.max(
          minScale,
          (maxWidth / (total * dpr)) * api.settings.display.scale
        );
        api.updateSettings();
      }
    };
    setTimeout(check, 400);
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  // Ensure every track gets its own MIDI channel(s) (skipping the percussion
  // channel 9). alphaTab emits one ProgramChange per channel, so if two tracks
  // share a channel the last one wins and instrument changes stop working.
  #assignChannels() {
    const score = this.#engine.api?.score;
    if (!score) return;
    const used = new Set([9]);
    for (const track of score.tracks) {
      const isPerc = track.staves?.some((s) => s.isPercussion);
      if (isPerc) {
        track.playbackInfo.primaryChannel = 9;
        track.playbackInfo.secondaryChannel = 9;
        continue;
      }
      let ch = track.playbackInfo.primaryChannel;
      while (ch === 9 || used.has(ch)) ch = (ch + 1) % 16;
      track.playbackInfo.primaryChannel = ch;
      used.add(ch);
      let ch2 = track.playbackInfo.secondaryChannel;
      while (ch2 === 9 || used.has(ch2)) ch2 = (ch2 + 1) % 16;
      track.playbackInfo.secondaryChannel = ch2;
      used.add(ch2);
    }
  }

  // Preserves the sounded pitch of every note when a staff's tuning changes:
  // frets are recomputed from the old tuning snapshot. Notes that can no
  // longer be fretted within 0–24 are removed.
  #retuneStaffNotes(staff, oldTunings, newTunings) {
    if (!staff?.bars || staff.isPercussion) return;
    const oldCount = oldTunings.length;
    const newCount = newTunings.length;
    if (!oldCount) return;
    const shift = newCount - oldCount;
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          const toRemove = [];
          for (const note of beat.notes || []) {
            if (note.string < 1 || note.string > oldCount) continue;
            const fret = note.fret > -1 ? note.fret : 0;
            const pitch = oldTunings[oldCount - note.string] + fret;
            // Strings are numbered 1 (lowest)..N (highest). Adding strings
            // appends below the lowest, removing drops the lowest ones.
            let newString = note.string + shift;
            if (newString < 1) newString = 1;
            if (newString > newCount) continue;
            const newFret = pitch - newTunings[newCount - newString];
            if (newFret >= 0 && newFret <= 24) {
              note.string = newString;
              note.fret = newFret;
            } else {
              toRemove.push(note);
            }
          }
          for (const note of toRemove) beat.removeNote(note);
          // alphaTab caches notes per string — keep it in sync after retuning
          if (beat.noteStringLookup) {
            beat.noteStringLookup.clear();
            for (const n of beat.notes) if (n.isStringed) beat.noteStringLookup.set(n.string, n);
          }
        }
      }
    }
  }

  #finishAndUpdate(full = false, skipMidiSync = false) {
    const beat = this.activeBeat;
    const note = this.activeNote;
    const savedString = this.activeString;
    let beatIdx = -1;
    let noteString = note?.string;
    let noteFret = note?.fret;
    if (beat?.voice?.beats) beatIdx = beat.voice.beats.indexOf(beat);

    this.#project.hasUnsavedChanges = true;
    try { this.score?.finish(); } catch (e) { console.warn("alphaTab finish:", e); }

    this.#assignChannels();

    if (!skipMidiSync) {
      try {
        const api = this.#engine.api;
        const wasPlaying = api.playerState === 2;
        const tick = api.tickPosition || 0;
        let handled = false;
        let unregister;
        try {
          unregister = api.midiLoaded.on(() => {
            if (handled) return;
            handled = true;
            try { api.player.resetChannelStates(); } catch {}
            try {
              const score = api.score;
              if (score) {
                for (const track of score.tracks) {
                  const program = track.playbackInfo.program;
                  for (const ch of [track.playbackInfo.primaryChannel, track.playbackInfo.secondaryChannel]) {
                    if (ch >= 0 && ch !== 9) {
                      try { api.player.synthesizer.channelSetPresetNumber(ch, program, false); } catch {}
                    }
                  }
                }
              }
            } catch {}
            if (wasPlaying) {
              try { api.pause(); } catch {}
              api.play();
            }
            if (tick > 0) api.tickPosition = tick;
            try { api.updateSyncPoints(); } catch {}
            this.#syncPlaybackState();
            if (typeof unregister === "function") unregister();
          });
        } catch {}
        api.loadMidiForScore();
      } catch (e) { console.warn("loadMidiForScore:", e); }
    }

    if (beatIdx !== -1 && beat?.voice?.beats && beatIdx < beat.voice.beats.length) {
      this.activeBeat = beat.voice.beats[beatIdx];
    }
    if (this.activeBeat?.notes && noteString != null) {
      this.activeNote = this.activeBeat.notes.find(
        (n) => n.string === noteString && n.fret === noteFret
      ) || this.activeBeat.notes.find((n) => n.string === noteString)
      || null;
    }
    this.activeString = savedString;

    this.updateOverlay();
    this.#finishRender(full ? undefined : this.#renderHints());
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  // When a track is marked hidden, only the visible tracks get rendered.
  #applyVisibility() {
    const api = this.#engine.api;
    if (!api?.score) return;
    const tracks = api.score.tracks;
    const visible = tracks.filter((t) => t.isVisibleOnMultiTrack !== false);
    this.#renderFilterActive = visible.length < tracks.length;
    // Skip re-rendering when nothing is hidden: alphaTab already renders the
    // full score on load, an extra renderTracks() here would render it twice.
    if (this.#renderFilterActive) {
      try { api.renderTracks(visible); } catch {}
    }
  }

  // Renders the score, keeping the visible-track filter in sync.
  // Always re-target the renderer's track list explicitly: alphaTab keeps the
  // last renderTracks() subset and a plain render() would reuse it, leaving
  // newly added tracks invisible after a previous hide/show cycle.
  #finishRender(renderHints) {
    const api = this.#engine.api;
    if (!api?.score) {
      this.#engine.requestUpdate();
      return;
    }
    const tracks = api.score.tracks;
    const visible = tracks.filter((t) => t.isVisibleOnMultiTrack !== false);
    this.#renderFilterActive = visible.length < tracks.length;
    try {
      api.renderTracks(visible.length < tracks.length ? visible : tracks, renderHints);
    } catch {}
    const s = api.settings?.display;
    this.#lastRenderContext = `${tracks.length}:${visible.length}:${s?.layoutMode}:${s?.scale}`;
  }

  // Builds a partial-render hint for the currently edited bar. Partial updates
  // are only safe when the render context is unchanged since the last render
  // (same tracks, visibility, layout); horizontal layout disables lazy loading
  // so alphaTab always full-renders there.
  #renderHints() {
    const api = this.#engine.api;
    const s = api?.settings?.display;
    if (!api || !s || s.layoutMode === 1) return undefined;
    const barIndex = this.activeBeat?.voice?.bar?.index;
    if (barIndex == null) return undefined;
    const tracks = api.score?.tracks || [];
    const visible = tracks.filter((t) => t.isVisibleOnMultiTrack !== false).length;
    const context = `${tracks.length}:${visible}:${s.layoutMode}:${s.scale}`;
    if (context !== this.#lastRenderContext) return undefined;
    return { firstChangedMasterBar: barIndex };
  }

  // Re-apply mute/solo to the player after MIDI reloads reset channel states.
  #syncPlaybackState() {
    const api = this.#engine.api;
    if (!api?.score) return;
    try {
      for (const track of api.score.tracks) {
        api.changeTrackMute([track], !!track.playbackInfo.isMute);
        api.changeTrackSolo([track], !!track.playbackInfo.isSolo);
      }
    } catch {}
  }
}

// Replaces alphaTab's built-in scroll handler so that during playback the view
// follows the beat of the SELECTED (active) track instead of always the first
// one. Implements the IScrollHandler interface used by customScrollHandler.
class ActiveTrackScrollHandler {
  #api;
  #editor;
  #lastY = -1;
  #lastX = -1;

  constructor(api, editor) {
    this.#api = api;
    this.#editor = editor;
  }

  [Symbol.dispose]() {}

  // Forget the last scroll target so the next cursor update re-scrolls even if
  // the target happens to share coordinates with the previously scrolled system.
  onTrackChanged() {
    this.#lastY = -1;
    this.#lastX = -1;
  }

  // Maps the "first track" beat alphaTab's cursor tracks to the beat of the
  // same bar in the currently selected track.
  #resolve(beatBounds) {
    const api = this.#api;
    const editor = this.#editor;
    const beat = beatBounds?.beat;
    if (!beat) return beatBounds;
    const track = api.score?.tracks?.[editor.selectedTrackIndex];
    const staff = track?.staves?.[0];
    const barIndex = beat.voice?.bar?.index;
    if (!staff || barIndex == null || barIndex >= staff.bars.length) return beatBounds;
    const bar = staff.bars[barIndex];
    const start = beat.playbackStart;
    let target = null;
    for (const voice of bar.voices || []) {
      for (const b of voice.beats || []) {
        if (b.playbackStart === start) {
          target = b;
          break;
        }
      }
      if (target) break;
    }
    if (!target) return beatBounds;
    return api.boundsLookup?.findBeat(target) || beatBounds;
  }

  #scroll(b) {
    const api = this.#api;
    const ui = api.uiFacade;
    if (!ui) return;
    const scroll = ui.getScrollContainer();
    if (!scroll) return;
    const barBounds = b?.barBounds?.masterBarBounds;
    if (!barBounds) return;
    const settings = api.settings;
    const horizontal = settings?.display?.layoutMode === 1;
    // Follow the playhead: keep the current bar's row pinned to the top of the
    // viewport. Offscreen-style gating only fires at page boundaries (a single
    // page can last ~50s at 138bpm), which reads as "auto-scroll does nothing".
    if (horizontal) {
      const target = barBounds.realBounds.x + (settings.player.scrollOffsetX || 0);
      if (target !== this.#lastX) {
        this.#lastX = target;
        ui.scrollToX(scroll, target, settings.player.scrollSpeed);
      }
    } else {
      const target = barBounds.realBounds.y + (settings.player.scrollOffsetY || 0);
      if (target !== this.#lastY) {
        this.#lastY = target;
        ui.scrollToY(scroll, target, settings.player.scrollSpeed);
      }
    }
  }

  forceScrollTo(currentBeatBounds) {
    this.#lastY = -1;
    this.#lastX = -1;
    this.#scroll(this.#resolve(currentBeatBounds));
  }

  onBeatCursorUpdating(startBeat) {
    this.#scroll(this.#resolve(startBeat), false);
  }
}
