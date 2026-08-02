import * as alphaTab from "@coderline/alphatab";

export class Editor {
  #engine;
  #project;

  activeBeat = $state(null);
  activeNote = $state(null);
  activeString = $state(1);
  cursorBox = $state(null);
  selectionBoxes = $state([]);
  clipboard = $state(null);

  constructor(engine, project) {
    this.#engine = engine;
    this.#project = project;
  }

  initListeners() {
    const api = this.#engine.api;
    if (!api) return;

    api.scoreLoaded.on(() => {
      const fb = this.firstBeat;
      if (fb) {
        this.selectBeat(fb);
        api.activeBeats = [];
      }
      this.updateCursorBox();
    });

    api.postRenderFinished.on(() => {
      this.updateCursorBox();
    });
  }

  get firstBeat() {
    return (
      this.#engine.api?.score?.tracks?.[0]?.staves?.[0]?.bars?.[0]?.voices?.[0]
        ?.beats?.[0] || null
    );
  }

  get currentActiveBeat() {
    if (this.activeBeat) return this.activeBeat;
    const fb = this.firstBeat;
    if (fb && this.#engine.api) {
      this.selectBeat(fb);
      this.#engine.api.activeBeats = [];
    }
    return this.activeBeat;
  }

  get beatNotes() {
    const beat = this.currentActiveBeat;
    if (!beat?.notes?.length) return [];
    return [...beat.notes].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  }

  get stringCount() {
    const staff = this.currentActiveBeat?.voice?.bar?.staff;
    return staff?.stringTuning?.tunings?.length || 6;
  }

  get cursorLabel() {
    const beat = this.currentActiveBeat;
    if (!beat) return "No beat";

    const beatIndex = beat.voice?.beats?.indexOf(beat);
    const beatLabel = beatIndex >= 0 ? `Beat ${beatIndex + 1}` : "Beat";
    const noteIndex = this.activeNote ? this.beatNotes.indexOf(this.activeNote) + 1 : 0;
    const noteLabel = this.activeNote ? ` • Note ${noteIndex}` : " • No note";
    const fretLabel = this.activeNote ? ` • Fret ${this.activeNote.fret ?? 0}` : "";
    const stringLabel = this.activeNote?.string ? ` • String ${this.activeNote.string}` : ` • String ${this.activeString}`;
    return `${beatLabel}${noteLabel}${stringLabel}${fretLabel}`;
  }

  get score() {
    this.#engine.currentTick;
    return this.#engine.api?.score;
  }

  get tracks() {
    this.#engine.currentTick;
    return this.#engine.api?.score?.tracks || [];
  }

  get settings() {
    this.#engine.currentTick;
    return this.#engine.api?.settings;
  }

