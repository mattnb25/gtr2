import { Engine } from "./engine.svelte.js";
import { FileSystem } from "./fileSystem.svelte.js";
import { Editor } from "./editor.svelte.js";
import { Playback } from "./playback.svelte.js";
import { History } from "./history.svelte.js";

class Project {
  engine = new Engine();
  history = new History(this.engine, this);
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
      // Smooth scrolls with the playhead on every beat; offscreen only jumps at
      // page boundaries (a 138bpm page can last ~50s, so it feels like nothing).
      scrollMode: "smooth",
    },
    display: {
      padding: [14, 18],
      effectBandPaddingBottom: 8,
      firstNotationStaffPaddingTop: 8,
      resources: {
        barNumberColor: "#5a6ee0",
      },
    },
  };

  init(canvasEl) {
    this.canvasEl = canvasEl;
    // Auto-scroll must target the element that actually scrolls
    // (.viewer-container, overflow:auto), not the inner .canvas div.
    this.settings.player.scrollElement = this.canvasEl?.parentElement || this.canvasEl;
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
