import * as alphaTab from "@coderline/alphatab";

export const project = $state({
  api: null,
  fileHandle: null,
  hasUnsavedChanges: false,
});

export function initApi(canvasEl, settings) {
  if (!canvasEl) return;
  destroyApi();
  project.api = new alphaTab.AlphaTabApi(canvasEl, settings);
}

export function destroyApi() {
  project.api?.destroy();
  project.api = null;
}
