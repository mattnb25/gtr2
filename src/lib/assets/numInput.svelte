<script>
    let { step = "0.1", value = $bindable(0), callback } = $props();
    let inputEl = $state();

    function syncValue() {
        value = inputEl.valueAsNumber;
        if (callback) callback(value);
    }
</script>

<div class="component-container">
    <button
        onclick={() => {
            inputEl.stepDown();
            syncValue();
        }}>-</button
    >

    <div class="input-container">
        <input
            bind:this={inputEl}
            type="number"
            min="0"
            {step}
            {value}
            onchange={syncValue}
        />
        <div class="formatted-display">{Math.round(value * 100)}%</div>
    </div>

    <button
        onclick={() => {
            inputEl.stepUp();
            syncValue();
        }}>+</button
    >
</div>

<style>
    .component-container {
        display: flex;
        align-items: center;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
    }

    .component-container * {
        text-align: center;
    }

    .input-container {
        display: inline-grid;
        border-left: 1px solid #e0e0e0;
        border-right: 1px solid #e0e0e0;
    }

    .input-container input,
    .formatted-display {
        grid-area: 1 / 1;
        padding: 4px 8px;
        font-size: 1.2rem;
        border-radius: 0;
    }

    .input-container input {
        opacity: 0;
    }

    .input-container input:focus {
        z-index: 2;
        opacity: 1;
        background: white;
    }

    .formatted-display {
        pointer-events: none;
    }
</style>
