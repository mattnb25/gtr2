import { project } from "$lib/state.svelte.js";
import * as alphaTab from "@coderline/alphatab";

export const scoreCommands = {
  async tryFileApi(fallbackInput) {
    if (
      project.hasUnsavedChanges &&
      !confirm("You have unsaved changes. Discard them and continue?")
    ) {
      return;
    }
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
      project.fileHandle = handle;
      this.openFile(file);
      return;
    }
    fallbackInput.click();
  },

  async openFile(file) {
    const data = await file.arrayBuffer();
    project.api.load(new Uint8Array(data));
  },

  newFile() {
    if (
      project.hasUnsavedChanges &&
      !confirm("Create new file and discard unsaved changes?")
    ) {
      return;
    }
    project.fileHandle = null;
    project.api.tex("\\title 'Untitled'");
  },

  async saveFile() {
    if (!project.api) return;

    if (project.fileHandle) {
      const name = project.fileHandle.name.toLowerCase();
      if (!name.endsWith(".atex") && !name.endsWith(".gp")) {
        // fallback to normal export to prevent overwrite on files that are not supported (.atex or .gp)
        this.exportFile(".atex");
        return;
      }

      const exporter = project.fileHandle.name.endsWith(".gp")
        ? new alphaTab.exporter.Gp7Exporter()
        : new alphaTab.exporter.AlphaTexExporter();

      const data = exporter.export(project.api.score, project.api.settings);

      try {
        const writable = await project.fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        project.hasUnsavedChanges = false;
        return;
      } catch (e) {
        project.fileHandle = null; // Reset if write fails
      }
    }
    this.export(".atex"); // Fallback if write fails
  },

  exportFile(format) {
    if (!project.api) return;
    if (format === ".pdf") return project.api.print();

    const exporter =
      format === ".gp"
        ? new alphaTab.exporter.Gp7Exporter()
        : new alphaTab.exporter.AlphaTexExporter();

    const data = exporter.export(project.api.score, project.api.settings);
    project.hasUnsavedChanges = false;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data]));
    a.download = (project.api.score.title || "Untitled") + format;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // Safe wrapper for mutating score metadata (title, artist, etc.)
  updateScore(callback) {
    if (!project.api?.score) return;
    callback(project.api.score);

    // Centralized side effects:
    project.api.render();
    project.hasUnsavedChanges = true;
  },

  updateSettings(callback) {
    if (!project.api?.settings) return;
    callback(project.api.settings);

    // Centralized side effects:
    project.api.updateSettings();
    project.api.render();
  },
};

export const ctrlCommands = {
  togglePlayback() {
    if (!project.api) return;
    project.api.playPause();
  },
};
