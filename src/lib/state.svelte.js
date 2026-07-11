import * as alphaTab from "@coderline/alphatab";

export const editorState = $state({
  tabApi: null,
  currentFileSource: null,
  hasUnsavedChanges: false,
  isLoading: false,
  selectedTrack: 0,
  zoom: 1,
});

export function initApi(canvasEl) {
  if (!canvasEl) return;

  destroyApi();

  editorState.tabApi = new alphaTab.AlphaTabApi(canvasEl, {
    enableLazyLoading: true,
    core: {
      fontDirectory: "/font/",
      includeNoteBounds: true,
    },
    player: {
      soundFont: "/soundfont/sonivox.sf3",
      enablePlayer: true,
    },
    display: {
      effectBandPaddingBottom: 8,
      firstNotationStaffPaddingTop: 4,
    },
  });
}

export function destroyApi() {
  editorState.tabApi?.destroy();
  editorState.tabApi = null;
}

export function openFile(path) {
  editorState.currentFileSource = path;

  if (editorState.tabApi) {
    editorState.tabApi.load(path);
  }
}
