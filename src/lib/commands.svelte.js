import { editorState } from "$lib/state.svelte.js";

export const scoreCommands = {
  openFile(data) {
    editorState.currentFileSource = data;

    if (editorState.tabApi) {
      editorState.tabApi.load(data);
    }
  },

  newFile() {
    editorState.tabApi.tex("\\title 'Untitled'");
  },

  updateScore(key, value) {
    const score = editorState.tabApi?.score;
    if (!score) return;

    score[key] = value;
    editorState.tabApi.update();
  },
};
