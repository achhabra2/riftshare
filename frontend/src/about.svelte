<script>
  import go from "../wailsjs/go/bindings";
  import { onMount } from "svelte";
  let version = "";
  const attributions = {
    "wailsapp/wails": "https://wails.io",
    "Jackalz/wails-wormhole-gui": "https://github.com/Jacalz/wormhole-gui",
    "psanford/wormhole-william": "https://github.com/psanford/wormhole-william",
    "magic-wormhole": "https://magic-wormhole.readthedocs.io/",
    svelte: "https://github.com/sveltejs/svelte",
    tailwindcss: "https://github.com/tailwindlabs/tailwindcss",
    "font awesome": "https://fontawesome.com",
    "klauspost/compress": "https://github.com/klauspost/compress",
    "go-github-selfupdate": "https://github.com/rhysd/go-github-selfupdate",
  };
  onMount(() => {
    go.main.App.GetCurrentVersion().then((ver) => {
      version = ver;
    });
  });
</script>

<div class="container p4 text-gray-200">
  <div>
    Riftshare v{version}
    <a class="text-blue-600" target="_blank" href="https://github.com/achhabra2/riftshare"
      >Github</a
    >
  </div>

  <p class="text-sm">
    The goal of this project is to enable everyone to securely share files
    freely and easily.
  </p>
  <p class="text-sm">Licensed under the GNU GPL Version 3</p>

  <div class="mx-auto">
    <p class="text-sm">
      This project leverages the work of other Open Source Software
    </p>
    <ul class="text-xs file-list">
      {#each Object.entries(attributions) as [name, url]}
        <li><a class="text-blue-500" target="_blank" href={url}>{name}</a></li>
      {/each}
    </ul>
  </div>
</div>
