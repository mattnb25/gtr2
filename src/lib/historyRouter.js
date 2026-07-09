import { CommandStack } from "./commandStack.js";
import { getState, setState } from "../store.js";
import { reValidateSelection } from "./selection.js";

const stack = new CommandStack(() => getState().api?.score ?? null);

const MIDI_REGEN_MS = 400;
let midiTimer = null;

function scheduleMidiRegen() {
  if (midiTimer) clearTimeout(midiTimer);
  midiTimer = setTimeout(() => {
    midiTimer = null;
    const api = getState().api;
    if (api && typeof api.loadMidiForScore === "function") api.loadMidiForScore();
  }, MIDI_REGEN_MS);
}

function afterMutation(cmd) {
  const state = getState();
  const api = state.api;
  const relayout = cmd?.relayout ?? "none";

  if (relayout !== "none" && api?.score && api.settings) {
    api.score.finish(api.settings);
  }

  if (api?.score) reValidateSelection(api.score);
  api?.render();
  scheduleMidiRegen();

  setState({
    scoreVersion: state.scoreVersion + 1,
    canUndo: stack.canUndo,
    canRedo: stack.canRedo,
  });
}

export function execute(cmd) {
  const ran = stack.execute(cmd);
  afterMutation(ran);
}

export function peekTop() {
  return stack.peek();
}

export function reExecuteTop() {
  if (!stack.reExecuteTop()) return;
  afterMutation(null);
}

export function undo() {
  const cmd = stack.undo();
  afterMutation(cmd);
}

export function redo() {
  const cmd = stack.redo();
  afterMutation(cmd);
}

export function clearHistory() {
  stack.clear();
  setState({ canUndo: false, canRedo: false });
}
