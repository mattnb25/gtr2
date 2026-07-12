<script>
  let { name, children } = $props();
</script>

<button
  popovertarget={`menu-${name}`}
  class="dropdown-btn"
  style="anchor-name: --anchor-{name};"
>
  {name} ▾
</button>

<div
  id={`menu-${name}`}
  popover="auto"
  class="dropdown-menu"
  style="position-anchor: --anchor-{name};"
>
  {@render children?.()}
</div>

<style>
  .dropdown-btn {
    position: relative;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 4px 14px;
    cursor: pointer;
  }

  .dropdown-menu {
    border-radius: 4px;
    border: 1px solid #e0e0e0;
    min-width: 150px;
    margin: 0;
    padding: 4px;
  }

  [popover]:popover-open {
    position-area: top span-right;
  }

  :global(.dropdown-menu > button) {
    border: none;
    border-radius: 4px;
    background-color: transparent;
    display: block;
    width: 100%;
    text-align: left;
    padding: 4px 8px;
  }
</style>
