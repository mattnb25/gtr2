import { getState, setState } from "../store.js";

export function resolveBeat(score, at) {
  return resolveVoice(score, at)?.beats[at.beatIndex] ?? null;
}

export function resolveVoice(score, at) {
  const track = score.tracks[at.trackIndex];
  if (!track) return null;
  const staff = track.staves[at.staffIndex];
  if (!staff) return null;
  const bar = staff.bars[at.barIndex];
  if (!bar) return null;
  return bar.voices[at.voiceIndex] ?? null;
}

export function sameVoice(a, b) {
  return (
    a.trackIndex === b.trackIndex &&
    a.staffIndex === b.staffIndex &&
    a.voiceIndex === b.voiceIndex
  );
}

export function beatRefFromBeat(beat) {
  const voice = beat.voice;
  const bar = voice.bar;
  const staff = bar.staff;
  const track = staff.track;
  if (voice.index !== 0) {
    const v0 = bar.voices[0];
    if (!v0 || beat.index >= v0.beats.length) return null;
    return { trackIndex: track.index, staffIndex: staff.index, voiceIndex: 0, barIndex: bar.index, beatIndex: beat.index };
  }
  return { trackIndex: track.index, staffIndex: staff.index, voiceIndex: 0, barIndex: bar.index, beatIndex: beat.index };
}

export function selectByBeat(beat) {
  const ref = beatRefFromBeat(beat);
  if (!ref) return;
  setState({ selection: ref, anchor: null });
}

export function selectByNote(note) {
  const ref = beatRefFromBeat(note.beat);
  if (!ref) return;
  setState({ selection: ref, anchor: null, selectedString: note.string });
}

export function setRangeFocusByBeat(beat) {
  const ref = beatRefFromBeat(beat);
  if (!ref) return;
  const { selection, anchor } = getState();
  if (!selection) { setState({ selection: ref, anchor: null }); return; }
  if (!sameVoice(selection, ref)) return;
  setState({ selection: ref, anchor: anchor ?? selection });
}

export function clearSelection() {
  setState({ selection: null, anchor: null });
}

export function clearAnchor() {
  if (getState().anchor !== null) setState({ anchor: null });
}

export function moveBeat(dx) {
  const state = getState();
  const { selection, api } = state;
  if (!selection || !api?.score) return;
  const voice = resolveVoice(api.score, selection);
  if (!voice) return;
  let next = selection.beatIndex + dx;
  let nextBar = selection.barIndex;
  if (next < 0) {
    nextBar = selection.barIndex - 1;
    if (nextBar < 0) return;
    const pv = resolveVoice(api.score, { ...selection, barIndex: nextBar });
    if (!pv || !pv.beats.length) return;
    next = pv.beats.length - 1;
  } else if (next >= voice.beats.length) {
    const staff = api.score.tracks[selection.trackIndex]?.staves[selection.staffIndex];
    if (!staff || nextBar + 1 >= staff.bars.length) return;
    nextBar = selection.barIndex + 1;
    const nv = resolveVoice(api.score, { ...selection, barIndex: nextBar });
    if (!nv || !nv.beats.length) return;
    next = 0;
  }
  setState({ selection: { ...selection, barIndex: nextBar, beatIndex: next } });
}

export function moveString(dy) {
  const state = getState();
  const { selection, api, selectedString } = state;
  if (!selection || !api?.score) return;
  const staff = api.score.tracks[selection.trackIndex]?.staves[selection.staffIndex];
  if (!staff) return;
  const count = staff.tuning.length;
  if (!count) return;
  const next = Math.max(1, Math.min(count, selectedString + dy));
  if (next === selectedString) return;
  setState({ selectedString: next });
}

export function extendSelection(dx) {
  const { selection, anchor } = getState();
  if (!selection) return;
  if (anchor === null) setState({ anchor: selection });
  moveBeat(dx);
}

export function reValidateSelection(score) {
  const { selection, selectedString } = getState();
  if (!selection) return;
  let nextRef = selection;
  const voice = resolveVoice(score, selection);
  if (!voice || !voice.beats.length) {
    const staff = score.tracks[selection.trackIndex]?.staves[selection.staffIndex];
    let barIndex = selection.barIndex - 1;
    let landed = null;
    while (staff && barIndex >= 0) {
      const v = staff.bars[barIndex]?.voices[selection.voiceIndex];
      if (v && v.beats.length) {
        landed = { ...selection, barIndex, beatIndex: v.beats.length - 1 };
        break;
      }
      barIndex--;
    }
    if (landed) nextRef = landed;
  } else if (selection.beatIndex >= voice.beats.length) {
    nextRef = { ...selection, beatIndex: voice.beats.length - 1 };
  }
  const staff = score.tracks[nextRef.trackIndex]?.staves[nextRef.staffIndex];
  const count = staff?.tuning.length ?? selectedString;
  const nextString = Math.max(1, Math.min(count, selectedString));
  if (nextRef !== selection || nextString !== selectedString) {
    setState({ selection: nextRef, selectedString: nextString });
  }
}

export function normalizeRange(a, b) {
  if (!sameVoice(a, b)) return null;
  const aFirst = a.barIndex < b.barIndex || (a.barIndex === b.barIndex && a.beatIndex <= b.beatIndex);
  const lo = aFirst ? a : b;
  const hi = aFirst ? b : a;
  return { trackIndex: a.trackIndex, staffIndex: a.staffIndex, voiceIndex: a.voiceIndex, fromBar: lo.barIndex, fromBeat: lo.beatIndex, toBar: hi.barIndex, toBeat: hi.beatIndex };
}

export function activeRange() {
  const { selection, anchor } = getState();
  if (!selection) return null;
  return normalizeRange(anchor ?? selection, selection);
}

export function collectRangeBeats(score, range) {
  const staff = score.tracks[range.trackIndex]?.staves[range.staffIndex];
  if (!staff) return [];
  const out = [];
  for (let b = range.fromBar; b <= range.toBar; b++) {
    const voice = staff.bars[b]?.voices[range.voiceIndex];
    if (!voice) continue;
    const start = b === range.fromBar ? range.fromBeat : 0;
    const end = b === range.toBar ? Math.min(range.toBeat, voice.beats.length - 1) : voice.beats.length - 1;
    for (let i = start; i <= end; i++) {
      const beat = voice.beats[i];
      if (beat) out.push(beat);
    }
  }
  return out;
}

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export function openStringLabel(tuning, selectedString) {
  const midi = tuning[tuning.length - selectedString];
  if (midi == null || !Number.isFinite(midi)) return `${selectedString}`;
  return `${selectedString} · ${NOTE_NAMES[((midi % 12) + 12) % 12]}`;
}

export function findBeatAtTick(score, trackIndex, tick) {
  if (!score) return null;
  const track = score.tracks[trackIndex];
  if (!track) return null;
  for (const staff of track.staves) {
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          const start = beat.absolutePlaybackStart;
          const end = start + beat.playbackDuration;
          if (tick >= start && tick < end) {
            return beat;
          }
        }
      }
    }
  }
  return null;
}

