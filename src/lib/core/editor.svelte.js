import * as alphaTab from "@coderline/alphatab";

export class Editor {
  #engine;
  #project;

  activeBeat = $state(null);
  activeNote = $state(null);
  activeString = $state(1);

  // Selection: null means no range, otherwise {anchor, active} are beat objects
  selectionAnchor = $state(null);

  clipboard = $state(null); // array of beat snapshots

  // Remembers last fret used so addNote can repeat it
  #lastFret = 0;

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

    api.activeBeatsChanged?.on((args) => {
      if (args.activeBeats?.[0]) {
        // Playback cursor moved — follow it but don't disrupt editing state
        const beat = args.activeBeats[0];
        this.activeBeat = beat;
        this.updateOverlay();
      }
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
      const firstBeat = this.getFirstBeat();
      if (firstBeat) this.selectBeat(firstBeat);
    });
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get score() {
    this.#engine.currentTick;
    return this.#engine.api?.score;
  }

  get currentTrack() {
    this.#engine.currentTick;
    return this.#engine.api?.score?.tracks?.[0] || null;
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
    return this.currentTrack?.staves?.[0]?.stringTuning?.tunings?.length || 6;
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
    return track?.staves?.[0]?.bars?.[0]?.voices?.[0]?.beats?.[0] || null;
  }

  // ── Staff Beat List ──────────────────────────────────────────────────────────

  #getAllBeats() {
    const beat = this.currentActiveBeat;
    if (!beat?.voice?.bar?.staff) return [];
    const staff = beat.voice.bar.staff;
    const beats = [];
    for (const bar of staff.bars || []) {
      for (const voice of bar.voices || []) {
        for (const b of voice.beats || []) {
          beats.push(b);
        }
      }
    }
    return beats;
  }

  // ── Overlay / Indicators ────────────────────────────────────────────────────

  #getTabStaffInfo(beat) {
    const api = this.#engine.api;
    if (!api?.boundsLookup || !beat) return null;

    const beatBounds = api.boundsLookup.findBeat(beat);
    if (!beatBounds?.visualBounds) return null;

    const vb = beatBounds.visualBounds;

    // Walk the stave system to find the tab staff's visual bounds
    const barBounds = beatBounds.barBounds;
    const staves = barBounds?.staffSystemBounds?.staffBounds ?? [];
    let tabStaff = null;
    for (const s of staves) {
      if (s.isTabStaff || s.staff?.isTab) {
        tabStaff = s;
        break;
      }
    }

    const tabY = tabStaff?.visualBounds?.y ?? vb.y;
    const tabH = tabStaff?.visualBounds?.h ?? vb.h;
    const numStrings = this.stringCount;
    const stringGap = tabH / Math.max(numStrings - 1, 1);

    return { vb, tabY, tabH, stringGap };
  }

  #findNoteBounds(beatBounds, note) {
    if (!note || !beatBounds?.notes) return null;
    for (const nb of beatBounds.notes) {
      if (nb.note === note && nb.noteHeadBounds) return nb;
    }
    // Fallback: alphaTab may have rebuilt notes — match by string+fret
    for (const nb of beatBounds.notes) {
      if (nb.noteHeadBounds && nb.note.string === note.string && nb.note.fret === note.fret) return nb;
    }
    // Last resort: match by string only
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

      const info = this.#getTabStaffInfo(beat);
      if (!info) {
        this.beatCursorBox = null;
        this.cursorBox = null;
        this.selectionBoxes = [];
        return;
      }

      const { vb, tabY, tabH, stringGap } = info;

      // 1. Beat indicator — full column covering the whole tab staff
      this.beatCursorBox = {
        x: vb.x - 2,
        y: tabY - 4,
        w: Math.max(vb.w + 4, 18),
        h: tabH + 8,
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
        // Fallback: place cursor at the beat's onNotesX on the active string row
        const activeStr = this.activeNote.string ?? this.activeString;
        const clampedStr = Math.min(Math.max(activeStr, 1), this.stringCount);
        const stringY = tabY + (clampedStr - 1) * stringGap;
        this.cursorBox = {
          x: (beatBounds.onNotesX ?? vb.x) - 4,
          y: stringY - 9,
          w: Math.max(vb.w + 6, 20),
          h: 18,
        };
      } else {
        this.cursorBox = null;
      }

      // 3. Selection range boxes (multi-beat highlight)
      const selected = this.getSelectedBeats();
      if (selected.length > 1) {
        this.selectionBoxes = selected.map((b) => {
          const bi = this.#getTabStaffInfo(b);
          if (!bi) return null;
          return {
            x: bi.vb.x - 2,
            y: bi.tabY - 4,
            w: Math.max(bi.vb.w + 4, 18),
            h: bi.tabH + 8,
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

  // Move cursor position to different string
  moveString(delta) {
    const next = Math.min(Math.max(this.activeString + delta, 1), this.stringCount);
    if (next === this.activeString) return;
    if (this.activeNote) {
      this.#project.history.snapshot();
      this.activeNote.string = next;
      this.activeString = next;
      this.#finishAndUpdate();
    } else {
      this.activeString = next;
      this.updateOverlay();
    }
  }

  // ── Note Editing ─────────────────────────────────────────────────────────────

  addNote() {
    const beat = this.currentActiveBeat;
    if (!beat) return;

    this.#project.history.snapshot();

    const note = new alphaTab.model.Note();
    note.string = this.activeString;
    note.fret = this.activeNote?.fret ?? this.#lastFret;
    beat.addNote(note);
    this.activeNote = note;
    this.#lastFret = note.fret;

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
    if (!this.activeNote) {
      // Ensure a note exists without double-snapshotting
      const beat = this.currentActiveBeat;
      let note = beat.notes?.find((n) => n.string === this.activeString);
      if (!note) {
        this.#project.history.snapshot();
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

  // ── Score Field Helpers ───────────────────────────────────────────────────────

  updateScoreField(field, value) {
    if (!this.#engine.api?.score) return;
    this.#project.history.snapshot();
    this.#engine.api.score[field] = value;
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();
  }

  updateSettingsField(group, field, value) {
    if (!this.#engine.api?.settings) return;
    this.#engine.api.settings[group][field] = value;
    this.#engine.api.updateSettings();
    this.#engine.requestUpdate();
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  #finishAndUpdate() {
    const beat = this.activeBeat;
    const note = this.activeNote;
    const savedString = this.activeString;
    let beatIdx = -1;
    let noteString = note?.string;
    let noteFret = note?.fret;
    if (beat?.voice?.beats) beatIdx = beat.voice.beats.indexOf(beat);

    this.#project.hasUnsavedChanges = true;
    try { this.score?.finish(); } catch (e) { console.warn("alphaTab finish:", e); }

    // Re-sync player MIDI with the updated score so playback reflects edits
    try { this.#engine.api?.loadMidiForScore(); } catch (e) { console.warn("loadMidiForScore:", e); }

    // Re-resolve activeBeat from the rebuilt model
    if (beatIdx !== -1 && beat?.voice?.beats && beatIdx < beat.voice.beats.length) {
      this.activeBeat = beat.voice.beats[beatIdx];
    }
    // Re-resolve activeNote by string+fret on the beat
    if (this.activeBeat?.notes && noteString != null) {
      this.activeNote = this.activeBeat.notes.find(
        (n) => n.string === noteString && n.fret === noteFret
      ) || this.activeBeat.notes.find((n) => n.string === noteString)
      || null;
    }
    this.activeString = savedString;

    this.updateOverlay();
    this.#engine.requestUpdate();
  }
}
