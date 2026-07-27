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

  canvasEl = null;

  settings = {
    enableLazyLoading: true,
    core: {
      engine: "html5",
      fontDirectory: "/font/",
      includeNoteBounds: true,
    },
    player: {
      soundFont: "/soundfont/sonivox.sf3",
      enablePlayer: true,
      scrollMode: "offscreen",
    },
    display: {
      padding: [14, 18],
    },
  };

  init(canvasEl) {
    this.canvasEl = canvasEl;
    this.engine.init(canvasEl, settings);
    this.editor.initListeners();
    this.playback.initListeners();
  }

  resetEngine() {
    if (!this.canvasEl || !this.settings) return;
    this.engine.destroy();
    this.engine.init(this.canvasEl, this.settings);
    // Re‑attach listeners after re‑initialisation
    this.editor.initListeners();
    this.playback.initListeners();
  }
}

export const project = new Project();
