import * as alphaTab from "@coderline/alphatab";
import { getState, setState } from "../../store.js";
import { execute, peekTop, reExecuteTop } from "../historyRouter.js";
import { ScoreMutator, resolveNote } from "../scoreMutator.js";
import { resolveBeat, resolveVoice, activeRange, collectRangeBeats } from "../selection.js";

// ── Duration ──────────────────────────────────────────────────────────────────────────────────────
export const DURATION_LADDER = [
  alphaTab.model.Duration.Whole,
  alphaTab.model.Duration.Half,
  alphaTab.model.Duration.Quarter,
  alphaTab.model.Duration.Eighth,
  alphaTab.model.Duration.Sixteenth,
  alphaTab.model.Duration.ThirtySecond,
];

export class ChangeDurationCommand {
  constructor(at, newDuration, newDots) {
    this.relayout = "voice";
    this.at = at; this.newDuration = newDuration; this.newDots = newDots;
    this._priorDuration = null; this._priorDots = null;
  }
  apply(score) {
    const beat = resolveBeat(score, this.at);
    if (!beat) return;
    if (this._priorDuration === null) { this._priorDuration = beat.duration; this._priorDots = beat.dots; }
    new ScoreMutator(score).changeDuration(this.at, this.newDuration, this.newDots);
  }
  undo(score) {
    if (this._priorDuration === null) return;
    new ScoreMutator(score).changeDuration(this.at, this._priorDuration, this._priorDots);
  }
  describe() { return `Duration ${this.newDuration}`; }
}

export function stepSelectedDuration(dir) {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const beat = resolveBeat(api.score, selection);
  if (!beat) return;
  const i = DURATION_LADDER.indexOf(beat.duration);
  const base = i === -1 ? DURATION_LADDER.indexOf(alphaTab.model.Duration.Quarter) : i;
  const next = base - dir;
  if (next < 0 || next >= DURATION_LADDER.length) return;
  if (DURATION_LADDER[next] === beat.duration) return;
  execute(new ChangeDurationCommand(selection, DURATION_LADDER[next], beat.dots));
}

export function setSelectedDuration(duration) {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const beat = resolveBeat(api.score, selection);
  if (!beat || beat.duration === duration) return;
  execute(new ChangeDurationCommand(selection, duration, beat.dots));
}

export function toggleSelectedDot() {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const beat = resolveBeat(api.score, selection);
  if (!beat) return;
  execute(new ChangeDurationCommand(selection, beat.duration, beat.dots ? 0 : 1));
}

// ── Fret / Note ───────────────────────────────────────────────────────────────────────────────────
export const MAX_FRET = 24;

export class AddNoteCommand {
  constructor(at, stringIndex, fret) {
    this.at = at; this.stringIndex = stringIndex; this.fret = fret;
    this._note = null;
  }
  get currentFret() { return this.fret; }
  setFret(f) { this.fret = f; }
  apply(score) {
    const m = new ScoreMutator(score);
    if (this._note) { m.restoreNote(this.at, this._note); this._note.fret = this.fret; }
    else { this._note = m.addNote(this.at, this.stringIndex, this.fret); }
  }
  undo(score) {
    if (this._note) new ScoreMutator(score).removeNote(this.at, this._note);
  }
  describe() { return `Add note fret ${this.fret}`; }
}

export class ChangeFretCommand {
  constructor(at, stringIndex, fret) {
    this.at = at; this.stringIndex = stringIndex; this.newFret = fret;
    this._prior = null;
  }
  get currentFret() { return this.newFret; }
  setFret(f) { this.newFret = f; }
  apply(score) {
    const note = resolveNote(score, this.at, this.stringIndex);
    if (!note) return;
    if (this._prior === null) this._prior = note.fret;
    new ScoreMutator(score).changeFret(this.at, this.stringIndex, this.newFret);
  }
  undo(score) {
    if (this._prior == null) return;
    new ScoreMutator(score).changeFret(this.at, this.stringIndex, this._prior);
  }
  describe() { return `Fret ${this.newFret}`; }
}

const WINDOW_MS = 500;
let _pendingAmend = null;

export function resetFretAmend() { _pendingAmend = null; }

function sameAmendTarget(p, at, str) {
  return p.stringIndex === str && p.at.trackIndex === at.trackIndex &&
    p.at.staffIndex === at.staffIndex && p.at.voiceIndex === at.voiceIndex &&
    p.at.barIndex === at.barIndex && p.at.beatIndex === at.beatIndex;
}

export function changeSelectedFret(digit) {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  const now = performance.now();
  if (_pendingAmend && sameAmendTarget(_pendingAmend, selection, selectedString) &&
    now - _pendingAmend.t < WINDOW_MS && peekTop() === _pendingAmend.cmd) {
    const combined = Math.min(MAX_FRET, _pendingAmend.cmd.currentFret * 10 + digit);
    _pendingAmend.cmd.setFret(combined);
    reExecuteTop();
    _pendingAmend.t = now;
    return;
  }
  const cmd = note
    ? new ChangeFretCommand(selection, selectedString, Math.min(MAX_FRET, digit))
    : new AddNoteCommand(selection, selectedString, Math.min(MAX_FRET, digit));
  execute(cmd);
  _pendingAmend = { cmd, at: selection, stringIndex: selectedString, t: now };
}

export function setSelectedFret(fret) {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const clamped = Math.max(0, Math.min(MAX_FRET, Math.round(fret)));
  const note = resolveNote(api.score, selection, selectedString);
  resetFretAmend();
  const cmd = note
    ? new ChangeFretCommand(selection, selectedString, clamped)
    : new AddNoteCommand(selection, selectedString, clamped);
  execute(cmd);
}

// ── Delete note / rest ────────────────────────────────────────────────────────────────────────────
export class DeleteNoteCommand {
  constructor(at, stringIndex) {
    this.at = at; this.stringIndex = stringIndex; this._note = null;
  }
  apply(score) {
    const note = resolveNote(score, this.at, this.stringIndex);
    if (!note) return;
    this._note = note;
    new ScoreMutator(score).removeNote(this.at, note);
  }
  undo(score) {
    if (this._note) new ScoreMutator(score).restoreNote(this.at, this._note);
  }
  describe() { return "Delete note"; }
}

export class BeatToRestCommand {
  constructor(at) { this.at = at; this._removed = null; }
  apply(score) { this._removed = new ScoreMutator(score).clearBeat(this.at); }
  undo(score) {
    if (!this._removed) return;
    const m = new ScoreMutator(score);
    for (const n of this._removed) m.restoreNote(this.at, n);
  }
  describe() { return "Clear beat"; }
}

export function deleteSelectedNote() {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note) return;
  execute(new DeleteNoteCommand(selection, selectedString));
}

// ── Insert / delete beat ──────────────────────────────────────────────────────────────────────────
export class InsertBeatCommand {
  constructor(at) {
    this.relayout = "voice";
    this.at = at; this._inserted = null;
  }
  apply(score) {
    const m = new ScoreMutator(score);
    if (this._inserted) { m.reinsertBeat(this.at, this.at.beatIndex + 1, this._inserted); }
    else { this._inserted = m.insertBeatAfter(this.at); }
  }
  undo(score) {
    if (this._inserted) new ScoreMutator(score).removeBeat({ ...this.at, beatIndex: this.at.beatIndex + 1 });
  }
  describe() { return "Insert beat"; }
}

