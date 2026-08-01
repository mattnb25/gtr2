<script>
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();
</script>

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
    --font-family-base:
      system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
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
  }

  :global(html) {
    font-family: var(--font-family-base);
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
    outline: 2px solid var(--color-primary);
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

  :global(.at-selection div) {
    /* Defines the color of the selection background */
    background: var(--color-primary-alpha-10);
  }

  :global(.at-cursor-beat) {
    /* Defines the beat cursor */
    background: var(--color-primary-alpha-50);
  }
</style>
