<script>
  import { GetCurrentVersion } from "../wailsjs/go/main/App";

  // import runtime from "../wailsjs/runtime";

  import { onMount } from "svelte";
  let version = "";
  const issueUrl = "https://github.com/achhabra2/riftshare/issues/new/choose";

  const attributions = {
    "wailsapp/wails [MIT]": "https://wails.io",
    "Jacalz/rymdport [GPLv3]": "https://github.com/Jacalz/rymdport",
    "psanford/wormhole-william [MIT]": "https://github.com/psanford/wormhole-william",
    "magic-wormhole": "https://magic-wormhole.readthedocs.io/",
    "svelte [MIT]": "https://github.com/sveltejs/svelte",
    "tailwindcss [MIT]": "https://github.com/tailwindlabs/tailwindcss",
    "font awesome": "https://fontawesome.com",
    "klauspost/compress [Apache 2.0]": "https://github.com/klauspost/compress",
    "go-github-selfupdate [MIT]": "https://github.com/rhysd/go-github-selfupdate",
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

  <p class="text-sm italic mb-1">
    The goal of this project is to enable everyone to securely share files
    freely and easily.
  </p>
  <div class="mb-1">
    <p class="text-bold">License</p>
    <a href="https://www.gnu.org/licenses/gpl-3.0.en.html" class="text-sm underline">Licensed under the GNU GPL Version 3</a>
  </div>
  <div>
    <p class="text-bold">Attributions</p>
    <p class="text-sm mb-1">
      This project leverages the work of other Open Source Software
    </p>
    <ul class="text-xs file-list ml-2">
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
