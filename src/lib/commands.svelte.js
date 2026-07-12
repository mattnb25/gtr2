// gtr2\src\lib\commands.svelte.js
import { editorState } from "$lib/state.svelte.js";
import * as alphaTab from "@coderline/alphatab";

const EXTENSIONS = [".gp", ".gp3", ".gp4", ".gp5", ".gpx", ".atex"];

export const scoreCommands = {
  async tryFileApi(fallbackInput) {
    if ("showOpenFilePicker" in window) {
      const [handle] = await window.showOpenFilePicker({
        types: [{ accept: { "application/octet-stream": EXTENSIONS } }],
      });
      const file = await handle.getFile();
      editorState.fileHandle = handle;
      this.openFile(file);
      return;
    }
    fallbackInput.click();
  },

  async openFile(file) {
    const data = await file.arrayBuffer();
    editorState.tabApi?.load(new Uint8Array(data));
  },

  newFile() {
    editorState.fileHandle = null;
    editorState.tabApi?.tex("\\title 'Untitled'");
  },

  async saveFile() {
    if (!editorState.tabApi) return;

    if (editorState.fileHandle) {
      const name = editorState.fileHandle.name.toLowerCase();
      if (!name.endsWith(".atex") && !name.endsWith(".gp")) {
        // fallback to normal export to prevent overwrite on files that are not supported (.atex or .gp)
        this.exportFile(".atex");
        return;
      }

      const exporter = editorState.fileHandle.name.endsWith(".gp")
        ? new alphaTab.exporter.Gp7Exporter()
        : new alphaTab.exporter.AlphaTexExporter();

      const data = exporter.export(
        editorState.tabApi.score,
        editorState.tabApi.settings,
      );

      try {
        const writable = await editorState.fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        return;
      } catch (e) {
        editorState.fileHandle = null; // Reset if write fails
      }
    }
    this.export(".atex"); // Fallback if write fails
  },

  exportFile(format) {
    if (!editorState.tabApi) return;
    if (format === ".pdf") return editorState.tabApi.print();

    const exporter =
      format === ".gp"
        ? new alphaTab.exporter.Gp7Exporter()
        : new alphaTab.exporter.AlphaTexExporter();

    const data = exporter.export(
      editorState.tabApi.score,
      editorState.tabApi.settings,
    );

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data]));
    a.download = (editorState.tabApi.score.title || "Untitled") + format;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  updateScore(key, value) {
    const score = editorState.tabApi?.score;
    if (!score) return;
    score[key] = value;
    editorState.tabApi.render();
  },

  getScoreDetails(key) {
    return editorState.tabApi?.score[key] || null;
  },

  zoom() {
    if (!editorState.tabApi) return;

    // Calculate new zoom level
    const newZoom = Math.max(
      0.25,
      Math.min(2.0, editorState.tabApi.settings.display.scale + delta),
    );

    // Apply to API settings
    editorState.tabApi.settings.display.scale = newZoom;

    // Update API to re-render score at new scale
    editorState.tabApi.update();
  },
};
