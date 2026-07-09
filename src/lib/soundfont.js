import { getState, setState } from "../store.js";

const base = import.meta.env.BASE_URL ?? "/";

export const SOUND_FONTS = [
  { id: "sonivox", label: "Sonivox GM" },
];

const STORAGE_KEY = "fretwork:soundFont";

export function loadSoundFontPref() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (SOUND_FONTS.some(f => f.id === v)) return v;
  } catch {}
  return "sonivox";
}

export function saveSoundFontPref(id) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
}

const SONIVOX_URL = `${base}soundfont/sonivox.sf3`;
const CLASSICAL_URL = `${base}soundfont/classical_guitar.sf2`;
const FALLBACK_CDN = `https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.3/dist/soundfont/sonivox.sf3`;

const cache = new Map();

function fetchBytes(url) {
  if (!cache.has(url)) {
    const p = fetch(url).then(async r => {
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return new Uint8Array(await r.arrayBuffer());
    }).catch(err => {
      cache.delete(url);
      throw err;
    });
    cache.set(url, p);
  }
  return cache.get(url);
}

let _applied = null;
let _gen = 0;

export function setSoundFont(id) {
  saveSoundFontPref(id);
  setState({ soundFont: id });
  syncSoundFont();
}

export async function syncSoundFont() {
  const { api, soundFont } = getState();
  if (!api) return;
  if (_applied?.api === api && _applied?.id === soundFont) return;
  const gen = ++_gen;

  let bytes;
  try {
    bytes = await fetchBytes(SONIVOX_URL).catch(() => fetchBytes(FALLBACK_CDN));
  } catch (err) {
    if (gen === _gen) {
      setState({ warning: "Couldn't load soundfont — playback may be silent." });
    }
    return;
  }

  if (gen !== _gen) return;
  const now = getState();
  if (now.api !== api) return;

  api.loadSoundFont(bytes, false);
  _applied = { api, id: soundFont };
  setState({ warning: null });
}
