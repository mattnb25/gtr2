import * as alphaTab from "@coderline/alphatab";

class ProjectManager {
  api = $state(null);
  fileHandle = $state(null);
  hasUnsavedChanges = $state(false);
  isPlaying = $state(false);

  constructor() {
    this.api?.playerStateChanged.on((e) => (this.isPlaying = e.state === 1));
  }

  initApi(canvasEl, settings) {
    if (!canvasEl) return;
    this.destroyApi();
    this.api = new alphaTab.AlphaTabApi(canvasEl, settings);
  }

  destroyApi() {
    this.api?.destroy();
    this.api = null;
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
              description: "Guitar Pro",
              accept: {
                // prettier-ignore
                "application/octet-stream": [".gp",".gp3",".gp4", ".gp5", ".gpx"],
              },
            },
            { description: "AlphaTex", accept: { "text/plain": [".atex"] } },
          ],
        });
        this.fileHandle = handle;
        this.api?.load(
          new Uint8Array(await (await handle.getFile()).arrayBuffer()),
        );
        return;
      } catch {
        return;
      } // Handles user cancel
    }
    fallbackInput.click();
  }

  async openFile(file) {
    const data = await file.arrayBuffer();
    project.api.load(new Uint8Array(data));
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

  updateScore(callback) {
    if (!this.api?.score) return;
    callback(this.api.score);
    this.api.render();
    this.hasUnsavedChanges = true;
  }

  updateSettings(callback) {
    if (!this.api?.settings) return;
    callback(this.api.settings);
    this.api.updateSettings();
    this.api.render();
  }

  togglePlayback = () => this.api?.playPause();
}

export const project = new ProjectManager();