export class DeleteBeatCommand {
  constructor(at) {
    this.relayout = "voice";
    this.at = at; this._beat = null; this._index = at.beatIndex;
  }
  apply(score) {
    const voice = resolveVoice(score, this.at);
    if (!voice || voice.beats.length <= 1) return;
    this._beat = new ScoreMutator(score).removeBeat(this.at);
  }
  undo(score) {
    if (this._beat) new ScoreMutator(score).reinsertBeat(this.at, this._index, this._beat);
  }
  describe() { return "Delete beat"; }
}

export function insertBeatAfterSelection() {
  const { selection } = getState();
  if (!selection) return;
  execute(new InsertBeatCommand(selection));
}

export function deleteSelectedBeat() {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const voice = resolveVoice(api.score, selection);
  if (!voice || voice.beats.length <= 1) return;
  execute(new DeleteBeatCommand(selection));
}

// ── Change string (move note) ─────────────────────────────────────────────────────────────────────
export class ChangeStringCommand {
  constructor(at, fromString, toString) {
    this.at = at; this.fromString = fromString; this.toString = toString;
  }
  apply(score) { new ScoreMutator(score).changeString(this.at, this.fromString, this.toString); }
  undo(score) { new ScoreMutator(score).changeString(this.at, this.toString, this.fromString); }
  describe() { return `Move note string ${this.fromString}→${this.toString}`; }
}

// ── Note effects (generic) ────────────────────────────────────────────────────────────────────────
export class SetNoteEffectCommand {
  constructor(at, stringIndex, key, value, opts = {}) {
    this.at = at; this.stringIndex = stringIndex; this.key = key; this.value = value;
    this.relayout = opts.relayout ?? "none";
    this._prior = null; this._captured = false;
  }
  apply(score) {
    const note = resolveNote(score, this.at, this.stringIndex);
    if (!note) return;
    if (!this._captured) { this._prior = note[this.key]; this._captured = true; }
    new ScoreMutator(score).setNoteField(this.at, this.stringIndex, this.key, this.value);
  }
  undo(score) {
    if (!this._captured) return;
    new ScoreMutator(score).setNoteField(this.at, this.stringIndex, this.key, this._prior);
  }
  describe() { return `Set ${this.key}`; }
}

export class SetBeatEffectCommand {
  constructor(at, key, value, opts = {}) {
    this.at = at; this.key = key; this.value = value;
    this.relayout = opts.relayout ?? "none";
    this._prior = null; this._captured = false;
  }
  apply(score) {
    const beat = resolveBeat(score, this.at);
    if (!beat) return;
    if (!this._captured) { this._prior = beat[this.key]; this._captured = true; }
    new ScoreMutator(score).setBeatField(this.at, this.key, this.value);
  }
  undo(score) {
    if (!this._captured) return;
    new ScoreMutator(score).setBeatField(this.at, this.key, this._prior);
  }
  describe() { return `Set ${this.key}`; }
}

// ── Articulation ──────────────────────────────────────────────────────────────────────────────────
function toggleNoteFlag(key) {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note) return;
  execute(new SetNoteEffectCommand(selection, selectedString, key, !note[key], { relayout: "voice" }));
}

export function toggleSelectedPalmMute() { toggleNoteFlag("isPalmMute"); }
export function toggleSelectedGhost() { toggleNoteFlag("isGhost"); }
export function toggleSelectedDead() { toggleNoteFlag("isDead"); }
export function toggleSelectedLetRing() { toggleNoteFlag("isLetRing"); }
export function toggleSelectedHammerPull() { toggleNoteFlag("isHammerPullOrigin"); }

export const VIBRATO_CYCLE = [
  alphaTab.model.VibratoType.None,
  alphaTab.model.VibratoType.Slight,
  alphaTab.model.VibratoType.Wide,
];
export const VIBRATO_LABELS = { 1: "Slight", 2: "Wide" };

export function cycleSelectedVibrato() {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note) return;
  const i = VIBRATO_CYCLE.indexOf(note.vibrato);
  const next = VIBRATO_CYCLE[(i + 1) % VIBRATO_CYCLE.length];
  execute(new SetNoteEffectCommand(selection, selectedString, "vibrato", next, { relayout: "voice" }));
}

// ── Dynamics ──────────────────────────────────────────────────────────────────────────────────────
export const DYNAMICS_LADDER = [
  alphaTab.model.DynamicValue.PPP, alphaTab.model.DynamicValue.PP,
  alphaTab.model.DynamicValue.P, alphaTab.model.DynamicValue.MP,
  alphaTab.model.DynamicValue.MF, alphaTab.model.DynamicValue.F,
  alphaTab.model.DynamicValue.FF, alphaTab.model.DynamicValue.FFF,
];
export const DYNAMICS_LABELS = ["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff"];

export function setSelectedDynamics(value) {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  execute(new SetBeatEffectCommand(selection, "dynamics", value, { relayout: "voice" }));
}

export function stepSelectedDynamics(dir) {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const beat = resolveBeat(api.score, selection);
  if (!beat) return;
  const i = DYNAMICS_LADDER.indexOf(beat.dynamics);
  const base = i === -1 ? DYNAMICS_LADDER.indexOf(alphaTab.model.DynamicValue.MF) : i;
  const next = base + dir;
  if (next < 0 || next >= DYNAMICS_LADDER.length) return;
  execute(new SetBeatEffectCommand(selection, "dynamics", DYNAMICS_LADDER[next], { relayout: "voice" }));
}

// ── Tie ───────────────────────────────────────────────────────────────────────────────────────────
export class TieCommand {
  constructor(at, stringIndex) {
    this.relayout = "voice";
    this.at = at; this.stringIndex = stringIndex;
    this._captured = false; this._priorTie = false; this._priorFret = 0;
    this._priorOctave = 0; this._priorTone = 0;
  }
  apply(score) {
    const note = resolveNote(score, this.at, this.stringIndex);
    if (!note) return;
    if (!this._captured) {
      this._priorTie = note.isTieDestination; this._priorFret = note.fret;
      this._priorOctave = note.octave ?? 0; this._priorTone = note.tone ?? 0;
      this._captured = true;
    }
    note.isTieDestination = true;
  }
  undo(score) {
    if (!this._captured) return;
    const note = resolveNote(score, this.at, this.stringIndex);
    if (!note) return;
    const origin = note.tieOrigin;
    note.isTieDestination = this._priorTie;
    note.tieOrigin = null;
    note.fret = this._priorFret;
    note.octave = this._priorOctave;
    note.tone = this._priorTone;
    if (origin) origin.tieDestination = null;
  }
  describe() { return "Tie note"; }
}

export function tieSelectedNote() {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note || note.isTieDestination) return;
  execute(new TieCommand(selection, selectedString));
}

