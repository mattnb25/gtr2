<script>
  import { openFile } from "$lib/state.svelte.js";
</script>

<input
  type="file"
  onchange={(e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => openFile(new Uint8Array(e.target.result));
    reader.readAsArrayBuffer(file);
  }}
  accept=".gp,.gp3,.gp4,.gp5,.gpx,.atex"
/>
<button>save</button>
<button>Score info</button>
<button>play</button>
<button>zoom</button>
<button>voice</button>