  updateScoreField(field, value) {
    if (!this.#engine.api?.score) return;
    this.#project.history.snapshot();
    this.#engine.api.score[field] = value;
    this.#engine.api.score.finish();
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();
  }

  updateSettingsField(group, field, value) {
    if (!this.#engine.api?.settings) return;
    this.#engine.api.settings[group][field] = value;
    this.#engine.api.updateSettings();
    this.#engine.requestUpdate();
  }

  getTabStaffInfo(beat, api) {
    const beatBounds = api.boundsLookup?.findBeat?.(beat);
    if (!beatBounds?.visualBounds) return null;

    const vb = beatBounds.visualBounds;
    const staffGroups = api.boundsLookup?.staffGroups || [];

    let tabStaff = null;
    for (const group of staffGroups) {
      const groupBounds = group.visualBounds;
      if (
        groupBounds &&
        vb.y >= groupBounds.y - 20 &&
        vb.y <= groupBounds.y + groupBounds.h + 20
      ) {
        const staves = group.staves || [];
        tabStaff =
          staves.find((s) => s.stave?.isTab || s.isTab) ||
          staves[staves.length - 1];
        break;
      }
    }

    const tabY = tabStaff?.visualBounds?.y ?? vb.y;
    const tabH = tabStaff?.visualBounds?.h ?? vb.h;
    const numStrings =
      api.score?.tracks?.[0]?.staves?.[0]?.stringTuning?.tunings?.length || 6;
    const stringGap = tabH / Math.max(numStrings - 1, 1);

    return { vb, tabY, tabH, stringGap };
  }

  getCursorBoxForBeat(beat, api) {
    const layout = this.getTabStaffInfo(beat, api);
    if (!layout) return null;

    const { vb, tabY, stringGap } = layout;
    const selectedString = this.activeNote?.string ?? this.activeString;
    const clampedString = Math.min(Math.max(selectedString, 1), this.stringCount);
    const stringY = tabY + (clampedString - 1) * stringGap;

    return {
      x: vb.x - 2,
      y: stringY - 9,
      w: Math.max(vb.w + 4, 18),
      h: 18,
    };
  }

  updateCursorBox() {
    const api = this.#engine.api;
    const beat = this.currentActiveBeat;
    if (!api || !beat || !api.boundsLookup) {
      this.cursorBox = null;
      this.selectionBoxes = [];
      return;
    }

    try {
      this.cursorBox = this.getCursorBoxForBeat(beat, api);
      this.selectionBoxes = [];
    } catch {
      this.cursorBox = null;
      this.selectionBoxes = [];
    }
  }

  selectBeat(beat) {
    if (!beat) return;
    this.activeBeat = beat;
    this.activeNote = this.beatNotes[0] || null;
    if (this.#engine.api) {
      this.#engine.api.activeBeats = [];
    }
    this.updateCursorBox();
  }

  selectNote(note) {
    if (!note) return;
    this.activeNote = note;
    this.updateCursorBox();
  }

  moveBeat(delta) {
    const beat = this.currentActiveBeat;
    if (!beat || !beat.voice || !beat.voice.bar) return;

    const currentStaff = beat.voice.bar.staff;
    if (!currentStaff) return;

    const beats = [];
    for (const bar of currentStaff.bars || []) {
      for (const voice of bar.voices || []) {
        for (const nextBeat of voice.beats || []) {
          beats.push(nextBeat);
        }
      }
    }

    const idx = beats.indexOf(beat);
    const nextBeat = beats[idx + delta];
    if (!nextBeat) return;

    this.selectBeat(nextBeat);
  }

  moveNote(delta) {
    const beat = this.currentActiveBeat;
    if (!beat) return;

    const notes = this.beatNotes;
    if (!notes.length) {
      this.activeNote = null;
      this.updateCursorBox();
      return;
    }

    const currentIndex = notes.indexOf(this.activeNote);
    let nextIndex = currentIndex;
    if (nextIndex === -1) {
      nextIndex = delta > 0 ? 0 : notes.length - 1;
    } else {
      nextIndex = Math.min(Math.max(currentIndex + delta, 0), notes.length - 1);
    }

    this.activeNote = notes[nextIndex] || null;
    this.updateCursorBox();
  }

  setString(stringNumber) {
    const target = Number(stringNumber);
    if (!Number.isInteger(target)) return;

    const clamped = Math.min(Math.max(target, 1), this.stringCount);
    if (clamped === this.activeString) return;

    this.activeString = clamped;
    if (this.activeNote && this.currentActiveBeat?.notes?.includes(this.activeNote)) {
      this.activeNote.string = clamped;
    }

    this.#engine.api.score?.finish();
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();
    this.updateCursorBox();
  }

  moveString(delta) {
    this.setString(this.activeString + delta);
  }

  addNote() {
    const beat = this.currentActiveBeat;
    if (!beat) return;

    this.#project.history.snapshot();

    const existingNotes = beat.notes || [];
    const usedStrings = new Set(existingNotes.map((note) => note.string));

    let targetString = this.activeString;
    let attempts = 0;
    while (usedStrings.has(targetString) && attempts < this.stringCount) {
      targetString = targetString < this.stringCount ? targetString + 1 : 1;
      attempts += 1;
    }

    const existing = existingNotes.find((note) => note.string === targetString);
    if (existing) {
      this.activeString = targetString;
      this.activeNote = existing;
      this.#engine.api.score?.finish();
      this.#project.hasUnsavedChanges = true;
      this.#engine.requestUpdate();
      return;
    }

    const note = new alphaTab.model.Note();
    note.string = targetString;
    note.fret = this.activeNote?.fret ?? 0;
    beat.addNote(note);
    this.activeString = targetString;
    this.activeNote = note;

    this.#engine.api.score?.finish();
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();
  }

  deleteNote() {
    const beat = this.currentActiveBeat;
    if (!beat || !this.activeNote) return;

    this.#project.history.snapshot();
    beat.removeNote(this.activeNote);
    this.activeNote = this.beatNotes[0] || null;

    this.#engine.api.score?.finish();
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();
  }

  changeFret(delta) {
    if (!this.currentActiveBeat) return;

    if (!this.activeNote) {
      this.addNote();
      if (!this.activeNote) return;
    }

    const nextFret = Math.max(0, (this.activeNote.fret ?? 0) + delta);
    this.#project.history.snapshot();
    this.activeNote.fret = nextFret;
    this.#engine.api.score?.finish();
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();
    this.updateCursorBox();
  }

  addBeat() {
    const beat = this.currentActiveBeat;
    if (!beat || !beat.voice) return;

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

    this.#engine.api.score?.finish();
    this.#project.hasUnsavedChanges = true;
    this.selectBeat(newBeat);
    this.#engine.requestUpdate();
  }

  addBar() {
    const beat = this.currentActiveBeat;
    if (!beat || !beat.voice || !beat.voice.bar) return;

    this.#project.history.snapshot();
    const currentBar = beat.voice.bar;
    const currentStaff = currentBar.staff;
    if (!currentStaff || !this.score) return;

    const masterBar = new alphaTab.model.MasterBar();
    const prevMasterBar = currentBar.masterBar;
    if (prevMasterBar) {
      masterBar.timeSignatureNumerator = prevMasterBar.timeSignatureNumerator;
      masterBar.timeSignatureDenominator = prevMasterBar.timeSignatureDenominator;
    }
    this.score.addMasterBar(masterBar);

    const newBar = new alphaTab.model.Bar();
    currentStaff.addBar(newBar);

    const newVoice = new alphaTab.model.Voice();
    newBar.addVoice(newVoice);

    const newBeat = new alphaTab.model.Beat();
    newBeat.duration = alphaTab.model.Duration.Quarter;
    newVoice.addBeat(newBeat);

    this.score.finish();
    this.#project.hasUnsavedChanges = true;
    this.selectBeat(newBeat);
    this.#engine.requestUpdate();
  }

  copy() {
    const beat = this.currentActiveBeat;
    if (!beat) return;

    this.clipboard = {
      duration: beat.duration,
      notes: (beat.notes || []).map((note) => ({
        string: note.string,
        fret: note.fret,
      })),
    };
  }

  paste() {
    if (!this.clipboard || !this.currentActiveBeat?.voice) return;
    const beat = this.currentActiveBeat;
    const voice = beat.voice;

    this.#project.history.snapshot();
    const newBeat = new alphaTab.model.Beat();
    newBeat.duration = this.clipboard.duration;
    newBeat.voice = voice;

    for (const noteData of this.clipboard.notes) {
      const note = new alphaTab.model.Note();
      note.string = noteData.string;
      note.fret = noteData.fret;
      newBeat.addNote(note);
    }

    const insertIdx = voice.beats.indexOf(beat);
    if (insertIdx !== -1) {
      voice.beats.splice(insertIdx + 1, 0, newBeat);
    } else {
      voice.addBeat(newBeat);
    }

    this.score?.finish();
    this.#project.hasUnsavedChanges = true;
    this.selectBeat(newBeat);
    this.#engine.requestUpdate();
  }

  cut() {
    this.copy();
    this.deleteNote();
  }
}
