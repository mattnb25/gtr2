import { getState, setState } from "../store.js";
import { moveBeat, moveString, extendSelection, clearAnchor, resolveBeat } from "./selection.js";
import { undo, redo } from "./historyRouter.js";
import {
  changeSelectedFret, deleteSelectedNote, stepSelectedDuration,
  toggleSelectedDot, insertBeatAfterSelection, deleteSelectedBeat,
  copySelection, cutSelection, pasteClipboard,
} from "./commands/index.js";
import { resolveNote } from "./scoreMutator.js";
import { ChangeStringCommand } from "./commands/index.js";
import { execute } from "./historyRouter.js";

function isTextTarget(t) {
  if (!(t instanceof HTMLElement)) return false;
  if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return true;
  return t.isContentEditable;
}

function moveSelectedNote(dy) {
  const { selection, selectedString, api } = getState();
  if (!selection || !api?.score) return;
  const staff = api.score.tracks[selection.trackIndex]?.staves[selection.staffIndex];
  if (!staff) return;
  const count = staff.tuning.length;
  const nextString = Math.max(1, Math.min(count, selectedString + dy));
  if (nextString === selectedString) return;
  const note = resolveNote(api.score, selection, selectedString);
  if (!note) return;
  execute(new ChangeStringCommand(selection, selectedString, nextString));
  setState({ selectedString: nextString });
}

function seekToSelection() {
  const { api, selection } = getState();
  if (!api || !selection || !api.score) return;
  const beat = resolveBeat(api.score, selection);
  if (beat) api.tickPosition = beat.absolutePlaybackStart;
}

export function attachKeyboard() {
  const handler = (e) => {
    if (isTextTarget(e.target)) return;
    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key.toLowerCase() === "z") {
      e.shiftKey ? redo() : undo();
      e.preventDefault(); return;
    }
    if (mod && e.key.toLowerCase() === "y") { redo(); e.preventDefault(); return; }

    if (mod && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "c") { copySelection(); e.preventDefault(); return; }
      if (k === "x") { cutSelection(); e.preventDefault(); return; }
      if (k === "v") { pasteClipboard(); e.preventDefault(); return; }
    }

    switch (e.key) {
      case "ArrowLeft":
        if (e.shiftKey) extendSelection(-1); else { clearAnchor(); moveBeat(-1); }
        e.preventDefault(); return;
      case "ArrowRight":
        if (e.shiftKey) extendSelection(1); else { clearAnchor(); moveBeat(1); }
        e.preventDefault(); return;
      case "ArrowUp":
        clearAnchor();
        if (e.altKey) moveSelectedNote(-1); else moveString(-1);
        e.preventDefault(); return;
      case "ArrowDown":
        clearAnchor();
        if (e.altKey) moveSelectedNote(1); else moveString(1);
        e.preventDefault(); return;
      case "Enter":
        seekToSelection(); e.preventDefault(); return;
      case "Delete": case "Backspace":
        mod ? deleteSelectedBeat() : deleteSelectedNote();
        e.preventDefault(); return;
    }

    if (!mod) {
      if (e.key === "-") { stepSelectedDuration(-1); e.preventDefault(); return; }
      if (e.key === "+" || e.key === "=") { stepSelectedDuration(1); e.preventDefault(); return; }
      if (e.key === ".") { toggleSelectedDot(); e.preventDefault(); return; }
      if (e.key.toLowerCase() === "i") { insertBeatAfterSelection(); e.preventDefault(); return; }
    }

    if (!mod && e.key.length === 1 && e.key >= "0" && e.key <= "9") {
      changeSelectedFret(Number(e.key));
      e.preventDefault();
    }
  };

  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}
