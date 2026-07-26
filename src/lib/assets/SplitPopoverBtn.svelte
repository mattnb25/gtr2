<script>
  import PopoverBtn from "./PopoverBtn.svelte";

  let { name, label, children, onclick } = $props();
</script>

<div class="split-btn-group">
  <button class="main-btn" {onclick}>
    {label}
  </button>
  <PopoverBtn {name} label="▾">
    {@render children?.()}
  </PopoverBtn>
</div>

<style>
  .split-btn-group {
    display: inline-flex;
  }

  .main-btn {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
  }

  :global(.split-btn-group .popover-btn) {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    padding: 4px 8px;
  }
</style>
