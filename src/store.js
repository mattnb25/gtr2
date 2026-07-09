import { writable } from "svelte/store";

const initial = {
  api: null,
  currentFileId: null,
  files: [],
  error: null,
  warning: null,
  transport: { playbackSpeed: 1, metronome: false, countIn: false, playing: false },
  view: { zoom: 1, layoutMode: "page" },
  selection: null,
  anchor: null,
  selectedString: 1,
  scoreVersion: 0,
  canUndo: false,
  canRedo: false,
  tracks: [],
};

export const storeWritable = writable(initial);
let _state = initial;

export function getState() {
  return _state;
}

export function setState(patch) {
  _state = { ..._state, ...patch };
  storeWritable.set(_state);
}