// ── Slide ─────────────────────────────────────────────────────────────────────────────────────────
export const SLIDE_OUT_OPTIONS = [
  { label: "None", value: alphaTab.model.SlideOutType.None },
  { label: "Shift", value: alphaTab.model.SlideOutType.Shift },
  { label: "Legato", value: alphaTab.model.SlideOutType.Legato },
  { label: "Out ↗", value: alphaTab.model.SlideOutType.OutUp },
  { label: "Out ↘", value: alphaTab.model.SlideOutType.OutDown },
  { label: "Pick ↘", value: alphaTab.model.SlideOutType.PickSlideDown },
  { label: "Pick ↗", value: alphaTab.model.SlideOutType.PickSlideUp },
];
export const SLIDE_IN_OPTIONS = [
  { label: "None", value: alphaTab.model.SlideInType.None },
  { label: "In ↗ from below", value: alphaTab.model.SlideInType.IntoFromBelow },
  { label: "In ↘ from above", value: alphaTab.model.SlideInType.IntoFromAbove },
];

export function setSelectedSlideOut(value) {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note || note.slideOutType === value) return;
  execute(new SetNoteEffectCommand(selection, selectedString, "slideOutType", value, { relayout: "voice" }));
}

export function setSelectedSlideIn(value) {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note || note.slideInType === value) return;
  execute(new SetNoteEffectCommand(selection, selectedString, "slideInType", value, { relayout: "voice" }));
}

// ── Bend ──────────────────────────────────────────────────────────────────────────────────────────
export class SetBendCommand {
  constructor(at, stringIndex, bendType, points, label = "Bend") {
    this.relayout = "voice";
    this.at = at; this.stringIndex = stringIndex; this.bendType = bendType;
    this.points = points; this.label = label;
    this._captured = false; this._priorType = alphaTab.model.BendType.None; this._priorPoints = null;
  }
  apply(score) {
    const note = resolveNote(score, this.at, this.stringIndex);
    if (!note) return;
    if (!this._captured) {
      this._priorType = note.bendType;
      this._priorPoints = note.bendPoints ? note.bendPoints.map(p => [p.offset, p.value]) : null;
      this._captured = true;
    }
    new ScoreMutator(score).applyBend(this.at, this.stringIndex, this.bendType, this.points);
  }
  undo(score) {
    if (!this._captured) return;
    new ScoreMutator(score).applyBend(this.at, this.stringIndex, this._priorType, this._priorPoints);
  }
  describe() { return this.label; }
}

export const BEND_PRESETS = [
  { id: "bend", label: "Bend", bendType: alphaTab.model.BendType.Bend, points: [[0,0],[60,4]] },
  { id: "bend-release", label: "Bend–Release", bendType: alphaTab.model.BendType.BendRelease, points: [[0,0],[30,4],[60,0]] },
  { id: "prebend", label: "Pre-bend", bendType: alphaTab.model.BendType.Prebend, points: [[0,4],[60,4]] },
  { id: "prebend-release", label: "Pre-bend Release", bendType: alphaTab.model.BendType.PrebendRelease, points: [[0,4],[30,4],[60,0]] },
  { id: "vib-bend", label: "Vibrato Bend", bendType: alphaTab.model.BendType.Bend, points: [[0,0],[30,4],[40,3],[50,4],[60,3]] },
];

export function setSelectedBend(preset) {
  const { selection, selectedString } = getState();
  if (!selection) return;
  execute(new SetBendCommand(selection, selectedString, preset.bendType, preset.points, preset.label));
}

export function clearSelectedBend() {
  const { selection, selectedString } = getState();
  if (!selection) return;
  execute(new SetBendCommand(selection, selectedString, alphaTab.model.BendType.None, null, "Clear bend"));
}

// ── Whammy ────────────────────────────────────────────────────────────────────────────────────────
export class SetWhammyCommand {
  constructor(at, whammyType, points, label = "Whammy") {
    this.relayout = "voice";
    this.at = at; this.whammyType = whammyType; this.points = points; this.label = label;
    this._captured = false; this._priorType = alphaTab.model.WhammyType.None; this._priorPoints = null;
  }
  apply(score) {
    const beat = resolveBeat(score, this.at);
    if (!beat) return;
    if (!this._captured) {
      this._priorType = beat.whammyBarType;
      this._priorPoints = beat.whammyBarPoints ? beat.whammyBarPoints.map(p => [p.offset, p.value]) : null;
      this._captured = true;
    }
    new ScoreMutator(score).applyWhammy(this.at, this.whammyType, this.points);
  }
  undo(score) {
    if (!this._captured) return;
    new ScoreMutator(score).applyWhammy(this.at, this._priorType, this._priorPoints);
  }
  describe() { return this.label; }
}

export const WHAMMY_PRESETS = [
  { id: "dive", label: "Dive", whammyType: alphaTab.model.WhammyType.Dive, points: [[0,0],[60,-4]] },
  { id: "dip", label: "Dip", whammyType: alphaTab.model.WhammyType.Dip, points: [[0,0],[30,-4],[60,0]] },
  { id: "predive", label: "Pre-dive", whammyType: alphaTab.model.WhammyType.Predive, points: [[0,-4],[60,-4]] },
  { id: "predive-dive", label: "Pre-dive + Dive", whammyType: alphaTab.model.WhammyType.PrediveDive, points: [[0,-4],[30,-4],[60,-8]] },
];

export function setSelectedWhammy(preset) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetWhammyCommand(selection, preset.whammyType, preset.points, preset.label));
}

export function clearSelectedWhammy() {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetWhammyCommand(selection, alphaTab.model.WhammyType.None, null, "Clear whammy"));
}

// ── Tremolo ───────────────────────────────────────────────────────────────────────────────────────
export class SetTremoloCommand {
  constructor(at, speed) {
    this.relayout = "voice";
    this.at = at; this.speed = speed;
    this._captured = false; this._prior = undefined;
  }
  apply(score) {
    const beat = resolveBeat(score, this.at);
    if (!beat) return;
    if (!this._captured) { this._prior = beat.tremoloSpeed; this._captured = true; }
    beat.tremoloSpeed = this.speed;
  }
  undo(score) {
    if (!this._captured) return;
    const beat = resolveBeat(score, this.at);
    if (beat) beat.tremoloSpeed = this._prior;
  }
  describe() { return "Tremolo"; }
}

export const TREMOLO_PRESETS = [
  { id: "eighth", label: "1/8", speed: alphaTab.model.Duration.Eighth },
  { id: "sixteenth", label: "1/16", speed: alphaTab.model.Duration.Sixteenth },
  { id: "thirtysecond", label: "1/32", speed: alphaTab.model.Duration.ThirtySecond },
];

export function setSelectedTremolo(preset) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetTremoloCommand(selection, preset.speed));
}

export function clearSelectedTremolo() {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetTremoloCommand(selection, null));
}

// ── Tap ───────────────────────────────────────────────────────────────────────────────────────────
export function toggleSelectedTap() {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const beat = resolveBeat(api.score, selection);
  if (!beat) return;
  execute(new SetBeatEffectCommand(selection, "tap", !beat.tap, { relayout: "voice" }));
}

// ── Harmonics ─────────────────────────────────────────────────────────────────────────────────────
export const HARMONIC_OPTIONS = [
  { label: "None", value: alphaTab.model.HarmonicType.None },
  { label: "Natural", value: alphaTab.model.HarmonicType.Natural },
  { label: "Pinch", value: alphaTab.model.HarmonicType.Pinch },
  { label: "Tap", value: alphaTab.model.HarmonicType.Tap },
  { label: "Semi", value: alphaTab.model.HarmonicType.Semi },
];

