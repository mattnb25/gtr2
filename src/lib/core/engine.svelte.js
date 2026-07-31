import * as alphaTab from "@coderline/alphatab";

export class Engine {
  api = null;
  #tick = $state(0);
  #renderQueued = false;

  init(canvasEl, settings) {
    if (!canvasEl) return;
    this.destroy();

    for (const [element, font] of alphaTab.RenderingResources.defaultFonts) {
      if (font.families.includes("serif")) {
        font.family = "Cursive";
      }
    }
    this.api = new alphaTab.AlphaTabApi(canvasEl, settings);

    // Auto-tick Svelte when AlphaTab mutates internally
    this.api.scoreLoaded.on(() => this.ping());
    this.api.settingsUpdated.on(() => this.ping());
  }

  destroy() {
    this.api?.destroy();
    this.api = null;
  }

  ping() {
    this.#tick += 1;
  }

  // Guarantees AlphaTab only renders once per frame, regardless of mutation count
  requestUpdate() {
    this.ping();
    if (this.#renderQueued) return;
    this.#renderQueued = true;

    queueMicrotask(() => {
      this.api?.render();
      this.#renderQueued = false;
    });
  }

  get currentTick() {
    return this.#tick;
  }
}
