<script>
  import { onMount } from "svelte";
  import { storeWritable, getState, setState } from "./store.js";
  import { attachKeyboard } from "./lib/keyboard.js";
  import { syncSoundFont, loadSoundFontPref } from "./lib/soundfont.js";
  import Transport from "./components/Transport.svelte";
  import BottomPanel from "./components/BottomPanel.svelte";
  import ScoreArea from "./components/ScoreArea.svelte";

  let st = $storeWritable;
  $: st = $storeWritable;

  onMount(() => {
    const soundFont = loadSoundFontPref();
    setState({ soundFont });
    const detachKeyboard = attachKeyboard();
    return () => detachKeyboard();
  });

  $: if (st.api && !st.api._soundFontInited) {
    st.api._soundFontInited = true;
    syncSoundFont();
  }
</script>

<div id="app-root">
  <Transport />
  <ScoreArea />
  <BottomPanel />

  {#if st.warning}
    <div class="app-warning">{st.warning}</div>
  {/if}
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(body) {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  :global(button) { cursor: pointer; font-family: inherit; }

  #app-root {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    height: 100vh;
    overflow: hidden;
    background: #f5f5f5;
  }

  .app-warning {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: #fffbe6;
    border-top: 1px solid #e6c700;
    color: #7a6000;
    font-size: 12px;
    padding: 6px 12px;
    text-align: center;
    z-index: 200;
  }
</style>
