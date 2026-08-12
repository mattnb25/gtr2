<script>
  import { project } from "$lib/core/index.svelte.js";
  let ed = $derived(project.editor);
</script>

<!--
  Controls tab

  Hierarchy:
    Beat Nav   → moves the beat cursor (clears selection)
    String     → changes the selected note's string
    Note Nav   → cycles through notes in the beat
    Note Edit  → add / delete notes
    Insert     → inserts beats and bars
    Remove     → deletes beats and bars
    Selection  → multi-beat range for copy/paste
    Clipboard  → copy/paste selected beat(s)
-->

<div class="controls-toolbar">

  <!-- ── Beat Navigation ─────────────────────────────── -->
  <div class="group">
    <span class="group-label">Beat</span>
    <button onclick={() => ed.moveBeat(-1)} title="Prev Beat (←)">◀</button>
    <button onclick={() => ed.moveBeat(1)}  title="Next Beat (→)">▶</button>
  </div>

  <div class="divider"></div>

  <!-- ── String (selected note's string) ────────────── -->
  <div class="group">
    <span class="group-label">String</span>
    <button onclick={() => ed.moveString(-1)} disabled={!ed.hasActiveNote} title="Move note to higher string">▲</button>
    <button onclick={() => ed.moveString(1)}  disabled={!ed.hasActiveNote} title="Move note to lower string">▼</button>
    <span class="info" title="Current string">str {ed.activeString}</span>
  </div>

  <div class="divider"></div>

  <!-- ── Note Editing ────────────────────────────────── -->
  <div class="group">
    <span class="group-label">Note</span>
    <button onclick={() => ed.moveNote(-1)} disabled={!ed.beatNotes.length} title="Prev note in beat (↑)">▲</button>
    <button onclick={() => ed.moveNote(1)}  disabled={!ed.beatNotes.length} title="Next note in beat (↓)">▼</button>
    <button onclick={() => ed.changeFret(1)} disabled={!ed.hasActiveNote} title="Pitch up (+)">+</button>
    <button onclick={() => ed.changeFret(-1)} disabled={!ed.hasActiveNote} title="Pitch down (-)">-</button>
    <button onclick={() => ed.addNote()}     title="Add note and advance string (Enter)">+ Note</button>
    <button onclick={() => ed.deleteNote()}  disabled={!ed.hasActiveNote} title="Delete note (Del)">Del</button>
  </div>

  <div class="divider"></div>

  <!-- ── Beat & Bar Structure ────────────────────────── -->
  <div class="group">
    <span class="group-label">Insert</span>
    <button onclick={() => ed.addBeat()} title="Insert beat after current (Insert)">+ Beat</button>
    <button onclick={() => ed.addBar()}  title="Append bar">+ Bar</button>
  </div>

  <div class="divider"></div>

  <!-- ── Remove Structure ───────────────────────────── -->
  <div class="group">
    <span class="group-label">Remove</span>
    <button onclick={() => ed.deleteBeat()} title="Delete current beat (Ctrl+Del)">− Beat</button>
    <button onclick={() => ed.deleteBar()} title="Delete current bar (Ctrl+Backspace)">− Bar</button>
  </div>

  <div class="divider"></div>

  <!-- ── Multi-Beat Selection ────────────────────────── -->
  <!--  Anchor stays fixed; extend moves the active end.  -->
  <div class="group">
    <span class="group-label">Select</span>
    <button
      onclick={() => ed.extendSelection(-1)}
      title="Extend selection left"
    >◀ Sel</button>
    <button
      onclick={() => ed.extendSelection(1)}
      title="Extend selection right"
    >Sel ▶</button>
    {#if ed.hasSelection}
      <span class="sel-count">{ed.getSelectedBeats().length} beats</span>
      <button onclick={() => ed.clearSelection()} class="clear-btn">✕</button>
    {/if}
  </div>

  <div class="divider"></div>

  <!-- ── Clipboard ────────────────────────────────────── -->
  <div class="group">
    <span class="group-label">Clip</span>
    <button onclick={() => ed.copy()}  title="Copy selected beat(s) (Ctrl+C)">Copy</button>
    <button
      onclick={() => ed.paste()}
      disabled={!ed.clipboard?.length}
      title="Paste after cursor (Ctrl+V)"
    >Paste</button>
  </div>

</div>

<style>
  .controls-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-wrap: nowrap;
  }

  .group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .group-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    padding: 0 4px;
    white-space: nowrap;
  }

  .divider {
    width: 1px;
    height: 20px;
    background: var(--color-border);
    margin: 0 var(--spacing-xs);
    flex-shrink: 0;
  }

  .info {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    padding: 0 4px;
    font-variant-numeric: tabular-nums;
  }

  .sel-count {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-primary);
    padding: 0 4px;
    white-space: nowrap;
  }

  .clear-btn {
    padding: var(--spacing-xs) 6px;
    font-size: 0.75rem;
  }
</style>
