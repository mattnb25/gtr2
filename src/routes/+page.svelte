<script>
  import ScoreViewport from "$lib/components/ScoreViewport.svelte";
  import Toolbar from "$lib/components/Toolbar.svelte";
</script>

<svelte:head>
  <title>TabCanvas</title>
</svelte:head>

<div id="ui-container">
  <ScoreViewport></ScoreViewport>
  <Toolbar></Toolbar>
</div>

<style>
  #ui-container {
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }
</style>
