<script>
  import go from "../wailsjs/go/bindings";
  import { onMount } from "svelte";

  let downloadsFolder = "";

  onMount(() => {
    go.main.App.GetDownloadsFolder().then(
      (folder) => (downloadsFolder = folder)
    );
  });
</script>

<div>
  <div class="text-gray-300">Downloads Folder</div>
  <div class="text-gray-200 text-sm">{downloadsFolder}</div>
</div>
