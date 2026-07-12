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
  }
</style>
