<script>
    import PopoverBtn from "$lib/assets/PopoverBtn.svelte";
    import NumInput from "$lib/assets/numInput.svelte";
    import { project } from "$lib/core/index.svelte.js";

    let fileInput;

    async function handleOpen() {
        if (!(await project.io.tryNativeFilePicker())) fileInput.click();
    }

    const scoreFields = [
        "title",
        "subTitle",
        "artist",
        "album",
        "words",
        "music",
        "copyright",
    ];
</script>

<PopoverBtn name="open">
    <div class="header">Guitar Pro/AlphaTex</div>
    <button onclick={handleOpen}>Open</button>
    <button onclick={() => project.io.newFile()}>New</button>
</PopoverBtn>

<input
    type="file"
    bind:this={fileInput}
    onchange={(e) => {
        if (e.target.files[0]) project.io.loadFileData(e.target.files[0]);
        e.target.value = "";
    }}
    accept=".gp,.gp3,.gp4,.gp5,.gpx,.atex"
    style="display: none;"
/>

<PopoverBtn name="save">
    <button onclick={() => project.io.saveFile()}>Save changes</button>
    <button onclick={() => project.io.exportFile(".pdf")}>Print</button>
    <button onclick={() => project.io.exportFile(".gp")}>Export .gp</button>
    <button onclick={() => project.io.exportFile(".atex")}>Export .atex</button>
</PopoverBtn>

<PopoverBtn name="details">
    {#each scoreFields as field}
        <label>
            {field.charAt(0).toUpperCase() + field.slice(1)}
            <input
                value={project.editor.score?.[field]}
                onchange={(e) =>
                    project.editor.updateScoreField(field, e.target.value)}
            />
        </label>
    {/each}
</PopoverBtn>

<PopoverBtn name="view">
    <div class="header">Zoom %</div>
    <NumInput
        min={50}
        max={200}
        step={10}
        value={Math.round((project.editor.settings?.display.scale ?? 1) * 100)}
        callback={(val) => {
            const zoomLevel = parseInt(val, 10) / 100;
            project.editor.updateSettingsField("display", "scale", zoomLevel);
        }}
    />
</PopoverBtn>
