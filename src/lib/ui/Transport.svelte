<script>
    import { project } from "$lib/core/index.svelte.js";
    import SplitPopoverBtn from "$lib/assets/SplitPopoverBtn.svelte";
    import NumInput from "$lib/assets/numInput.svelte";

    let pb = $derived(project.playback);

    function formatTime(ms) {
        if (!ms || isNaN(ms) || ms < 0) return "00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function handleScrubInput(e) {
        const val = Number(e.target.value);
        pb.isSeeking = true;
        pb.currentTime = val;
    }

    function handleScrubChange(e) {
        const val = Number(e.target.value);
        pb.seek(val);
        pb.isSeeking = false;
    }
</script>

<div class="transport-bar">
    <div class="left-controls">
        <SplitPopoverBtn
            name="playback-options"
            label={pb.isPlaying ? "Pause" : "Play"}
            onclick={() => pb.toggle()}
        >
            <div class="header">Playback Options</div>

            <div class="checkbox-group">
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        checked={pb.isMetronomeActive}
                        onchange={(e) => pb.toggleMetronome(e.target.checked)}
                    />
                    Metronome
                </label>

                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        checked={pb.isCountInActive}
                        onchange={(e) => pb.toggleCountIn(e.target.checked)}
                    />
                    Count-In
                </label>
            </div>

            <hr class="divider" />

            <div class="option-section">
                <span class="option-label">Volume (%)</span>
                <NumInput
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(pb.metronomeVol * 100)}
                    callback={(val) => pb.setMetronomeVol(val / 100)}
                />
            </div>

            <hr class="divider" />

            <div class="option-section">
                <span class="option-label">Tempo Scale (%)</span>
                <NumInput
                    min={25}
                    max={200}
                    step={5}
                    value={Math.round(pb.playbackSpeed * 100)}
                    callback={(val) => pb.setPlaybackSpeed(val / 100)}
                />
            </div>
        </SplitPopoverBtn>
    </div>

    <!-- Scrubbable transport slider & time display -->
    <div class="scrubber-container">
        <span class="time-display">{formatTime(pb.currentTime)}</span>
        <input
            type="range"
            class="scrubber-slider"
            min="0"
            max={pb.endTime || 100}
            value={pb.currentTime}
            oninput={handleScrubInput}
            onchange={handleScrubChange}
        />
        <span class="time-display">{formatTime(pb.endTime)}</span>
    </div>
</div>

<style>
    .transport-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        background: #ffffff;
        border-top: 1px solid #e0e0e0;
        flex-shrink: 0;
    }

    .left-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }

    .scrubber-container {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-grow: 1;
    }

    .time-display {
        font-family: monospace;
        font-size: 1.2rem;
        color: #4b5563;
        min-width: 45px;
        text-align: center;
    }

    .scrubber-slider {
        flex-grow: 1;
        accent-color: #5a6ee0;
        cursor: pointer;
        height: 6px;
    }

    /* Popover styling */
    .checkbox-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 4px 6px;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.1rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        user-select: none;
    }

    .checkbox-label input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: #5a6ee0;
        cursor: pointer;
    }

    .option-section {
        padding: 4px 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .option-label {
        font-weight: 600;
        font-size: 1.1rem;
        color: #374151;
    }

    .divider {
        border: none;
        border-top: 1px solid #f3f4f6;
        margin: 6px 0;
    }
</style>
