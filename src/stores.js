import { writable, derived } from "svelte/store";

export const api = writable(null);
export const isPlaying = writable(false);
export const selectedBeat = writable(null);
export const score = writable(null);
export const files = writable([]);
export const activeFileId = writable(null);

export const activeFile = derived(
  [files, activeFileId],
  ([$files, $activeFileId]) => $files.find((f) => f.id === $activeFileId) ?? null
);

export const tempo = writable(100);
export const zoom = writable(100);
export const metronome = writable(false);
export const countIn = writable(false);
export const layoutMode = writable("Page");
export const selectedSound = writable("Sonivox GM");

export const editState = writable({
  rhythm: "1/4",
  fretInput: "",
  palmMute: false,
  ghost: false,
  dead: false,
  vibrato: false,
  tie: false,
  dynamic: "mf",
  letRing: false,
  hopo: false,
  slide: false,
  bend: false,
  dotted: false,
});
