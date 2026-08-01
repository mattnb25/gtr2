<script>
  let { name, label = `${name} ▾`, children } = $props();
</script>

<button
  popovertarget={`menu-${name}`}
  class="popover-btn"
  style="anchor-name: --anchor-{name};"
>
  {label}
</button>

<div
  id={`menu-${name}`}
  popover="auto"
  class="popover-target"
  style="position-anchor: --anchor-{name};"
>
  <div class="popover-container">
    {@render children?.()}
  </div>
</div>

<style>
  .popover-btn {
    position: relative;
  }

  .popover-btn:active {
    color: var(--color-bg);
    background-color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }

  .popover-target {
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    min-width: 150px;
    margin: var(--spacing-sm);
    margin-left: 0;
    padding: var(--spacing-sm);
  }

  [popover]:popover-open {
    position-area: top span-right;
  }

  .popover-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  :global(.popover-target button) {
    border: none;
    border-radius: var(--radius-sm);
    background-color: transparent;
    display: block;
    width: 100%;
    text-align: left;
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  :global(.popover-target button:active) {
    color: var(--color-primary);
    background-color: var(--color-primary-alpha-10);
  }

  :global(.popover-target button:hover) {
    background: var(--color-bg-subtle);
  }
</style>