export function setSelectedHarmonic(value) {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note || note.harmonicType === value) return;
  execute(new SetNoteEffectCommand(selection, selectedString, "harmonicType", value, { relayout: "voice" }));
}

// ── Grace ─────────────────────────────────────────────────────────────────────────────────────────
export class InsertGraceBeatCommand {
  constructor(at, stringIndex, graceType) {
    this.relayout = "voice";
    this.at = at; this.stringIndex = stringIndex; this.graceType = graceType;
    this._inserted = null;
  }
  apply(score) {
    const srcBeat = resolveBeat(score, this.at);
    if (!srcBeat) return;
    const voice = resolveVoice(score, this.at);
    if (!voice) return;
    if (this._inserted) {
      voice.beats.splice(this.at.beatIndex, 0, this._inserted);
      return;
    }
    const grace = new alphaTab.model.Beat();
    grace.voice = voice;
    grace.graceType = this.graceType;
    grace.duration = alphaTab.model.Duration.Sixteenth;
    const srcNote = srcBeat.getNoteOnString ? srcBeat.getNoteOnString(this.stringIndex) : (srcBeat.notes[0] ?? null);
    if (srcNote) {
      const gn = new alphaTab.model.Note();
      gn.string = srcNote.string; gn.fret = srcNote.fret;
      grace.addNote(gn);
    }
    voice.beats.splice(this.at.beatIndex, 0, grace);
    this._inserted = grace;
  }
  undo(score) {
    const voice = resolveVoice(score, this.at);
    if (!voice || !this._inserted) return;
    const idx = voice.beats.indexOf(this._inserted);
    if (idx >= 0) voice.beats.splice(idx, 1);
  }
  describe() { return "Insert grace beat"; }
}

export const GRACE_OPTIONS = [
  { label: "Before beat", value: alphaTab.model.GraceType.BeforeBeat },
  { label: "On beat", value: alphaTab.model.GraceType.OnBeat },
];

export function insertSelectedGrace(graceType) {
  const { selection, selectedString } = getState();
  if (!selection) return;
  execute(new InsertGraceBeatCommand(selection, selectedString, graceType));
}

// ── Score info ────────────────────────────────────────────────────────────────────────────────────
export class SetScoreInfoCommand {
  constructor(title, artist) {
    this.title = title; this.artist = artist;
    this._priorTitle = null; this._priorArtist = null;
  }
  apply(score) {
    if (this._priorTitle === null) { this._priorTitle = score.title; this._priorArtist = score.artist; }
    score.title = this.title; score.artist = this.artist;
  }
  undo(score) {
    if (this._priorTitle !== null) { score.title = this._priorTitle; score.artist = this._priorArtist; }
  }
  describe() { return "Set score info"; }
}

// ── Time signature ────────────────────────────────────────────────────────────────────────────────
export class SetTimeSignatureCommand {
  constructor(barIndex, num, denom) {
    this.relayout = "score";
    this.barIndex = barIndex; this.num = num; this.denom = denom;
    this._priorNum = null; this._priorDenom = null;
  }
  apply(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    if (this._priorNum === null) { this._priorNum = mb.timeSignatureNumerator; this._priorDenom = mb.timeSignatureDenominator; }
    mb.timeSignatureNumerator = this.num; mb.timeSignatureDenominator = this.denom;
  }
  undo(score) {
    const mb = score.masterBars[this.barIndex];
    if (mb && this._priorNum !== null) { mb.timeSignatureNumerator = this._priorNum; mb.timeSignatureDenominator = this._priorDenom; }
  }
  describe() { return `Time sig ${this.num}/${this.denom}`; }
}

export function setSelectedTimeSignature(num, denom) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetTimeSignatureCommand(selection.barIndex, num, denom));
}

// ── Key signature ─────────────────────────────────────────────────────────────────────────────────
export const KEY_SIGNATURE_OPTIONS = [
  { label: "C♭ (7♭)", value: alphaTab.model.KeySignature.Cb },
  { label: "G♭ (6♭)", value: alphaTab.model.KeySignature.Gb },
  { label: "D♭ (5♭)", value: alphaTab.model.KeySignature.Db },
  { label: "A♭ (4♭)", value: alphaTab.model.KeySignature.Ab },
  { label: "E♭ (3♭)", value: alphaTab.model.KeySignature.Eb },
  { label: "B♭ (2♭)", value: alphaTab.model.KeySignature.Bb },
  { label: "F (1♭)", value: alphaTab.model.KeySignature.F },
  { label: "C major", value: alphaTab.model.KeySignature.C },
  { label: "G (1♯)", value: alphaTab.model.KeySignature.G },
  { label: "D (2♯)", value: alphaTab.model.KeySignature.D },
  { label: "A (3♯)", value: alphaTab.model.KeySignature.A },
  { label: "E (4♯)", value: alphaTab.model.KeySignature.E },
  { label: "B (5♯)", value: alphaTab.model.KeySignature.B },
  { label: "F♯ (6♯)", value: alphaTab.model.KeySignature.FSharp },
  { label: "C♯ (7♯)", value: alphaTab.model.KeySignature.CSharp },
];

export class SetKeySignatureCommand {
  constructor(at, fifths) {
    this.at = at; this.fifths = fifths;
    this._prior = null;
  }
  apply(score) {
    const staff = score.tracks[this.at.trackIndex]?.staves[this.at.staffIndex];
    const bar = staff?.bars[this.at.barIndex];
    if (!bar) return;
    if (this._prior === null) { this._prior = bar.keySignature; }
    bar.keySignature = this.fifths;
  }
  undo(score) {
    if (this._prior === null) return;
    const staff = score.tracks[this.at.trackIndex]?.staves[this.at.staffIndex];
    const bar = staff?.bars[this.at.barIndex];
    if (bar) bar.keySignature = this._prior;
  }
  describe() { return "Key signature"; }
}

export function setSelectedKeySignature(fifths) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetKeySignatureCommand(selection, fifths));
}

// ── Tempo ─────────────────────────────────────────────────────────────────────────────────────────
export class SetTempoCommand {
  constructor(barIndex, value) {
    this.relayout = "score";
    this.barIndex = barIndex; this.value = value; this._prior = null;
  }
  apply(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    let auto = mb.tempoAutomations.find(a => a.type === alphaTab.model.AutomationType.Tempo && a.ratioPosition === 0);
    if (!auto) {
      auto = new alphaTab.model.Automation();
      auto.type = alphaTab.model.AutomationType.Tempo;
      auto.ratioPosition = 0;
      mb.tempoAutomations.push(auto);
    }
    if (this._prior === null) this._prior = auto.value;
    auto.value = this.value;
    if (mb.index === 0) score.tempo = this.value;
  }
  undo(score) {
    if (this._prior === null) return;
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    const auto = mb.tempoAutomations.find(a => a.type === alphaTab.model.AutomationType.Tempo && a.ratioPosition === 0);
    if (auto) { auto.value = this._prior; if (mb.index === 0) score.tempo = this._prior; }
  }
  describe() { return `Tempo ${this.value}`; }
}

