import * as alphaTab from "@coderline/alphatab";

export class FileSystem {
  #engine;
  #project;
  fileHandle = null;

  constructor(engine, project) {
    this.#engine = engine;
    this.#project = project;
  }

  #getExporter(filename = "") {
    return filename.toLowerCase().endsWith(".gp")
      ? new alphaTab.exporter.Gp7Exporter()
      : new alphaTab.exporter.AlphaTexExporter();
  }

  async tryNativeFilePicker() {
    if (this.#project.hasUnsavedChanges && !confirm("Discard unsaved changes?"))
      return false;
    if (!("showOpenFilePicker" in window)) return false;

    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Guitar Pro Files",
            accept: {
              "application/x-guitar-pro": [
                ".gp",
                ".gp3",
                ".gp4",
                ".gp5",
                ".gpx",
              ],
            },
          },
          {
            description: "AlphaTex Files",
            accept: { "text/x-alphatex": [".atex"] },
          },
          {
            description: "MusicXML Files",
            accept: {
              "application/vnd.recordare.musicxml": [".xml", ".mxl", ".musicxml"],
            },
          },
        ],
        multiple: false,
      });

      this.fileHandle = handle;
      const file = await handle.getFile();
      await this.loadFileData(file);
      return true;
    } catch {
      return false;
    }
  }

  async loadFileData(file) {
    const data = await file.arrayBuffer();
    // Reset engine before loading new file data to ensure clean state
    this.#project.resetEngine();
    this.#engine.api?.load(new Uint8Array(data));
    this.#project.hasUnsavedChanges = false;
  }

  newFile() {
    if (this.#project.hasUnsavedChanges && !confirm("Discard unsaved changes?"))
      return;
    this.fileHandle = null;
    this.#engine.api?.tex("\\title 'Untitled' r");
    this.#project.hasUnsavedChanges = false;
  }

  async saveFile() {
    if (!this.#engine.api) return;
    const name = this.fileHandle?.name.toLowerCase() || "";

    if (this.fileHandle && (name.endsWith(".atex") || name.endsWith(".gp"))) {
      try {
        const data = this.#getExporter(name).export(
          this.#engine.api.score,
          this.#engine.api.settings,
        );
        const writable = await this.fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        this.#project.hasUnsavedChanges = false;
        return;
      } catch {
        this.fileHandle = null;
      }
    }
    this.exportFile(".atex");
  }

  exportFile(format) {
    if (!this.#engine.api) return;
    if (format === ".pdf") return this.#engine.api.print();

    const data = this.#getExporter(format).export(
      this.#engine.api.score,
      this.#engine.api.settings,
    );
    this.#project.hasUnsavedChanges = false;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data]));
    a.download = (this.#engine.api.score?.title || "Untitled") + format;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
