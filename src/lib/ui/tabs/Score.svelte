<script>
    import PopoverBtn from "$lib/assets/PopoverBtn.svelte";
    import NumInput from "$lib/assets/NumInput.svelte";
    import Switch from "$lib/assets/Switch.svelte";
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

    const barCount = $derived(project.editor.score?.masterBars?.length ?? 1);
</script>

<PopoverBtn name="open">
    <div class="header">Guitar Pro / AlphaTex / MusicXML</div>
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
    accept=".gp,.gp3,.gp4,.gp5,.gpx,.atex,.xml,.mxl,.musicxml"
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
    <Switch
        label="Horizontal Layout"
        checked={project.editor.settings?.display.layoutMode === 1}
        onchange={(e) => {
            const mode = e.target.checked ? 1 : 0;
            project.editor.updateSettingsField("display", "layoutMode", mode);
        }}
    />
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

<PopoverBtn name="trainer">
    <div class="header">Loop Trainer</div>
    <Switch
        label="Loop playback"
        checked={project.playback.isLooping}
        onchange={(e) => project.playback.toggleLoop(e.target.checked)}
    />
    <div class="header">Start bar</div>
    <NumInput
        min={1}
        max={barCount}
        step={1}
        value={project.playback.loopStartBar}
        callback={(val) => project.playback.setLoop(val, project.playback.loopEndBar)}
    />
    <div class="header">End bar</div>
    <NumInput
        min={1}
        max={barCount}
        step={1}
        value={project.playback.loopEndBar}
        callback={(val) => project.playback.setLoop(project.playback.loopStartBar, val)}
    />
    <button onclick={() => project.playback.toggleLoop(false)}>Clear loop</button>
</PopoverBtn>

<button
    disabled={!project.history.canUndo}
    onclick={() => project.history.undo()}>Undo</button
>
<button
    disabled={!project.history.canRedo}
    onclick={() => project.history.redo()}>Redo</button
>