export function setSelectedTempo(value) {
  const { selection } = getState();
  if (!selection) return;
  const v = Math.max(20, Math.min(400, Math.round(value)));
  execute(new SetTempoCommand(selection.barIndex, v));
}

// ── Insert / delete measure ───────────────────────────────────────────────────────────────────────
export class InsertMeasureCommand {
  constructor(afterBarIndex) {
    this.relayout = "score";
    this.afterBarIndex = afterBarIndex;
    this._inserted = null; this._insertedBars = null;
  }
  apply(score) {
    const refMb = score.masterBars[this.afterBarIndex];
    if (!refMb) return;
    if (this._inserted) {
      score.masterBars.splice(this.afterBarIndex + 1, 0, this._inserted);
      score.tracks.forEach((track, ti) => {
        track.staves.forEach((staff, si) => {
          staff.bars.splice(this.afterBarIndex + 1, 0, this._insertedBars[ti][si]);
        });
      });
      new ScoreMutator(score).relinkStructure();
      return;
    }
    const newMb = new alphaTab.model.MasterBar();
    newMb.timeSignatureNumerator = refMb.timeSignatureNumerator;
    newMb.timeSignatureDenominator = refMb.timeSignatureDenominator;
    score.masterBars.splice(this.afterBarIndex + 1, 0, newMb);
    this._inserted = newMb;
    this._insertedBars = score.tracks.map((track, ti) =>
      track.staves.map((staff, si) => {
        const newBar = new alphaTab.model.Bar();
        const voice = new alphaTab.model.Voice();
        const beat = new alphaTab.model.Beat();
        beat.voice = voice;
        beat.isEmpty = true;
        beat.duration = alphaTab.model.Duration.Quarter;
        voice.addBeat(beat);
        newBar.addVoice(voice);
        staff.bars.splice(this.afterBarIndex + 1, 0, newBar);
        return newBar;
      })
    );
    new ScoreMutator(score).relinkStructure();
  }
  undo(score) {
    if (!this._inserted) return;
    score.masterBars.splice(this.afterBarIndex + 1, 1);
    score.tracks.forEach(track => track.staves.forEach(staff => staff.bars.splice(this.afterBarIndex + 1, 1)));
    new ScoreMutator(score).relinkStructure();
  }
  describe() { return "Insert measure"; }
}

export class DeleteMeasureCommand {
  constructor(barIndex) {
    this.relayout = "score";
    this.barIndex = barIndex;
    this._removed = null; this._removedBars = null;
  }
  apply(score) {
    if (score.masterBars.length <= 1) return;
    this._removed = score.masterBars[this.barIndex];
    this._removedBars = score.tracks.map(track => track.staves.map(staff => staff.bars[this.barIndex]));
    score.masterBars.splice(this.barIndex, 1);
    score.tracks.forEach(track => track.staves.forEach(staff => staff.bars.splice(this.barIndex, 1)));
    new ScoreMutator(score).relinkStructure();
  }
  undo(score) {
    if (!this._removed) return;
    score.masterBars.splice(this.barIndex, 0, this._removed);
    score.tracks.forEach((track, ti) =>
      track.staves.forEach((staff, si) => staff.bars.splice(this.barIndex, 0, this._removedBars[ti][si]))
    );
    new ScoreMutator(score).relinkStructure();
  }
  describe() { return "Delete measure"; }
}

export function insertMeasureAfterSelection() {
  const { selection } = getState();
  if (!selection) return;
  execute(new InsertMeasureCommand(selection.barIndex));
}

export function deleteSelectedMeasure() {
  const { selection, api } = getState();
  if (!selection || !api?.score || api.score.masterBars.length <= 1) return;
  execute(new DeleteMeasureCommand(selection.barIndex));
}

// ── Repeat open ───────────────────────────────────────────────────────────────────────────────────
export class SetRepeatOpenCommand {
  constructor(barIndex, value) {
    this.relayout = "score"; this.barIndex = barIndex; this.value = value; this._prior = null;
  }
  apply(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    if (this._prior === null) this._prior = mb.isRepeatStart;
    mb.isRepeatStart = this.value;
  }
  undo(score) {
    const mb = score.masterBars[this.barIndex];
    if (mb && this._prior !== null) mb.isRepeatStart = this._prior;
  }
  describe() { return "Repeat open"; }
}

export function toggleRepeatOpen() {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const mb = api.score.masterBars[selection.barIndex];
  if (!mb) return;
  execute(new SetRepeatOpenCommand(selection.barIndex, !mb.isRepeatStart));
}

// ── Repeat close ──────────────────────────────────────────────────────────────────────────────────
export class SetRepeatCloseCommand {
  constructor(barIndex, count) {
    this.relayout = "score"; this.barIndex = barIndex; this.count = count; this._prior = null;
  }
  apply(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    if (this._prior === null) this._prior = mb.repeatCount;
    mb.repeatCount = this.count;
  }
  undo(score) {
    const mb = score.masterBars[this.barIndex];
    if (mb && this._prior !== null) mb.repeatCount = this._prior;
  }
  describe() { return "Repeat close"; }
}

export function setRepeatClose(count) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetRepeatCloseCommand(selection.barIndex, count));
}

// ── Volta (alternate endings) ──────────────────────────────────────────────────────────────────────
export class SetVoltaCommand {
  constructor(barIndex, endings) {
    this.relayout = "score"; this.barIndex = barIndex; this.endings = endings; this._prior = null;
  }
  apply(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    if (this._prior === null) this._prior = mb.alternateEndings;
    mb.alternateEndings = this.endings;
  }
  undo(score) {
    const mb = score.masterBars[this.barIndex];
    if (mb && this._prior !== null) mb.alternateEndings = this._prior;
  }
  describe() { return "Volta"; }
}

export function toggleVolta(endingNumber) {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const mb = api.score.masterBars[selection.barIndex];
  if (!mb) return;
  const bit = 1 << (endingNumber - 1);
  execute(new SetVoltaCommand(selection.barIndex, (mb.alternateEndings ?? 0) ^ bit));
}

// ── Section marker ────────────────────────────────────────────────────────────────────────────────
export class SetSectionCommand {
  constructor(barIndex, text, marker = "") {
    this.barIndex = barIndex; this.text = text; this.marker = marker;
    this._priorText = null; this._priorMarker = null; this._hadSection = null;
  }
  apply(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    if (this._hadSection === null) {
      this._hadSection = !!mb.section;
      this._priorText = mb.section?.text ?? "";
      this._priorMarker = mb.section?.marker ?? "";
    }
    if (this.text) {
      if (!mb.section) {
        try { mb.section = new alphaTab.model.Section(); }
        catch { mb.section = {}; }
      }
      mb.section.text = this.text;
      mb.section.marker = this.marker || this.text.slice(0, 3).toUpperCase();
    } else {
      mb.section = null;
    }
  }
  undo(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb || this._hadSection === null) return;
    if (this._hadSection) {
      if (!mb.section) { try { mb.section = new alphaTab.model.Section(); } catch { mb.section = {}; } }
      mb.section.text = this._priorText;
      mb.section.marker = this._priorMarker;
    } else {
      mb.section = null;
    }
  }
  describe() { return "Section"; }
}

