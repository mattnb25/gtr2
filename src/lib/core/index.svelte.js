import { Engine } from "./engine.svelte.js";
import { FileSystem } from "./fileSystem.svelte.js";
import { Editor } from "./editor.svelte.js";
import { Playback } from "./playback.svelte.js";

class Project {
  engine = new Engine();
  io = new FileSystem(this.engine, this);
  editor = new Editor(this.engine, this);
  playback = new Playback(this.engine);

  hasUnsavedChanges = $state(false);

  init(canvasEl, settings) {
    this.engine.init(canvasEl, settings);
    this.editor.initListeners();
    this.playback.initListeners();
  }
}

export const project = new Project();
