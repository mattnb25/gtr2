<script>
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
  @font-face {
    font-family: "Edwin";
    src: url("/fonts/edwin.woff2") format("woff2");
    font-display: swap;
  }
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
</style>
