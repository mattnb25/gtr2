import * as alphaTab from "@coderline/alphatab";

export const state = $state({
  api: null,
  fileHandle: null,
  hasUnsavedChanges: false,
});

export function initApi(canvasEl, settings) {
  if (!canvasEl) return;
  destroyApi();
  state.api = new alphaTab.AlphaTabApi(canvasEl, settings);
}

export function destroyApi() {
  state.api?.destroy();
  state.api = null;
}
