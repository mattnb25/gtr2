<script>
  import PopoverBtn from "$lib/assets/PopoverBtn.svelte";
  import NumInput from "$lib/assets/numInput.svelte";
  import { project } from "$lib/project.svelte.js";

  let fileInput;
</script>

<PopoverBtn name="open">
  <div class="header">Guitar Pro/AlphaTex</div>
  <button onclick={() => project.tryFileApi(fileInput)}>Open</button>
  <button onclick={() => project.newFile()}>New</button>
</PopoverBtn>

<input
  type="file"
  bind:this={fileInput}
  onchange={(e) => {
    if (e.target.files[0]) project.openFile(e.target.files[0]);
  }}
  accept=".gp,.gp3,.gp4,.gp5,.gpx,.atex"
  style="display: none;"
/>

<PopoverBtn name="save">
  <button onclick={() => project.saveFile()}>Save changes</button>
  <button onclick={() => project.exportFile(".pdf")}>Print</button>
  <button onclick={() => project.exportFile(".gp")}>Export .gp</button>
  <button onclick={() => project.exportFile(".atex")}>Export .atex</button>
</PopoverBtn>

<PopoverBtn name="details">
  <label>
    Title
    <input
      value={project.api?.score.title}
      onchange={(e) => {
        project.updateScore((score) => (score.title = e.target.value));
      }}
    />
  </label>
  <label>
    Subtitle
    <input
      value={project.api?.score.subTitle}
      onchange={(e) => {
        project.updateScore((score) => (score.subTitle = e.target.value));
      }}
    />
  </label>
  <label>
    Artist
    <input
      value={project.api?.score.artist}
      onchange={(e) => {
        project.updateScore((score) => (score.artist = e.target.value));
      }}
    />
  </label>
  <label>
    Album
    <input
      value={project.api?.score.album}
      onchange={(e) => {
        project.updateScore((score) => (score.album = e.target.value));
      }}
    />
  </label>
  <label>
    Words
    <input
      value={project.api?.score.words}
      onchange={(e) => {
        project.updateScore((score) => (score.words = e.target.value));
      }}
    />
  </label>
  <label>
    Music
    <input
      value={project.api?.score.music}
      onchange={(e) => {
        project.updateScore((score) => (score.music = e.target.value));
      }}
    />
  </label>
  <label>
    Copyright
    <input
      value={project.api?.score.copyright}
      onchange={(e) => {
        project.updateScore((score) => (score.copyright = e.target.value));
      }}
    />
  </label>
</PopoverBtn>

<PopoverBtn name="view">
  <div class="header">Zoom</div>
  <NumInput
    step="0.1"
    value={project.api?.settings?.display?.scale}
    callback={(value) => {
      project.updateSettings((settings) => (settings.display.scale = value));
    }}
  />
  <div class="header">View</div>
</PopoverBtn>
