<script>
  import { project } from "$lib/core/index.svelte.js";

  let ed = $derived(project.editor);
</script>

<div class="controls-toolbar">
  <div class="group nav">
    <button onclick={() => ed.moveBeat(-1)} title="Previous beat"
      >◀ Beat</button
    >
    <button onclick={() => ed.moveBeat(1)} title="Next beat">Beat ▶</button>
    <button onclick={() => ed.moveNote(-1)} title="Previous note">▲ Note</button
    >
    <button onclick={() => ed.moveNote(1)} title="Next note">▼ Note</button>
    <button
      onclick={() => ed.moveString(-1)}
      title="Move note to a lower string">◀ String</button
    >
    <button
      onclick={() => ed.moveString(1)}
      title="Move note to a higher string">String ▶</button
    >
  </div>

  <div class="divider"></div>

  <div class="group actions">
    <button onclick={() => ed.addNote()} title="Add note">+ Note</button>
    <button onclick={() => ed.changeFret(-1)} title="Lower pitch">- Fret</button
    >
    <button onclick={() => ed.changeFret(1)} title="Raise pitch">+ Fret</button>
    <button onclick={() => ed.deleteNote()} title="Delete selected note"
      >Delete</button
    >
    <button onclick={() => ed.addBeat()} title="Insert beat">+ Beat</button>
    <button onclick={() => ed.addBar()} title="Add measure">+ Bar</button>
    <button onclick={() => ed.copy()} title="Copy beat">Copy</button>
    <button onclick={() => ed.paste()} title="Paste beat">Paste</button>
  </div>
</div>

<style>
  .controls-toolbar {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .divider {
    width: 1px;
    height: 20px;
    background: var(--color-border);
    margin: 0 var(--spacing-xs);
  }

  .nav button,
  .actions button {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
</style>
