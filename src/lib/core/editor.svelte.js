import * as alphaTab from "@coderline/alphatab";

export class Editor {
  #engine;
  #project;

  activeBeat = $state(null);
  activeString = $state(1); // 1 = High E (top string of TAB), 6 = Low E (bottom string of TAB)
  selectionAnchor = $state(null); // Beat where selection started
  isSelectMode = $state(false); // Mobile toggle for range selection
  cursorBox = $state(null);
  selectionBoxes = $state([]);
  clipboard = $state(null); // Copied beat data for Copy/Paste

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
        this.activeBeat = fb;
        api.activeBeats = [fb];
      }
      this.updateCursorBox();
    });

    api.postRenderFinished.on(() => {
      this.updateCursorBox();
    });
  }

  /** Gets all beats in the current selection range */
  get selectedBeats() {
    if (!this.selectionAnchor || !this.activeBeat) {
      return this.activeBeat ? [this.activeBeat] : [];
    }

    const currentStaff = this.activeBeat.voice?.bar?.staff;
    if (!currentStaff) return [this.activeBeat];

    const allBeats = [];
    for (const bar of currentStaff.bars || []) {
      for (const voice of bar.voices || []) {
        for (const b of voice.beats || []) {
          allBeats.push(b);
        }
      }
    }

    const idxA = allBeats.indexOf(this.selectionAnchor);
    const idxB = allBeats.indexOf(this.activeBeat);
    if (idxA === -1 || idxB === -1) return [this.activeBeat];

    const start = Math.min(idxA, idxB);
    const end = Math.max(idxA, idxB);
    return allBeats.slice(start, end + 1);
  }

  updateCursorBox() {
    const api = this.#engine.api;
    const beat = this.activeBeat;
    if (!api || !beat || !api.boundsLookup) {
      this.cursorBox = null;
      this.selectionBoxes = [];
      return;
    }

    try {
      // 1. Get beat bounds directly via AlphaTab's built-in findBeat
      const bb = api.boundsLookup.findBeat?.(beat);
      if (!bb || !bb.visualBounds) {
        this.cursorBox = null;
        this.selectionBoxes = [];
        return;
      }

      const vb = bb.visualBounds;
      const currentTrack = api.score?.tracks?.[0];
      const numStrings =
        currentTrack?.staves?.[0]?.stringTuning?.tunings?.length || 6;

      // 2. Find the staffGroup containing this beat by checking Y bounds
      const staffGroups = api.boundsLookup.staffGroups || [];
      let tabStaff = null;

      for (const sg of staffGroups) {
        if (
          sg.visualBounds &&
          vb.y >= sg.visualBounds.y - 20 &&
          vb.y <= sg.visualBounds.y + sg.visualBounds.h + 20
        ) {
          const staves = sg.staves || [];
          tabStaff =
            staves.find((s) => s.stave?.isTab || s.isTab) ||
            staves[staves.length - 1];
          break;
        }
      }

      // 3. Extract TAB staff Y and height
      let tabY = vb.y;
      let tabH = vb.h;

      if (tabStaff && tabStaff.visualBounds) {
        tabY = tabStaff.visualBounds.y;
        tabH = tabStaff.visualBounds.h;
      }

      // 4. Calculate exact Y position for activeString on TAB staff
      // String 1 (High E) = top line of TAB (tabY)
      // String 6 (Low E)  = bottom line of TAB (tabY + tabH)
      const stringGap = tabH / Math.max(numStrings - 1, 1);
      const stringY = tabY + (this.activeString - 1) * stringGap;

      this.cursorBox = {
        x: vb.x - 2,
        y: stringY - 9,
        w: Math.max(vb.w + 4, 18),
        h: 18,
      };

      // 5. Calculate selection boxes if multiple beats selected
      const selBeats = this.selectedBeats;
      if (selBeats.length > 1) {
        const boxes = [];
        for (const sBeat of selBeats) {
          const sBb = api.boundsLookup.findBeat?.(sBeat);
          if (sBb && sBb.visualBounds) {
            const sVb = sBb.visualBounds;
            let sTabY = sVb.y;
            let sTabH = sVb.h;

            for (const sg of staffGroups) {
              if (
                sg.visualBounds &&
                sVb.y >= sg.visualBounds.y - 20 &&
                sVb.y <= sg.visualBounds.y + sg.visualBounds.h + 20
              ) {
                const staves = sg.staves || [];
                const sTab =
                  staves.find((s) => s.stave?.isTab || s.isTab) ||
                  staves[staves.length - 1];
                if (sTab && sTab.visualBounds) {
                  sTabY = sTab.visualBounds.y;
                  sTabH = sTab.visualBounds.h;
                }
                break;
              }
            }

            boxes.push({
              x: sVb.x - 2,
              y: sTabY - 4,
              w: Math.max(sVb.w + 4, 18),
              h: sTabH + 8,
            });
          }
        }
        this.selectionBoxes = boxes;
      } else {
        this.selectionBoxes = [];
      }
    } catch {
      this.cursorBox = null;
      this.selectionBoxes = [];
    }
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
      this.#engine.api.activeBeats = [fb];
      this.activeBeat = fb;
    }
    return this.activeBeat;
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

  // --- NAVIGATION & SELECTION MODE ---

  toggleSelectMode() {
    this.isSelectMode = !this.isSelectMode;
    if (this.isSelectMode) {
      if (!this.selectionAnchor) {
        this.selectionAnchor = this.currentActiveBeat;
      }
    } else {
      this.selectionAnchor = null;
    }
    this.updateCursorBox();
  }

  moveString(delta) {
    const currentTrack = this.#engine.api?.tracks?.[0];
    const maxStrings =
      currentTrack?.staves?.[0]?.stringTuning?.tunings?.length || 6;
    const newStr = this.activeString + delta;
    if (newStr >= 1 && newStr <= maxStrings) {
      this.activeString = newStr;
      this.updateCursorBox();
    }
  }

  moveBeat(delta, isShiftPressed = false) {
    const beat = this.currentActiveBeat;
    if (!beat || !beat.voice || !beat.voice.bar) return;

    const currentStaff = beat.voice.bar.staff;
    if (!currentStaff) return;

    const allBeats = [];
    for (const bar of currentStaff.bars || []) {
      for (const voice of bar.voices || []) {
        for (const b of voice.beats || []) {
          allBeats.push(b);
        }
      }
    }

    const idx = allBeats.indexOf(beat);
    if (idx !== -1) {
      const nextBeat = allBeats[idx + delta];
      if (nextBeat) {
        const shouldSelect = isShiftPressed || this.isSelectMode;
        if (shouldSelect) {
          if (!this.selectionAnchor) {
            this.selectionAnchor = beat;
          }
        } else {
          this.selectionAnchor = null;
        }

        this.activeBeat = nextBeat;
        if (this.#engine.api) {
          this.#engine.api.activeBeats = [nextBeat];
        }
        this.updateCursorBox();
      }
    }
  }

  clearSelection() {
    this.selectionAnchor = null;
    this.isSelectMode = false;
    this.updateCursorBox();
  }

  // --- MODEL MUTATIONS ---

  setFretDigit(digit) {
    const beat = this.currentActiveBeat;
    if (!beat) return;

    this.#project.history.snapshot();

    let note = beat.notes?.find((n) => n.string === this.activeString);
    if (!note) {
      note = new alphaTab.model.Note();
      note.string = this.activeString;
      note.fret = digit;
      beat.addNote(note);
    } else {
      const now = Date.now();
      if (
        this._lastInputTime &&
        now - this._lastInputTime < 1000 &&
        note.fret < 10
      ) {
        const combined = note.fret * 10 + digit;
        note.fret = Math.min(combined, 30);
      } else {
        note.fret = digit;
      }
      this._lastInputTime = now;
    }

    this.#engine.api.score?.finish();
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();

    try {
      this.#engine.api?.playNote?.(note);
    } catch {}
  }

  deleteNote() {
    const sBeats = this.selectedBeats;
    if (!sBeats.length) return;

    this.#project.history.snapshot();

    for (const beat of sBeats) {
      const note = beat.notes?.find((n) => n.string === this.activeString);
      if (note) {
        beat.removeNote(note);
      }
    }

    this.#engine.api.score?.finish();
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();
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
    this.selectionAnchor = null;
    this.activeBeat = newBeat;
    if (this.#engine.api) {
      this.#engine.api.activeBeats = [newBeat];
    }
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
    this.selectionAnchor = null;
    this.activeBeat = newBeat;
    if (this.#engine.api) {
      this.#engine.api.activeBeats = [newBeat];
    }
    this.#engine.requestUpdate();
  }

  // --- COPY / PASTE / CUT ---

  copy() {
    const sBeats = this.selectedBeats;
    if (!sBeats.length) return;

    this.clipboard = sBeats.map((b) => ({
      duration: b.duration,
      notes: (b.notes || []).map((n) => ({
        string: n.string,
        fret: n.fret,
      })),
    }));
  }

  paste() {
    if (!this.clipboard || !this.clipboard.length) return;
    const beat = this.currentActiveBeat;
    if (!beat || !beat.voice) return;

    this.#project.history.snapshot();
    const voice = beat.voice;
    let insertIdx = voice.beats.indexOf(beat);

    for (const item of this.clipboard) {
      const newBeat = new alphaTab.model.Beat();
      newBeat.duration = item.duration;
      newBeat.voice = voice;

      for (const nData of item.notes) {
        const note = new alphaTab.model.Note();
        note.string = nData.string;
        note.fret = nData.fret;
        newBeat.addNote(note);
      }

      if (insertIdx !== -1) {
        voice.beats.splice(insertIdx + 1, 0, newBeat);
        insertIdx++;
      } else {
        voice.addBeat(newBeat);
      }
      this.activeBeat = newBeat;
    }

    this.selectionAnchor = null;
    this.score?.finish();
    this.#project.hasUnsavedChanges = true;
    if (this.#engine.api) {
      this.#engine.api.activeBeats = [this.activeBeat];
    }
    this.#engine.requestUpdate();
  }

  cut() {
    this.copy();
    this.deleteNote();
  }
}
