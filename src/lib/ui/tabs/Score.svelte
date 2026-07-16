<script>
  import { scoreCommands } from "$lib/commands.svelte.js";
  import PopoverBtn from "$lib/reusables/PopoverBtn.svelte";
  import { state } from "$lib/state.svelte.js";

  let fileInput;
</script>

<PopoverBtn name="open">
  <div class="header">Guitar Pro/AlphaTex</div>
  <button onclick={() => scoreCommands.tryFileApi(fileInput)}>Open</button>
  <button onclick={() => scoreCommands.newFile()}>New</button>
</PopoverBtn>

<input
  type="file"
  bind:this={fileInput}
  onchange={(e) => {
    if (e.target.files[0]) scoreCommands.openFile(e.target.files[0]);
  }}
  accept=".gp,.gp3,.gp4,.gp5,.gpx,.atex"
  style="display: none;"
/>

<PopoverBtn name="save">
  <button onclick={() => scoreCommands.saveFile()}>Save</button>
  <button onclick={() => scoreCommands.exportFile(".pdf")}>Export .pdf</button>
  <button onclick={() => scoreCommands.exportFile(".gp")}>Export .gp</button>
  <button onclick={() => scoreCommands.exportFile(".atex")}>Export .atex</button
  >
</PopoverBtn>

<PopoverBtn name="info">
  <div class="info-form">
    <label>
      Title
      <input
        value={state.api?.score.title}
        onchange={(e) => {
          scoreCommands.updateScore((score) => (score.title = e.target.value));
        }}
      />
    </label>
    <label>
      Subtitle
      <input
        value={state.api?.score.subTitle}
        onchange={(e) => {
          scoreCommands.updateScore(
            (score) => (score.subTitle = e.target.value),
          );
        }}
      />
    </label>
    <label>
      Artist
      <input
        value={state.api?.score.artist}
        onchange={(e) => {
          scoreCommands.updateScore((score) => (score.artist = e.target.value));
        }}
      />
    </label>
    <label>
      Album
      <input
        value={state.api?.score.album}
        onchange={(e) => {
          scoreCommands.updateScore((score) => (score.album = e.target.value));
        }}
      />
    </label>
    <label>
      Words
      <input
        value={state.api?.score.words}
        onchange={(e) => {
          scoreCommands.updateScore((score) => (score.words = e.target.value));
        }}
      />
    </label>
    <label>
      Music
      <input
        value={state.api?.score.music}
        onchange={(e) => {
          scoreCommands.updateScore((score) => (score.music = e.target.value));
        }}
      />
    </label>
    <label>
      Copyright
      <input
        value={state.api?.score.copyright}
        onchange={(e) => {
          scoreCommands.updateScore(
            (score) => (score.copyright = e.target.value),
          );
        }}
      />
    </label>
  </div>
</PopoverBtn>

<PopoverBtn name="zoom">
  <input
    type="number"
    value={state.api?.settings?.display?.scale}
    onchange={(e) => {
      scoreCommands.updateSettings(
        (settings) => (settings.display.scale = Number(e.target.value)),
      );
    }}
  />
</PopoverBtn>

<PopoverBtn name="voice">
  <button>1</button>
  <button>2</button>
  <button>3</button>
  <button>4</button>
</PopoverBtn>

<style>
  .header {
    padding: 4px 8px;
    font-size: 1.2rem;
    color: dimgray;
    text-transform: uppercase;
  }

  .info-form {
    max-width: 280px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-form input {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin: 2px 0;
  }

  .info-form input:focus {
    outline: none;
    border-color: #5a6ee0;
  }
</style>
