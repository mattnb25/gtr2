import * as alphaTab from "@coderline/alphatab";

export class History {
  #engine;
  #project;
  #undoStack = $state([]);
  #redoStack = $state([]);
  #maxSize = 50;

  constructor(engine, project) {
    this.#engine = engine;
    this.#project = project;
  }

  get canUndo() {
    return this.#undoStack.length > 0;
  }
  get canRedo() {
    return this.#redoStack.length > 0;
  }

  /** Call BEFORE any mutation to snapshot the current score state. */
  snapshot() {
    if (!this.#engine.api?.score) return;
    const data = this.#capture();
    this.#undoStack.push(data);
    if (this.#undoStack.length > this.#maxSize) this.#undoStack.shift();
    this.#redoStack = [];
  }

  #capture() {
    return new alphaTab.exporter.Gp7Exporter().export(
      this.#engine.api.score,
      this.#engine.api.settings,
    );
  }

  #restore(data) {
    this.#engine.api.load(data);
    this.#project.hasUnsavedChanges = true;
  }

  undo() {
    if (!this.canUndo || !this.#engine.api?.score) return;
    this.#redoStack.push(this.#capture());
    this.#restore(this.#undoStack.pop());
  }

  redo() {
    if (!this.canRedo || !this.#engine.api?.score) return;
    this.#undoStack.push(this.#capture());
    this.#restore(this.#redoStack.pop());
  }
}
