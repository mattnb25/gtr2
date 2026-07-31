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
  canvasEl = $state(null);

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
      effectBandPaddingBottom: 8,
      firstNotationStaffPaddingTop: 8,
    },
  };

  init(canvasEl) {
    this.canvasEl = canvasEl;
    this.settings.player.scrollElement = this.canvasEl;
    this.engine.init(this.canvasEl, this.settings);
    this.editor.initListeners();
    this.playback.initListeners();
  }

  resetEngine() {
    if (!this.canvasEl) return;
    this.engine.destroy();
    this.init(this.canvasEl);
  }
}

export const project = new Project();
