<script>
    import { project } from "$lib/core/index.svelte.js";
    import SplitPopoverBtn from "$lib/assets/SplitPopoverBtn.svelte";
    import NumInput from "$lib/assets/numInput.svelte";

    let pb = $derived(project.playback);

    let isHovering = $state(false);
    let hoverRatio = $state(0);

    function formatTime(ms) {
        if (!ms || isNaN(ms) || ms < 0) return "00:00";
        const totalSec = Math.floor(ms / 1000);
        const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
        const s = String(totalSec % 60).padStart(2, "0");
        return `${m}:${s}`;
    }

    // Active time: hovered time on hover, current time when scrubbing or playing
    let activeTime = $derived(
        isHovering && !pb.isSeeking
            ? hoverRatio * (pb.endTime || 0)
            : pb.currentTime
    );

    // Active position % for tooltip location
    let activePercent = $derived(
        isHovering && !pb.isSeeking
            ? hoverRatio * 100
            : pb.endTime ? (pb.currentTime / pb.endTime) * 100 : 0
    );

    let bar = $derived(
        project.engine.api?.tickCache?.findMasterBar?.(activeTime)?.number ??
        Math.floor((activeTime / (pb.endTime || 1)) * (project.editor.score?.masterBars?.length || 1)) + 1
    );

    function handlePointerMove(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width > 0) {
            hoverRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        }
    }
</script>

<div class="transport-bar">
    <SplitPopoverBtn
        name="playback-options"
        label={pb.isPlaying ? "Pause" : "Play"}
        onclick={() => pb.toggle()}
    >
        <div class="header">Playback</div>
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

        <div class="header">Tempo Scale (%)</div>
        <div class="option-section">
            <NumInput
                min={25}
                max={200}
                step={5}
                value={Math.round(pb.playbackSpeed * 100)}
                callback={(val) => pb.setPlaybackSpeed(val / 100)}
            />
        </div>

        <hr class="divider" />

        <div class="header">Volume (%)</div>
        <div class="option-section">
            <NumInput
                min={0}
                max={100}
                step={5}
                value={Math.round(pb.metronomeVol * 100)}
                callback={(val) => pb.setMetronomeVol(val / 100)}
            />
        </div>
    </SplitPopoverBtn>

    <!-- Scrubber transport slider with desktop hover & mobile touch tooltip -->
    <div
        class="scrubber-container"
        class:show-tooltip={isHovering || pb.isSeeking}
        onpointerenter={() => (isHovering = true)}
        onpointerleave={() => (isHovering = false)}
        onpointermove={handlePointerMove}
        ontouchstart={() => (isHovering = true)}
        ontouchend={() => (isHovering = false)}
    >
        <div class="tooltip" style="left: clamp(36px, {activePercent}%, calc(100% - 36px));">
            Bar {bar} &bull; {formatTime(activeTime)}
        </div>
        <input
            type="range"
            class="scrubber-slider"
            min="0"
            max={pb.endTime || 100}
            value={pb.currentTime}
            oninput={(e) => {
                pb.isSeeking = true;
                pb.currentTime = Number(e.target.value);
            }}
            onchange={(e) => {
                pb.seek(Number(e.target.value));
                pb.isSeeking = false;
            }}
        />
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
        overflow: visible;
    }

    .scrubber-container {
        position: relative;
        display: flex;
        align-items: center;
        flex-grow: 1;
        min-height: 36px;
    }

    .tooltip {
        position: absolute;
        bottom: calc(100% + 2px);
        transform: translateX(-50%);
        padding: 4px 10px;
        background: #1e293b;
        color: #ffffff;
        font-size: 0.85rem;
        font-weight: 600;
        border-radius: 6px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 100;
        opacity: 0;
        transition: opacity 0.15s ease-in-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    /* Show tooltip on hover, touch, seeking, or focus */
    .scrubber-container:hover .tooltip,
    .scrubber-container:focus-within .tooltip,
    .scrubber-container:active .tooltip,
    .scrubber-container.show-tooltip .tooltip {
        opacity: 1;
    }

    .tooltip::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px;
        border-style: solid;
        border-color: #1e293b transparent transparent transparent;
    }

    .scrubber-slider {
        width: 100%;
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

    .divider {
        border: none;
        border-top: 1px solid #f3f4f6;
        margin: 6px 0;
    }
</style>
