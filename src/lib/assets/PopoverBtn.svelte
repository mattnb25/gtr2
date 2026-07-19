<script>
    let { name, children } = $props();
</script>

<button
    popovertarget={`menu-${name}`}
    class="popover-btn"
    style="anchor-name: --anchor-{name};"
>
    {name} ▾
</button>

<div
    id={`menu-${name}`}
    popover="auto"
    class="popover-target"
    style="position-anchor: --anchor-{name};"
>
    <div class="popover-container">
        {@render children?.()}
    </div>
</div>

<style>
    .popover-btn {
        position: relative;
    }

    .popover-btn:active {
        color: white;
        background-color: #5a6ee0;
        border: 1px solid #5a6ee0;
    }

    .popover-target {
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        min-width: 150px;
        margin: 8px;
        margin-left: 0;
        padding: 8px 8px;
    }

    [popover]:popover-open {
        position-area: top span-right;
    }

    .popover-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    :global(.popover-target button) {
        border: none;
        border-radius: 4px;
        background-color: transparent;
        display: block;
        width: 100%;
        text-align: left;
        padding: 4px 8px;
    }
    :global(.popover-target button:active) {
        color: #5a6ee0;
        background-color: #eef0fd;
    }

    :global(.popover-target button:hover) {
        background: #f5f5f5;
    }

    :global(.popover-target .header) {
        padding: 4px 8px;
        font-size: 1.2rem;
        color: dimgray;
        text-transform: uppercase;
    }
</style>
