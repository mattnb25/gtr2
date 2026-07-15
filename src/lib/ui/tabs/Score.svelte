<script>
  import { scoreCommands } from "$lib/commands.svelte.js";
  import PopoverBtn from "$lib/reusables/PopoverBtn.svelte";

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
        value={scoreCommands.getScoreDetails("title")}
        onchange={(e) => scoreCommands.updateScore("title", e.target.value)}
      />
    </label>
    <label>
      Subtitle
      <input
        value={scoreCommands.getScoreDetails("subTitle")}
        onchange={(e) => scoreCommands.updateScore("subTitle", e.target.value)}
      />
    </label>
    <label>
      Artist
      <input
        value={scoreCommands.getScoreDetails("artist")}
        onchange={(e) => scoreCommands.updateScore("artist", e.target.value)}
      />
    </label>
    <label>
      Album
      <input
        value={scoreCommands.getScoreDetails("album")}
        onchange={(e) => scoreCommands.updateScore("album", e.target.value)}
      />
    </label>
    <label>
      Words
      <input
        value={scoreCommands.getScoreDetails("words")}
        onchange={(e) => scoreCommands.updateScore("words", e.target.value)}
      />
    </label>
    <label>
      Music
      <input
        value={scoreCommands.getScoreDetails("music")}
        onchange={(e) => scoreCommands.updateScore("music", e.target.value)}
      />
    </label>
    <label>
      Copyright
      <input
        value={scoreCommands.getScoreDetails("copyright")}
        onchange={(e) => scoreCommands.updateScore("copyright", e.target.value)}
      />
    </label>
  </div>
</PopoverBtn>

<PopoverBtn name="zoom">
  <button>25%</button>
  <button>50%</button>
  <button>75%</button>
  <button>100%</button>
  <button>125%</button>
  <button>150%</button>
  <button>175%</button>
  <button>200%</button>
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
