<script>
  import Viewer from "$lib/components/Viewer.svelte";
  import Toolbar from "$lib/components/Toolbar.svelte";
</script>

<svelte:head>
  <title>TabCanvas</title>
</svelte:head>

<div id="ui-container">
  <Viewer></Viewer>
  <Toolbar></Toolbar>
</div>

<style>
  #ui-container {
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }
</style>
