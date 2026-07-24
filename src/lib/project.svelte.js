import * as alphaTab from "@coderline/alphatab";

class ProjectManager {
  // always mutate the api directly
  api = $state(null);

  // reactive states for the toolbar to read data from
  score = $state(null);
  tracks = $state([]);
  activeBeat = $state(null);
  settings = $state(null);

  fileHandle = $state(null);
  hasUnsavedChanges = $state(false);
  isPlaying = $state(false);

  constructor() {}

  initApi(canvasEl, settings) {
    if (!canvasEl) return;
    this.destroyApi();
    this.api = new alphaTab.AlphaTabApi(canvasEl, settings);

    // 1. Full File/Score Load Event
    this.api.scoreLoaded.on((score) => {
      this.score = score;
      this.tracks = score?.tracks || [];
      this.activeBeat = null;
    });

    // 2. Cursor & Beat Click Tracking (For Beat, Bar, and Note tabs)
    this.api.activeBeatsChanged.on((args) => {
      this.activeBeat = args.activeBeats?.[0] || null;
    });

    // 3. Settings Changes (For score tab)
    this.api.settingsUpdated.on(() => {
      this.settings = this.api.settings;
    });

    // 4. Player State
    this.api.playerStateChanged.on((e) => {
      this.isPlaying = e.state === 1;
    });
  }

  destroyApi() {
    this.api?.destroy();
    this.api = null;
    this.score = null;
    this.tracks = [];
    this.activeBeat = null;
    this.settings = null;
    this.isPlaying = false;
  }

  // Helper to fetch the correct exporter class dynamically
  #getExporter(filename = "") {
    return filename.toLowerCase().endsWith(".gp")
      ? new alphaTab.exporter.Gp7Exporter()
      : new alphaTab.exporter.AlphaTexExporter();
  }

  async tryFileApi(fallbackInput) {
    if (this.hasUnsavedChanges && !confirm("Discard unsaved changes?")) return;

    if ("showOpenFilePicker" in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: "Guitar Pro Files",
              accept: {
                // prettier-ignore
                "application/x-guitar-pro": [".gp", ".gp3", ".gp4", ".gp5", ".gpx"],
              },
            },
            {
              description: "AlphaTex Files",
              accept: {
                "text/x-alphatex": [".atex"],
              },
            },
          ],
          multiple: false,
        });
        this.fileHandle = handle;
        const file = await handle.getFile();
        this.api?.load(new Uint8Array(await file.arrayBuffer()));
        return;
      } catch {
        return; // Handles user cancel
      }
    }
    fallbackInput.click();
  }

  async openFile(file) {
    const data = await file.arrayBuffer();
    this.api.load(new Uint8Array(data));
  }

  newFile() {
    if (this.hasUnsavedChanges && !confirm("Discard unsaved changes?")) return;
    this.fileHandle = null;
    this.api?.tex("\\title 'Untitled'");
  }

  async saveFile() {
    if (!this.api) return;
    const name = this.fileHandle?.name.toLowerCase() || "";

    if (this.fileHandle && (name.endsWith(".atex") || name.endsWith(".gp"))) {
      try {
        const data = this.#getExporter(name).export(
          this.api.score,
          this.api.settings,
        );
        const writable = await this.fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        this.hasUnsavedChanges = false;
        return;
      } catch {
        this.fileHandle = null;
      }
    }
    this.exportFile(".atex");
  }

  exportFile(format) {
    if (!this.api) return;
    if (format === ".pdf") return this.api.print();

    const data = this.#getExporter(format).export(
      this.api.score,
      this.api.settings,
    );
    this.hasUnsavedChanges = false;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data]));
    a.download = (this.api.score?.title || "Untitled") + format;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // --- Helper Mutators to Guarantee Reactivity ---

  updateScore(callback) {
    if (!this.api?.score) return;
    callback(this.api.score);
    this.api.render();
    this.score = this.api.score; // Notify Svelte
    this.hasUnsavedChanges = true;
  }

  updateBeat(callback) {
    if (!this.activeBeat) return;
    callback(this.activeBeat);
    this.api.render();
    this.activeBeat = this.activeBeat; // Notify Svelte
    this.hasUnsavedChanges = true;
  }

  updateSettings(callback) {
    if (!this.api?.settings) return;
    callback(this.api.settings);
    this.api.updateSettings();
    this.api.render();
    this.settings = this.api.settings; // Notify Svelte
  }

  togglePlayback = () => this.api?.playPause();
}

export const project = new ProjectManager();