export function setSection(text, marker = "") {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetSectionCommand(selection.barIndex, text, marker));
}

// ── Note accent ───────────────────────────────────────────────────────────────────────────────────
export const ACCENT_OPTIONS = [
  { label: "None",   value: alphaTab.model.AccentuationType?.None  ?? 0 },
  { label: "Accent", value: alphaTab.model.AccentuationType?.Normal ?? 1 },
  { label: "Heavy",  value: alphaTab.model.AccentuationType?.Heavy  ?? 2 },
];

export function cycleSelectedAccent() {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note) return;
  const cur = note.accentuated ?? 0;
  const next = (cur + 1) % 3;
  execute(new SetNoteEffectCommand(selection, selectedString, "accentuated", next, { relayout: "voice" }));
}

// ── Staccato ──────────────────────────────────────────────────────────────────────────────────────
export function toggleSelectedStaccato() {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note) return;
  execute(new SetNoteEffectCommand(selection, selectedString, "isStaccato", !note.isStaccato, { relayout: "voice" }));
}

// ── Slap / Pop ────────────────────────────────────────────────────────────────────────────────────
export function toggleSelectedSlap() {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const beat = resolveBeat(api.score, selection);
  if (!beat) return;
  execute(new SetBeatEffectCommand(selection, "slap", !beat.slap, { relayout: "voice" }));
}

export function toggleSelectedPop() {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const beat = resolveBeat(api.score, selection);
  if (!beat) return;
  execute(new SetBeatEffectCommand(selection, "pop", !beat.pop, { relayout: "voice" }));
}

// ── Rasgueado ─────────────────────────────────────────────────────────────────────────────────────
export function toggleSelectedRasgueado() {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const beat = resolveBeat(api.score, selection);
  if (!beat) return;
  execute(new SetBeatEffectCommand(selection, "hasRasgueado", !beat.hasRasgueado, { relayout: "voice" }));
}

// ── Beat text ─────────────────────────────────────────────────────────────────────────────────────
export class SetBeatTextCommand {
  constructor(at, text) {
    this.at = at; this.text = text; this._prior = null; this._captured = false;
  }
  apply(score) {
    const beat = resolveBeat(score, this.at);
    if (!beat) return;
    if (!this._captured) { this._prior = beat.text ?? ""; this._captured = true; }
    beat.text = this.text;
  }
  undo(score) {
    if (!this._captured) return;
    const beat = resolveBeat(score, this.at);
    if (beat) beat.text = this._prior;
  }
  describe() { return "Beat text"; }
}

export function setSelectedBeatText(text) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetBeatTextCommand(selection, text));
}

// ── Track management ──────────────────────────────────────────────────────────────────────────────
export const MIDI_PROGRAMS = [
  { label: "Acoustic Guitar (Nylon)", value: 24 },
  { label: "Acoustic Guitar (Steel)", value: 25 },
  { label: "Electric Guitar (Jazz)",  value: 26 },
  { label: "Electric Guitar (Clean)", value: 27 },
  { label: "Electric Guitar (Muted)", value: 28 },
  { label: "Overdriven Guitar",       value: 29 },
  { label: "Distortion Guitar",       value: 30 },
  { label: "Electric Bass (Finger)",  value: 33 },
  { label: "Electric Bass (Pick)",    value: 34 },
  { label: "Fretless Bass",           value: 35 },
  { label: "Slap Bass 1",             value: 36 },
  { label: "Acoustic Bass",           value: 32 },
  { label: "Piano",                   value: 0  },
  { label: "Violin",                  value: 40 },
  { label: "Cello",                   value: 42 },
  { label: "Trumpet",                 value: 56 },
  { label: "Flute",                   value: 73 },
];

export class AddTrackCommand {
  constructor(name = "New Track", program = 25) {
    this.relayout = "score"; this.name = name; this.program = program; this._track = null;
  }
  apply(score) {
    if (this._track) { score.tracks.push(this._track); this._track.index = score.tracks.length - 1; return; }
    const srcStaff = score.tracks[0]?.staves[0];
    const track = new alphaTab.model.Track();
    track.index = score.tracks.length;
    track.name = this.name;
    if (track.playbackInfo) {
      track.playbackInfo.program = this.program;
      track.playbackInfo.port = 0;
      track.playbackInfo.channel = score.tracks.length;
    }
    const staff = new alphaTab.model.Staff();
    staff.index = 0;
    staff.track = track;
    if (srcStaff?.tuning) staff.tuning = srcStaff.tuning;
    if (srcStaff?.stringCount != null) staff.stringCount = srcStaff.stringCount;
    track.staves.push(staff);
    for (let i = 0; i < score.masterBars.length; i++) {
      const bar = new alphaTab.model.Bar();
      bar.index = i;
      bar.staff = staff;
      const voice = new alphaTab.model.Voice();
      voice.index = 0; voice.bar = bar;
      const beat = new alphaTab.model.Beat();
      beat.voice = voice; beat.isEmpty = true;
      beat.duration = alphaTab.model.Duration.Quarter;
      voice.addBeat(beat);
      bar.addVoice(voice);
      staff.bars.push(bar);
    }
    score.tracks.push(track);
    this._track = track;
  }
  undo(score) {
    if (this._track) {
      const idx = score.tracks.indexOf(this._track);
      if (idx >= 0) score.tracks.splice(idx, 1);
      for (let i = 0; i < score.tracks.length; i++) score.tracks[i].index = i;
    }
  }
  describe() { return "Add track"; }
}

export function addTrack(name, program) {
  execute(new AddTrackCommand(name, program));
}

export class RemoveTrackCommand {
  constructor(trackIndex) {
    this.relayout = "score"; this.trackIndex = trackIndex; this._track = null;
  }
  apply(score) {
    if (score.tracks.length <= 1) return;
    this._track = score.tracks[this.trackIndex];
    score.tracks.splice(this.trackIndex, 1);
    for (let i = 0; i < score.tracks.length; i++) score.tracks[i].index = i;
  }
  undo(score) {
    if (this._track) {
      score.tracks.splice(this.trackIndex, 0, this._track);
      for (let i = 0; i < score.tracks.length; i++) score.tracks[i].index = i;
    }
  }
  describe() { return "Remove track"; }
}

export function removeTrack(trackIndex) {
  const { api } = getState();
  if (!api?.score || api.score.tracks.length <= 1) return;
  execute(new RemoveTrackCommand(trackIndex));
}

export class SetTrackNameCommand {
  constructor(trackIndex, name) {
    this.trackIndex = trackIndex; this.name = name; this._prior = null;
  }
  apply(score) {
    const t = score.tracks[this.trackIndex];
    if (!t) return;
    if (this._prior === null) this._prior = t.name;
    t.name = this.name;
  }
  undo(score) {
    const t = score.tracks[this.trackIndex];
    if (t && this._prior !== null) t.name = this._prior;
  }
  describe() { return "Rename track"; }
}

export function renameTrack(trackIndex, name) {
  execute(new SetTrackNameCommand(trackIndex, name));
}

