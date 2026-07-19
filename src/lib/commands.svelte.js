import { state } from "$lib/state.svelte.js";
import * as alphaTab from "@coderline/alphatab";

export const scoreCommands = {
  async tryFileApi(fallbackInput) {
    if ("showOpenFilePicker" in window) {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            accept: {
              "application/octet-stream": [
                ".gp",
                ".gp3",
                ".gp4",
                ".gp5",
                ".gpx",
                ".atex",
              ],
            },
          },
        ],
      });
      const file = await handle.getFile();
      state.fileHandle = handle;
      this.openFile(file);
      return;
    }
    fallbackInput.click();
  },

  async openFile(file) {
    const data = await file.arrayBuffer();
    state.api.load(new Uint8Array(data));
  },

  newFile() {
    state.fileHandle = null;
    state.api.tex("\\title 'Untitled'");
  },

  async saveFile() {
    if (!state.api) return;

    if (state.fileHandle) {
      const name = state.fileHandle.name.toLowerCase();
      if (!name.endsWith(".atex") && !name.endsWith(".gp")) {
        // fallback to normal export to prevent overwrite on files that are not supported (.atex or .gp)
        this.exportFile(".atex");
        return;
      }

      const exporter = state.fileHandle.name.endsWith(".gp")
        ? new alphaTab.exporter.Gp7Exporter()
        : new alphaTab.exporter.AlphaTexExporter();

      const data = exporter.export(state.api.score, state.api.settings);

      try {
        const writable = await state.fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        return;
      } catch (e) {
        state.fileHandle = null; // Reset if write fails
      }
    }
    this.export(".atex"); // Fallback if write fails
  },

  exportFile(format) {
    if (!state.api) return;
    if (format === ".pdf") return state.api.print();

    const exporter =
      format === ".gp"
        ? new alphaTab.exporter.Gp7Exporter()
        : new alphaTab.exporter.AlphaTexExporter();

    const data = exporter.export(state.api.score, state.api.settings);

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data]));
    a.download = (state.api.score.title || "Untitled") + format;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // Safe wrapper for mutating score metadata (title, artist, etc.)
  updateScore(callback) {
    if (!state.api?.score) return;
    callback(state.api.score);

    // Centralized side effects:
    state.api.render();
    state.hasUnsavedChanges = true;
  },

  updateSettings(callback) {
    if (!state.api?.settings) return;
    callback(state.api.settings);

    // Centralized side effects:
    state.api.updateSettings();
    state.api.render();
  },
};

export const ctrlCommands = {};
