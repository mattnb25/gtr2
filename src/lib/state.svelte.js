import * as alphaTab from "@coderline/alphatab";

export const editorState = $state({
  tabApi: null,
  fileHandle: null,
  hasUnsavedChanges: false,
});

export function initApi(canvasEl, settings) {
  if (!canvasEl) return;
  destroyApi();
  editorState.tabApi = new alphaTab.AlphaTabApi(canvasEl, settings);
}

export function destroyApi() {
  editorState.tabApi?.destroy();
  editorState.tabApi = null;
}