export class SetTrackProgramCommand {
  constructor(trackIndex, program) {
    this.trackIndex = trackIndex; this.program = program; this._prior = null;
  }
  apply(score) {
    const t = score.tracks[this.trackIndex];
    if (!t?.playbackInfo) return;
    if (this._prior === null) this._prior = t.playbackInfo.program;
    t.playbackInfo.program = this.program;
  }
  undo(score) {
    const t = score.tracks[this.trackIndex];
    if (t?.playbackInfo && this._prior !== null) t.playbackInfo.program = this._prior;
  }
  describe() { return "Set instrument"; }
}

export function setTrackProgram(trackIndex, program) {
  execute(new SetTrackProgramCommand(trackIndex, program));
}

// ── Score info extended ───────────────────────────────────────────────────────────────────────────
export function updateScoreInfo(title, artist) {
  const { api } = getState();
  if (!api?.score) return;
  execute(new SetScoreInfoCommand(title, artist));
}

// ── Clipboard ─────────────────────────────────────────────────────────────────────────────────────
let _clipboard = null;

export function hasClipboard() { return _clipboard !== null; }
export function clearClipboard() { _clipboard = null; }

function cloneBeat(beat) {
  const b = new alphaTab.model.Beat();
  b.duration = beat.duration; b.dots = beat.dots; b.dynamics = beat.dynamics;
  if (beat.tap != null) b.tap = beat.tap;
  for (const note of beat.notes) {
    const n = new alphaTab.model.Note();
    n.string = note.string; n.fret = note.fret;
    n.isPalmMute = note.isPalmMute; n.isGhost = note.isGhost;
    n.isDead = note.isDead; n.isLetRing = note.isLetRing;
    n.isHammerPullOrigin = note.isHammerPullOrigin; n.vibrato = note.vibrato;
    n.slideOutType = note.slideOutType; n.slideInType = note.slideInType;
    b.addNote(n);
  }
  return b;
}

export function copySelection() {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const range = activeRange();
  if (!range) return;
  _clipboard = collectRangeBeats(api.score, range).map(cloneBeat);
}

export function cutSelection() {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  copySelection();
  const range = activeRange();
  if (!range) return;
  const beats = collectRangeBeats(api.score, range);
  for (const beat of beats) {
    const at = {
      trackIndex: range.trackIndex, staffIndex: range.staffIndex,
      voiceIndex: range.voiceIndex,
      barIndex: beat.voice?.bar?.index ?? 0,
      beatIndex: beat.index ?? 0,
    };
    new ScoreMutator(api.score).clearBeat(at);
  }
  api.score.finish(api.settings);
  api.render();
}

export function pasteClipboard() {
  if (!_clipboard?.length) return;
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  let at = { ...selection };
  for (const clip of _clipboard) {
    const voice = resolveVoice(api.score, at);
    if (!voice) break;
    const m = new ScoreMutator(api.score);
    const newBeat = m.insertBeatAfter(at);
    if (!newBeat) break;
    newBeat.duration = clip.duration; newBeat.dots = clip.dots;
    newBeat.dynamics = clip.dynamics;
    for (const note of clip.notes) {
      const n = new alphaTab.model.Note();
      n.string = note.string; n.fret = note.fret;
      newBeat.addNote(n);
    }
    at = { ...at, beatIndex: at.beatIndex + 1 };
  }
  api.score.finish(api.settings);
  api.render();
}

// ── NEW ADVANCED FEATURES ───────────────────────────────────────────────────────────────────────

// 1. Ottava
export class SetOttavaCommand {
  constructor(at, value) {
    this.relayout = "voice";
    this.at = at; this.value = value; this._prior = null;
  }
  apply(score) {
    const beat = resolveBeat(score, this.at);
    if (!beat) return;
    if (this._prior === null) this._prior = beat.ottava;
    beat.ottava = this.value;
  }
  undo(score) {
    if (this._prior === null) return;
    const beat = resolveBeat(score, this.at);
    if (beat) beat.ottava = this._prior;
  }
  describe() { return "Set Ottava"; }
}

export function setSelectedOttava(value) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetOttavaCommand(selection, value));
}

// 2. Brush & Arpeggio
export class SetBrushStrokeCommand {
  constructor(at, brushType, duration = 30) {
    this.relayout = "voice";
    this.at = at; this.brushType = brushType; this.duration = duration;
    this._priorType = null; this._priorDuration = null;
  }
  apply(score) {
    const beat = resolveBeat(score, this.at);
    if (!beat) return;
    if (this._priorType === null) {
      this._priorType = beat.brushType;
      this._priorDuration = beat.brushDuration;
    }
    beat.brushType = this.brushType;
    beat.brushDuration = this.duration;
  }
  undo(score) {
    if (this._priorType === null) return;
    const beat = resolveBeat(score, this.at);
    if (beat) {
      beat.brushType = this._priorType;
      beat.brushDuration = this._priorDuration;
    }
  }
  describe() { return "Set Brush/Arpeggio"; }
}

export function setSelectedBrush(brushType, duration = 30) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetBrushStrokeCommand(selection, brushType, duration));
}

// 3. Lyrics
export class SetLyricsCommand {
  constructor(at, lyricText) {
    this.relayout = "score";
    this.at = at; this.lyricText = lyricText; this._prior = null;
  }
  apply(score) {
    const beat = resolveBeat(score, this.at);
    if (!beat) return;
    if (this._prior === null) this._prior = beat.lyrics;
    beat.lyrics = this.lyricText ? [this.lyricText] : null;
  }
  undo(score) {
    if (this._prior === null) return;
    const beat = resolveBeat(score, this.at);
    if (beat) beat.lyrics = this._prior;
  }
  describe() { return "Set Lyrics"; }
}

export function setSelectedLyrics(text) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetLyricsCommand(selection, text));
}

// 4. Tracks Solo/Mute
export class ToggleTrackMuteCommand {
  constructor(trackIndex) {
    this.trackIndex = trackIndex;
    this._prior = null;
  }
  apply(score) {
    const t = score.tracks[this.trackIndex];
    if (!t?.playbackInfo) return;
    if (this._prior === null) this._prior = t.playbackInfo.isMute;
    t.playbackInfo.isMute = !t.playbackInfo.isMute;
  }
  undo(score) {
    const t = score.tracks[this.trackIndex];
    if (t?.playbackInfo && this._prior !== null) t.playbackInfo.isMute = this._prior;
  }
  describe() { return "Toggle Track Mute"; }
}

export class ToggleTrackSoloCommand {
  constructor(trackIndex) {
    this.trackIndex = trackIndex;
    this._prior = null;
  }
  apply(score) {
    const t = score.tracks[this.trackIndex];
    if (!t?.playbackInfo) return;
    if (this._prior === null) this._prior = t.playbackInfo.isSolo;
    t.playbackInfo.isSolo = !t.playbackInfo.isSolo;
  }
  undo(score) {
    const t = score.tracks[this.trackIndex];
    if (t?.playbackInfo && this._prior !== null) t.playbackInfo.isSolo = this._prior;
  }
  describe() { return "Toggle Track Solo"; }
}

export function toggleTrackMute(trackIndex) {
  execute(new ToggleTrackMuteCommand(trackIndex));
}

export function toggleTrackSolo(trackIndex) {
  execute(new ToggleTrackSoloCommand(trackIndex));
}

