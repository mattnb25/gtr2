<script>
    import { project } from "$lib/core/index.svelte.js";
    import SplitPopoverBtn from "$lib/assets/SplitPopoverBtn.svelte";

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

            <!-- Metronome Section -->
            <div class="option-section">
                <div class="option-row">
                    <span class="option-label">Metronome</span>
                    <button
                        class="toggle-btn"
                        class:active={pb.isMetronomeActive}
                        onclick={() => pb.toggleMetronome()}
                    >
                        {pb.isMetronomeActive ? "ON" : "OFF"}
                    </button>
                </div>
                {#if pb.isMetronomeActive}
                    <div class="slider-row">
                        <span class="sub-label"
                            >Volume: {Math.round(
                                pb.metronomeVolume * 100,
                            )}%</span
                        >
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={pb.metronomeVolume}
                            oninput={(e) =>
                                pb.setMetronomeVolume(Number(e.target.value))}
                        />
                    </div>
                {/if}
            </div>

            <hr class="divider" />

            <!-- Count-In Section -->
            <div class="option-section">
                <div class="option-row">
                    <span class="option-label">Count-In</span>
                    <button
                        class="toggle-btn"
                        class:active={pb.isCountInActive}
                        onclick={() => pb.toggleCountIn()}
                    >
                        {pb.isCountInActive ? "ON" : "OFF"}
                    </button>
                </div>
                {#if pb.isCountInActive}
                    <div class="slider-row">
                        <span class="sub-label"
                            >Volume: {Math.round(pb.countInVolume * 100)}%</span
                        >
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={pb.countInVolume}
                            oninput={(e) =>
                                pb.setCountInVolume(Number(e.target.value))}
                        />
                    </div>
                {/if}
            </div>

            <hr class="divider" />

            <!-- Tempo Scale Section -->
            <div class="option-section">
                <div class="option-row">
                    <span class="option-label">Tempo Scale</span>
                    <span class="speed-val"
                        >{Math.round(pb.playbackSpeed * 100)}%</span
                    >
                </div>
                <div class="slider-row">
                    <input
                        type="range"
                        min="0.25"
                        max="2.0"
                        step="0.05"
                        value={pb.playbackSpeed}
                        oninput={(e) =>
                            pb.setPlaybackSpeed(Number(e.target.value))}
                    />
                </div>
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
    .option-section {
        padding: 4px 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .option-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
    }

    .option-label {
        font-weight: 600;
        font-size: 1.2rem;
        color: #374151;
    }

    .sub-label {
        font-size: 1.1rem;
        color: #6b7280;
    }

    .toggle-btn {
        padding: 2px 10px;
        font-size: 1.1rem;
        font-weight: 600;
        border-radius: 6px;
        border: 1px solid #d1d5db;
        background: #f9fafb;
        color: #4b5563;
    }

    .toggle-btn.active {
        background: #5a6ee0;
        color: #ffffff;
        border-color: #5a6ee0;
    }

    .slider-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .slider-row input[type="range"] {
        accent-color: #5a6ee0;
        cursor: pointer;
    }

    .divider {
        border: none;
        border-top: 1px solid #f3f4f6;
        margin: 4px 0;
    }

    .speed-val {
        font-family: monospace;
        font-weight: bold;
        font-size: 1.2rem;
        color: #5a6ee0;
    }
</style>
