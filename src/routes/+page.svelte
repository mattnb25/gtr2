<script>
  import Viewer from "$lib/ui/Viewer.svelte";
  import Toolbar from "$lib/ui/Toolbar.svelte";
  import Transport from "$lib/ui/Transport.svelte";
</script>

<svelte:head>
  <title>TabCanvas</title>
</svelte:head>

<div id="ui-container">
  <Viewer></Viewer>
  <Transport></Transport>
  <Toolbar></Toolbar>
</div>

<style>
  #ui-container {
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }
</style>
