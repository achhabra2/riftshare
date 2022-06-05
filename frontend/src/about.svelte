<script>
  import { GetCurrentVersion } from "../wailsjs/go/main/App";

  // import runtime from "../wailsjs/runtime";

  import { onMount } from "svelte";
  let version = "";
  const issueUrl = "https://github.com/achhabra2/riftshare/issues/new/choose";

  const attributions = {
    "wailsapp/wails": "https://wails.io",
    "Jacalz/rymdport": "https://github.com/Jacalz/rymdport",
    "psanford/wormhole-william": "https://github.com/psanford/wormhole-william",
    "magic-wormhole": "https://magic-wormhole.readthedocs.io/",
    svelte: "https://github.com/sveltejs/svelte",
    tailwindcss: "https://github.com/tailwindlabs/tailwindcss",
    "font awesome": "https://fontawesome.com",
    "klauspost/compress": "https://github.com/klauspost/compress",
    "go-github-selfupdate": "https://github.com/rhysd/go-github-selfupdate",
  };
  onMount(() => {
    GetCurrentVersion().then((ver) => {
      version = ver;
    });
  });
</script>

<div class="container p4 text-gray-200">
  <div class="flex flex-row justify-between">
    <span class="font-bold">
      Riftshare v{version}
    </span>
    <div>
      <button
        class="text-sm mr-1 about-button"
        on:click={(event) =>
          window.runtime.BrowserOpenURL("https://riftshare.app")}
        >Website</button
      >
      <button
        class="text-sm mr-1 about-button"
        on:click={(event) =>
          window.runtime.BrowserOpenURL("https://riftshare.app/faq.html")}
        >FAQ</button
      >
      <button
        class="text-sm mr-1 about-button"
        on:click={(event) => window.runtime.BrowserOpenURL(issueUrl)}
        >Open an Issue</button
      >
    </div>
  </div>

  <p class="text-sm mb-1">
    The goal of this project is to enable everyone to securely share files
    freely and easily.
  </p>
  <div class="mb-1">
    <p class="text-bold">License</p>
    <p class="text-sm">Licensed under the GNU GPL Version 3</p>
  </div>
  <div>
    <p class="text-bold">Attributions</p>
    <p class="text-sm">
      This project leverages the work of other Open Source Software
    </p>
    <ul class="text-xs file-list">
      {#each Object.entries(attributions) as [name, url]}
        <li>
          <button
            class="text-blue-500"
            on:click={(event) => window.runtime.BrowserOpenURL(url)}
            >{name}</button
          >
        </li>
      {/each}
    </ul>
  </div>
</div>
