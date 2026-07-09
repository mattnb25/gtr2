# Fretwork

A Guitar Pro tab editor/player built in Svelte 5 + alphaTab. Clone of bubiche.github.io/fretwork/ with full editing, undo/redo, and export.

## Run & Operate

- Install dependencies: `npm install`
- Run dev server: `npm run dev`
- Build for production: `npm run build`

The app is a single-page Vite app served at `/`.

## Stack

- pnpm workspaces, Node.js 24, Svelte 5 (no TypeScript)
- alphaTab v1.8.3 (`@coderline/alphatab`, `@coderline/alphatab-vite`)
- `optimizeDeps.exclude: ["@coderline/alphatab"]` — required to fix Bravura font loading in Vite

This project aims to follow the AlphaTex/AlphaTab document structure and metadata conventions described at https://alphatab.net/docs/alphatex/document-structure (Language Reference, Structural Metadata, Score Metadata, Staff metadata, Bar Metadata, Beat Properties, Note Properties). Exports support AlphaTex and GP7 via the in-app export menu.

## Where things live

- `artifacts/fretwork/src/store.js` — module-level `_state` + Svelte writable for UI reactivity
- `artifacts/fretwork/src/lib/selection.js` — BeatRef {trackIndex, staffIndex, voiceIndex, barIndex, beatIndex} + navigation
- `artifacts/fretwork/src/lib/commandStack.js` — CommandStack (undo/redo, 200-entry cap)
- `artifacts/fretwork/src/lib/historyRouter.js` — execute/undo/redo dispatchers + MIDI regen debounce
- `artifacts/fretwork/src/lib/scoreMutator.js` — thin mutator over alphaTab Score model
- `artifacts/fretwork/src/lib/commands/index.js` — all commands (fret, duration, effects, bend, whammy, tremolo, etc.)
- `artifacts/fretwork/src/lib/atManager.js` — alphaTab API init + export (GP7 + AlphaTex)
- `artifacts/fretwork/src/lib/soundfont.js` — soundfont fetch with CDN fallback
- `artifacts/fretwork/src/lib/fileStore.js` — IndexedDB file storage (metadata in localStorage)
- `artifacts/fretwork/src/lib/keyboard.js` — keyboard handler (arrows, digits, shortcuts)
- `artifacts/fretwork/public/soundfont/` — sonivox.sf3 (primary), sonivox.sf2 (backup)
- `artifacts/fretwork/public/font/` — Bravura music font

## Architecture decisions

- **BeatRef model**: selection is a plain object `{trackIndex, staffIndex, voiceIndex, barIndex, beatIndex}` + separate `selectedString` (1-based). Both live in the shared store.
- **Command pattern**: every edit is a Command with `apply(score)` + `undo(score)`. Commands with `relayout: 'voice'|'score'` call `score.finish(settings)` in `afterMutation` before `render()`.
- **Multi-digit fret amend**: 500ms window, same-target check, peekTop identity guard. Typing `1` then `2` within 500ms on the same string → fret 12 (one undo entry).
- **Capture-once pattern**: commands snapshot prior state on first `apply()` only (guarded by `!this._captured`). Re-execution from redo or amend window re-applies without re-snapshotting.
- **Tie command special case**: tie is apply-only (undo restores fret/octave/tone + nulls `tieOrigin` to prevent finish() re-clobbering).
- **Export**: GP7 via `Gp7Exporter`, AlphaTex via `AlphaTexExporter` — both available in the export menu.
- **File storage**: IndexedDB for binary bytes (unlimited size), localStorage for metadata list.
- **alphaTab Vite plugin**: `optimizeDeps.exclude: ["@coderline/alphatab"]` is required — without it the plugin transforms the module in a way that breaks Bravura font loading.

## Product

Guitar tab editor with:
- Full standard notation + tablature rendering
- Click-to-select beats, arrow key navigation (←→ beats, ↑↓ strings, Alt+↑↓ move note)
- 0–9 keyboard for fret entry (multi-digit within 500ms window)
- Duration control: Whole/Half/1/4/1/8/1/16/1/32 + dotted (. key, −/+ steps)
- Dynamics: ppp/pp/p/mp/mf/f/ff/fff per beat
- Articulation: palm mute, ghost, dead note, vibrato (cycles None/Slight/Wide), tap
- Pitch: let ring, hammer-on/pull-off, tie
- Slide in/out (7 slide-out types, 3 slide-in types)
- Bend: 5 presets (bend, bend-release, pre-bend, pre-bend-release, vibrato bend)
- Whammy bar: 4 presets (dive, dip, pre-dive, pre-dive+dive)
- Tremolo: 1/8, 1/16, 1/32
- Harmonics: natural, pinch, tap, semi
- Grace notes: before beat / on beat
- Time signature, key signature, tempo per bar
- Insert/delete measures
- Undo/redo (200-entry stack, Ctrl+Z/Y)
- Copy/cut/paste (Ctrl+C/X/V, range selection with Shift+arrow)
- Export: Guitar Pro (.gp) or AlphaTex (.alphatex)
- File library: import .gp* files, stored in IndexedDB

## Gotchas

- `noteMouseDown` event does NOT exist in alphaTab — only `beatMouseDown` fires. String selection is done via ↑↓ keys after clicking a beat.
- `relayout: 'voice'` commands must call `score.finish(settings)` before `render()` — alphaTab does NOT auto-finish on render.
- `score.finish()` re-clobbers tie destinations' fret via `tieOrigin`. Undo must null `tieOrigin` explicitly.
- Do NOT use `api.player` to check player readiness — just check `api` is non-null.
- `enableUserInteraction: false` does NOT suppress `beatMouseDown` events.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
