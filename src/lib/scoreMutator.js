import * as alphaTab from "@coderline/alphatab";
import { resolveBeat, resolveVoice } from "./selection.js";

export function resolveNote(score, at, stringIndex) {
  const beat = resolveBeat(score, at);
  if (!beat) return null;
  return beat.notes.find((n) => n.string === stringIndex) ?? null;
}

export class ScoreMutator {
  constructor(score) {
    this.score = score;
  }

  changeFret(at, stringIndex, fret) {
    const note = resolveNote(this.score, at, stringIndex);
    if (note) note.fret = fret;
  }

  setNoteField(at, stringIndex, key, value) {
    const note = resolveNote(this.score, at, stringIndex);
    if (note) note[key] = value;
  }

  setBeatField(at, key, value) {
    const beat = resolveBeat(this.score, at);
    if (beat) beat[key] = value;
  }

  applyBend(at, stringIndex, bendType, points) {
    const note = resolveNote(this.score, at, stringIndex);
    if (!note) return;
    note.bendPoints = null;
    note.maxBendPoint = null;
    note.bendType = bendType;
    if (points) {
      for (const [offset, value] of points) {
        note.addBendPoint(new alphaTab.model.BendPoint(offset, value));
      }
    }
  }

  applyWhammy(at, whammyType, points) {
    const beat = resolveBeat(this.score, at);
    if (!beat) return;
    beat.whammyBarPoints = null;
    beat.maxWhammyPoint = null;
    beat.minWhammyPoint = null;
    beat.whammyBarType = whammyType;
    if (points) {
      for (const [offset, value] of points) {
        beat.addWhammyBarPoint(new alphaTab.model.BendPoint(offset, value));
      }
    }
  }

  changeString(at, fromString, toString) {
    const beat = resolveBeat(this.score, at);
    if (!beat) return false;
    const note = beat.getNoteOnString(fromString);
    if (!note) return false;
    if (beat.getNoteOnString(toString)) return false;
    beat.noteStringLookup.delete(note.string);
    note.string = toString;
    beat.noteStringLookup.set(toString, note);
    return true;
  }

  addNote(at, stringIndex, fret) {
    const beat = resolveBeat(this.score, at);
    if (!beat) return null;
    if (beat.getNoteOnString(stringIndex)) return null;
    const note = new alphaTab.model.Note();
    note.string = stringIndex;
    note.fret = fret;
    beat.addNote(note);
    return note;
  }

  restoreNote(at, note) {
    resolveBeat(this.score, at)?.addNote(note);
  }

  removeNote(at, note) {
    resolveBeat(this.score, at)?.removeNote(note);
  }

  clearBeat(at) {
    const beat = resolveBeat(this.score, at);
    if (!beat) return [];
    const removed = [...beat.notes];
    for (const note of removed) beat.removeNote(note);
    return removed;
  }

  changeDuration(at, duration, dots) {
    const beat = resolveBeat(this.score, at);
    if (!beat) return;
    beat.duration = duration;
    beat.dots = dots;
  }

  insertBeatAfter(at) {
    const voice = resolveVoice(this.score, at);
    if (!voice) return null;
    const beat = new alphaTab.model.Beat();
    beat.voice = voice;
    voice.beats.splice(at.beatIndex + 1, 0, beat);
    return beat;
  }

  removeBeat(at) {
    const voice = resolveVoice(this.score, at);
    if (!voice) return null;
    const beat = voice.beats[at.beatIndex];
    if (!beat) return null;
    if (beat.nextBeat) beat.nextBeat.previousBeat = beat.previousBeat;
    voice.beats.splice(at.beatIndex, 1);
    return beat;
  }

  reinsertBeat(at, index, beat) {
    const voice = resolveVoice(this.score, at);
    if (!voice) return;
    beat.voice = voice;
    voice.beats.splice(index, 0, beat);
  }

  relinkStructure() {
    const mbs = this.score.masterBars;
    for (let i = 0; i < mbs.length; i++) {
      const mb = mbs[i];
      mb.index = i;
      mb.previousMasterBar = i > 0 ? mbs[i - 1] : null;
      mb.nextMasterBar = i < mbs.length - 1 ? mbs[i + 1] : null;
    }
    for (const track of this.score.tracks) {
      for (const staff of track.staves) {
        const bars = staff.bars;
        for (let i = 0; i < bars.length; i++) {
          const bar = bars[i];
          bar.index = i;
          bar.previousBar = i > 0 ? bars[i - 1] : null;
          bar.nextBar = i < bars.length - 1 ? bars[i + 1] : null;
        }
      }
    }
  }
}
