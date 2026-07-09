import * as alphaTab from "@coderline/alphatab";

let _api = null;
const base = import.meta.env.BASE_URL ?? "/";

export function getApi() { return _api; }

export function initAlphaTab(container, scrollContainer, callbacks = {}) {
  if (_api) { try { _api.destroy(); } catch {} _api = null; }

  _api = new alphaTab.AlphaTabApi(container, {
    core: {
      fontDirectory: `${base}font/`,
      includeNoteBounds: true,
      logLevel: alphaTab.LogLevel.Warning,
    },
    player: {
      enablePlayer: true,
      enableCursor: false,
      enableUserInteraction: false,
      scrollElement: scrollContainer,
    },
  });

  _api.playerStateChanged.on((args) => {
    callbacks.onStateChanged?.(args.state === alphaTab.synth.PlayerState.Playing);
  });
  _api.scoreLoaded.on((score) => { callbacks.onScoreLoaded?.(score); });
  _api.beatMouseDown.on((beat) => { callbacks.onBeatMouseDown?.(beat); });
  _api.noteMouseDown.on((note) => { callbacks.onNoteMouseDown?.(note); });
  _api.midiLoaded.on(() => { callbacks.onMidiLoaded?.(); });
  _api.error.on((e) => { callbacks.onError?.(e); console.error("[alphaTab]", e); });

  return _api;
}

export function destroyAlphaTab() {
  if (_api) { try { _api.destroy(); } catch {} _api = null; }
}

export function loadSoundFont(api, url) {
  if (!api) return;
  fetch(url).then(r => r.arrayBuffer()).then(buf => {
    api.loadSoundFont(new Uint8Array(buf), false);
  }).catch(err => console.warn("[soundfont] failed to load:", url, err));
}

export function newEmptyScore(api) {
  if (!api) return;
  api.tex(`\\title "Untitled"\n\\artist ""\n\\tempo 120\n.\n:4 0.1 0.2 0.3 0.4 |`, [0]);
}

export function exportScore(api, format = "gp") {
  if (!api?.score) return null;
  try {
    if (format === "alphatex") {
      const exp = new alphaTab.exporter.AlphaTexExporter();
      const tex = exp.export(api.score, api.settings);
      return { bytes: new TextEncoder().encode(tex), ext: "alphatex", mime: "text/plain" };
    }
    const exp = new alphaTab.exporter.Gp7Exporter();
    const bytes = exp.export(api.score, api.settings);
    return { bytes, ext: "gp", mime: "application/octet-stream" };
  } catch (e) {
    console.error("[export]", e);
    return null;
  }
}
