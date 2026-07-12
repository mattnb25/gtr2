<script>
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
  :global(html) {
    font-family: "Arial", sans-serif;
    font-size: 62.5%;
  }
  :global(button) {
    cursor: pointer;
    transition: all 0.15s;
    text-transform: capitalize;
    padding: 4px 14px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: transparent;
  }

  :global(input) {
    transition: all 0.15s;
  }

  :global(label) {
    color: dimgray;
    text-transform: uppercase;
  }
</style>
