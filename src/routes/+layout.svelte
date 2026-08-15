<script>
  import favicon from "$lib/assets/favicon.svg";
  import { project } from "$lib/core/index.svelte.js";

  let { children } = $props();
  let ed = $derived(project.editor);

  function handleKeydown(e) {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)) return;
    if (project.playback.isPlaying) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      ed.moveBeat(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      ed.moveBeat(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (e.shiftKey) {
        ed.moveString(-1);
      } else {
        ed.moveNote(-1);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (e.shiftKey) {
        ed.moveString(1);
      } else {
        ed.moveNote(1);
      }
    } else if (e.key === "[") {
      e.preventDefault();
      ed.moveString(-1);
    } else if (e.key === "]") {
      e.preventDefault();
      ed.moveString(1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      ed.addNote();
    } else if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      ed.changeFret(1);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      ed.changeFret(-1);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      ed.deleteNote();
    } else if (e.key === "Insert" || (e.ctrlKey && e.key === "a")) {
      e.preventDefault();
      ed.addBeat();
    } else if (e.ctrlKey && e.key === "Delete") {
      e.preventDefault();
      ed.deleteBeat();
    } else if (e.ctrlKey && e.key === "Backspace") {
      e.preventDefault();
      ed.deleteBar();
    } else if (e.ctrlKey && e.key === "b") {
      e.preventDefault();
      ed.addBar();
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      ed.copy();
    } else if (e.ctrlKey && e.key === "v") {
      e.preventDefault();
      ed.paste();
    } else if (e.ctrlKey && e.key === "x") {
      e.preventDefault();
      ed.cut();
    } else if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      project.history.undo();
    } else if (e.ctrlKey && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      project.history.redo();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
  :root {
    /* Color Palette */
    --color-primary: #5a6ee0;
    --color-primary-alpha-10: rgba(90, 110, 224, 0.1);
    --color-primary-alpha-50: rgba(90, 110, 224, 0.5);
    --color-bg: #ffffff;
    --color-bg-subtle: #f5f5f5;
    --color-border: #e0e0e0;
    --color-text-muted: dimgray;
    --color-text-dark: #000000;

    /* Typography */
    --font-family-base: "Edwin", Arial, sans-serif;
    --font-size-root: 62.5%;
    --font-size-header: 1.2rem;

    /* Spacing & Borders */
    --radius-sm: 4px;
    --radius-md: 8px;
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 14px;

    /* Transitions */
    --transition-fast: all 0.15s ease-in-out;
  }

  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    line-height: 1.5;
    font-family: var(--font-family-base);
  }

  :global(html) {
    font-size: var(--font-size-root);
  }

  :global(button) {
    cursor: pointer;
    transition: var(--transition-fast);
    padding: var(--spacing-xs) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: transparent;
    text-wrap: nowrap;
  }

  :global(button::first-letter) {
    text-transform: uppercase;
  }

  :global(button:focus-visible) {
    z-index: 1;
    outline: 1px solid var(--color-primary);
  }

  :global(button:focus:not(:focus-visible)) {
    outline: none;
  }

  :global(input) {
    width: 100%;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: var(--transition-fast);
  }

  :global(input:focus-visible) {
    outline: none;
    border-color: var(--color-primary);
  }

  :global(label) {
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  :global(.header) {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-header);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  :global(.at-selection),
  :global(.at-selection div) {
    display: none !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
</style>
