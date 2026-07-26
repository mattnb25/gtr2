<script>
    let {
        min = 0,
        max = 100,
        step = 1,
        value = $bindable(0),
        callback,
    } = $props();
    let inputEl = $state();

    function syncValue() {
        let newVal = parseInt(inputEl.value, 10);
        // if (isNaN(newVal) || newVal === undefined) newVal = 0;
        // if (newVal < min) newVal = Number(min);
        // if (newVal > max) newVal = Number(max);
        value = newVal;
        if (callback) callback(value);
    }
</script>

<div class="component-container">
    <button
        type="button"
        onclick={() => {
            inputEl.stepDown();
            syncValue();
        }}>-</button
    >

    <input
        bind:this={inputEl}
        type="number"
        {min}
        {max}
        {step}
        {value}
        onchange={syncValue}
    />

    <button
        type="button"
        onclick={() => {
            inputEl.stepUp();
            syncValue();
        }}>+</button
    >
</div>

<style>
    .component-container {
        display: flex;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
    }

    .component-container button {
        padding: 4px 10px;
        font-size: 1.2rem;
        background: transparent;
        border: none;
        cursor: pointer;
    }

    .component-container button:hover {
        background: #f0f0f0;
    }

    input {
        border-radius: 0;
        border: none;
        border-left: 1px solid #e0e0e0;
        border-right: 1px solid #e0e0e0;
        width: stretch;
        font-size: 1rem;
        text-align: center;
        outline: none;
        -moz-appearance: textfield;
        appearance: textfield;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
</style>
