<script>
    let { label = "", checked, onchange } = $props();
</script>

<label class="container">
    <div class="header">{label}</div>
    <input type="checkbox" role="switch" {checked} {onchange} />
</label>

<style>
    .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    input[type="checkbox"][role="switch"] {
        position: relative;
        appearance: none;
        font-size: inherit;
        width: 3em;
        height: 1.5em;
        border-radius: 1em;
        border: 1px solid var(--color-border);
    }
    input[type="checkbox"][role="switch"]::before {
        transition: var(--transition-fast);
        content: "";
        position: absolute;
        top: 50%;
        left: 0;
        transform: translate(0, -50%);
        box-sizing: border-box;
        width: 1em;
        height: 1em;
        margin: 0 0.25em;
        border-radius: 50%;
        background: currentcolor;
        color: var(--color-border);
    }
    input[type="checkbox"][role="switch"]:checked::before {
        left: 50%;
        color: var(--color-primary);
    }
</style>
