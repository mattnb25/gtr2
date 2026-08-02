<script>
    import { project } from "$lib/core/index.svelte.js";

    let ed = $derived(project.editor);
</script>

<div class="controls-toolbar">
    <!-- Fret Numpad -->
    <div class="group numpad">
        {#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as digit}
            <button onclick={() => ed.setFretDigit(digit)}>{digit}</button>
        {/each}
    </div>

    <div class="divider"></div>

    <!-- Navigation & Selection Toggle -->
    <div class="group nav">
        <button onclick={() => ed.moveBeat(-1)} title="Previous Beat (Left Arrow)">◀</button>
        <button onclick={() => ed.moveString(-1)} title="String Up (Up Arrow)">▲ Str {ed.activeString}</button>
        <button onclick={() => ed.moveString(1)} title="String Down (Down Arrow)">▼</button>
        <button onclick={() => ed.moveBeat(1)} title="Next Beat (Right Arrow)">▶</button>
        <button
            class:active-sel={ed.isSelectMode}
            onclick={() => ed.toggleSelectMode()}
            title="Toggle Range Selection Mode (for Mobile)"
        >
            {ed.isSelectMode ? "Sel ✓" : "Sel"}
        </button>
    </div>

    <div class="divider"></div>

    <!-- Quick Actions & Clipboard -->
    <div class="group actions">
        <button onclick={() => ed.addBeat()} title="Insert Beat">+ Beat</button>
        <button onclick={() => ed.addBar()} title="Add Measure (Ctrl+B)">+ Bar</button>
        <button onclick={() => ed.copy()} title="Copy Beat (Ctrl+C)">Copy</button>
        <button onclick={() => ed.paste()} title="Paste Beat (Ctrl+V)">Paste</button>
        <button onclick={() => ed.cut()} title="Cut Beat (Ctrl+X)">Cut</button>
        <button onclick={() => ed.deleteNote()} title="Clear Note (Delete)">Clear</button>
    </div>
</div>

<style>
    .controls-toolbar {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
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

    .numpad button {
        min-width: 28px;
        padding: var(--spacing-xs);
        font-weight: bold;
    }

    .nav button,
    .actions button {
        padding: var(--spacing-xs) var(--spacing-sm);
    }

    button.active-sel {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
    }
</style>
