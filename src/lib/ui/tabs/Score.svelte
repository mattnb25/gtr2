<script>
  import { scoreCommands } from "$lib/commands.svelte.js";
  import PopoverBtn from "$lib/reusables/PopoverBtn.svelte";

  let fileInput;
</script>

<PopoverBtn name="open">
  <div class="header">Guitar Pro/AlphaTex</div>
  <button onclick={() => fileInput.click()}>Open</button>
  <button onclick={() => scoreCommands.newFile()}>New</button>
</PopoverBtn>

<input
  type="file"
  bind:this={fileInput}
  onchange={(e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) =>
      scoreCommands.openFile(new Uint8Array(e.target.result));
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Reset input to allow re-opening same file
  }}
  accept=".gp,.gp3,.gp4,.gp5,.gpx,.atex"
  style="display: none;"
/>

<PopoverBtn label="save"></PopoverBtn>
<PopoverBtn label="info"></PopoverBtn>
<PopoverBtn label="play"></PopoverBtn>
<PopoverBtn label="zoom"></PopoverBtn>
<PopoverBtn label="voice"></PopoverBtn>

<style>
  .header {
    padding: 4px 8px;
    font-size: 1.2rem;
    text-transform: uppercase;
    color: dimgray;
  }
</style>