// 5. Tuning & Strings
export class SetTuningCommand {
  constructor(trackIndex, tuningName, tuningsArray) {
    this.relayout = "score";
    this.trackIndex = trackIndex;
    this.tuningName = tuningName;
    this.tuningsArray = tuningsArray;
    this._priorName = null;
    this._priorTunings = null;
    this._priorStringCount = null;
  }
  apply(score) {
    const staff = score.tracks[this.trackIndex]?.staves[0];
    if (!staff) return;
    if (this._priorName === null) {
      this._priorName = staff.tuning?.name || "Custom";
      this._priorTunings = staff.tuning?.tunings ? [...staff.tuning.tunings] : [64, 59, 55, 50, 45, 40];
      this._priorStringCount = staff.stringCount;
    }
    if (!staff.tuning) {
      try { staff.tuning = new alphaTab.model.Tuning(); } catch { staff.tuning = { tunings: [] }; }
    }
    staff.tuning.name = this.tuningName;
    staff.tuning.tunings = [...this.tuningsArray];
    staff.stringCount = this.tuningsArray.length;
  }
  undo(score) {
    const staff = score.tracks[this.trackIndex]?.staves[0];
    if (staff && this._priorName !== null) {
      if (!staff.tuning) {
        try { staff.tuning = new alphaTab.model.Tuning(); } catch { staff.tuning = { tunings: [] }; }
      }
      staff.tuning.name = this._priorName;
      staff.tuning.tunings = [...this._priorTunings];
      staff.stringCount = this._priorStringCount;
    }
  }
  describe() { return `Set tuning ${this.tuningName}`; }
}

export function setSelectedTuning(trackIndex, tuningName, tuningsArray) {
  execute(new SetTuningCommand(trackIndex, tuningName, tuningsArray));
}

// 6. Clef
export class SetClefCommand {
  constructor(at, clef) {
    this.relayout = "score";
    this.at = at; this.clef = clef; this._prior = null;
  }
  apply(score) {
    const staff = score.tracks[this.at.trackIndex]?.staves[this.at.staffIndex];
    const bar = staff?.bars[this.at.barIndex];
    if (!bar) return;
    if (this._prior === null) this._prior = bar.clef;
    bar.clef = this.clef;
  }
  undo(score) {
    if (this._prior === null) return;
    const staff = score.tracks[this.at.trackIndex]?.staves[this.at.staffIndex];
    const bar = staff?.bars[this.at.barIndex];
    if (bar) bar.clef = this._prior;
  }
  describe() { return "Set clef"; }
}

export function setSelectedClef(clef) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetClefCommand(selection, clef));
}

// 7. Triplet Feel
export class SetTripletFeelCommand {
  constructor(barIndex, tripletFeel) {
    this.relayout = "score";
    this.barIndex = barIndex; this.tripletFeel = tripletFeel; this._prior = null;
  }
  apply(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    if (this._prior === null) this._prior = mb.tripletFeel;
    mb.tripletFeel = this.tripletFeel;
  }
  undo(score) {
    if (this._prior === null) return;
    const mb = score.masterBars[this.barIndex];
    if (mb) mb.tripletFeel = this._prior;
  }
  describe() { return "Set triplet feel"; }
}

export function setSelectedTripletFeel(feel) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetTripletFeelCommand(selection.barIndex, feel));
}

// 8. Tuplets
export class SetBeatTupletCommand {
  constructor(at, numerator, denominator) {
    this.relayout = "voice";
    this.at = at; this.numerator = numerator; this.denominator = denominator;
    this._priorNum = null; this._priorDenom = null;
  }
  apply(score) {
    const beat = resolveBeat(score, this.at);
    if (!beat) return;
    if (this._priorNum === null) { this._priorNum = beat.tupletNumerator; this._priorDenom = beat.tupletDenominator; }
    beat.tupletNumerator = this.numerator;
    beat.tupletDenominator = this.denominator;
  }
  undo(score) {
    if (this._priorNum === null) return;
    const beat = resolveBeat(score, this.at);
    if (beat) {
      beat.tupletNumerator = this._priorNum;
      beat.tupletDenominator = this._priorDenom;
    }
  }
  describe() { return "Set tuplet"; }
}

export function setSelectedTuplet(num, denom) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetBeatTupletCommand(selection, num, denom));
}

// 9. Wah, Crescendo, Pick Stroke, Fade, Rasgueado, Left Hand Tap, Custom Dots, Custom Accent
export function setSelectedWah(value) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetBeatEffectCommand(selection, "wahPedal", value, { relayout: "voice" }));
}

export function setSelectedCrescendo(value) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetBeatEffectCommand(selection, "crescendo", value, { relayout: "voice" }));
}

export function setSelectedPickStroke(value) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetBeatEffectCommand(selection, "pickStroke", value, { relayout: "voice" }));
}

export function setSelectedFade(value) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetBeatEffectCommand(selection, "fade", value, { relayout: "voice" }));
}

export function setSelectedRasgueado(value) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetBeatEffectCommand(selection, "rasgueado", value, { relayout: "voice" }));
}

export function toggleSelectedLeftHandTap() {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note) return;
  execute(new SetNoteEffectCommand(selection, selectedString, "isLeftHandTapped", !note.isLeftHandTapped, { relayout: "voice" }));
}

export function setSelectedAccent(value) {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  execute(new SetNoteEffectCommand(selection, selectedString, "accentuated", value, { relayout: "voice" }));
}

export function setSelectedDots(dots) {
  const { selection, api } = getState();
  if (!selection || !api?.score) return;
  const beat = resolveBeat(api.score, selection);
  if (!beat) return;
  execute(new ChangeDurationCommand(selection, beat.duration, dots));
}

// ── Text Annotation / Repeats ──

export function setSelectedTextAnnotation(text) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetBeatEffectCommand(selection, "text", text, { relayout: "voice" }));
}

export class SetRepeatStartCommand {
  constructor(barIndex, value) {
    this.relayout = "score";
    this.barIndex = barIndex; this.value = value; this._prior = null;
  }
  apply(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    if (this._prior === null) this._prior = mb.isRepeatStart;
    mb.isRepeatStart = this.value;
  }
  undo(score) {
    if (this._prior === null) return;
    const mb = score.masterBars[this.barIndex];
    if (mb) mb.isRepeatStart = this._prior;
  }
  describe() { return "Set repeat start"; }
}

export class SetRepeatCountCommand {
  constructor(barIndex, value) {
    this.relayout = "score";
    this.barIndex = barIndex; this.value = value; this._prior = null;
  }
  apply(score) {
    const mb = score.masterBars[this.barIndex];
    if (!mb) return;
    if (this._prior === null) this._prior = mb.repeatCount;
    mb.repeatCount = this.value;
  }
  undo(score) {
    if (this._prior === null) return;
    const mb = score.masterBars[this.barIndex];
    if (mb) mb.repeatCount = this._prior;
  }
  describe() { return "Set repeat count"; }
}

export function setSelectedRepeatStart(value) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetRepeatStartCommand(selection.barIndex, value));
}

export function setSelectedRepeatCount(value) {
  const { selection } = getState();
  if (!selection) return;
  execute(new SetRepeatCountCommand(selection.barIndex, value));
}

