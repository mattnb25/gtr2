<script>
  let { name, children } = $props();
</script>

<button
  popovertarget={`menu-${name}`}
  class="popover-btn"
  style="anchor-name: --anchor-{name};"
>
  {name} ▾
</button>

<div
  id={`menu-${name}`}
  popover="auto"
  class="popover-menu"
  style="position-anchor: --anchor-{name};"
>
  {@render children?.()}
</div>

<style>
  .popover-btn {
    position: relative;
  }

  .popover-btn:active {
    color: white;
    background-color: #5a6ee0;
    border: 1px solid #5a6ee0;
  }

  .popover-menu {
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    min-width: 150px;
    margin: 0;
    margin-bottom: 8px;
    padding: 8px 8px;
  }

  [popover]:popover-open {
    position-area: top span-right;
  }

  :global(.popover-menu > button) {
    border: none;
    border-radius: 4px;
    background-color: transparent;
    display: block;
    width: 100%;
    text-align: left;
    padding: 4px 8px;
  }
  :global(.popover-menu > button:active) {
    color: #5a6ee0;
    background-color: #eef0fd;
  }
</style>
