export const STACK_CAP = 200;

export class CommandStack {
  constructor(getScore) {
    this._getScore = getScore;
    this._undoStack = [];
    this._redoStack = [];
  }

  execute(cmd) {
    const score = this._getScore();
    if (!score) return null;
    cmd.apply(score);
    this._undoStack.push(cmd);
    if (this._undoStack.length > STACK_CAP) this._undoStack.shift();
    this._redoStack = [];
    return cmd;
  }

  undo() {
    if (!this._undoStack.length) return null;
    const score = this._getScore();
    if (!score) return null;
    const cmd = this._undoStack.pop();
    cmd.undo(score);
    this._redoStack.push(cmd);
    return cmd;
  }

  redo() {
    if (!this._redoStack.length) return null;
    const score = this._getScore();
    if (!score) return null;
    const cmd = this._redoStack.pop();
    cmd.apply(score);
    this._undoStack.push(cmd);
    return cmd;
  }

  peek() {
    return this._undoStack[this._undoStack.length - 1] ?? null;
  }

  reExecuteTop() {
    const score = this._getScore();
    if (!score || !this._undoStack.length) return false;
    this._undoStack[this._undoStack.length - 1].apply(score);
    return true;
  }

  get canUndo() { return this._undoStack.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }
  get depth() { return this._undoStack.length; }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
  }
}
