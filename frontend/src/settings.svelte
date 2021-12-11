<script>
  import go from "../wailsjs/go/bindings";
  import { onMount } from "svelte";

  let downloadsFolder = "";
  let notifications = false;
  let overwrite = false;

  onMount(() => {
    go.main.App.GetDownloadsFolder().then(
      (folder) => (downloadsFolder = folder)
    );
    go.main.App.GetOverwriteParam().then((pref) => {
      overwrite = pref;
    });
  });

  function setDownloadsFolder() {
    go.main.App.SetDownloadsFolder().then((folder) => {
      downloadsFolder = folder;
    });
  }

  function openDownloadsFolder() {
    go.main.App.OpenFile(downloadsFolder);
  }

  function toggleOverwrite() {
    go.main.App.SetOverwriteParam(!checked).then(newValue => {
      checked = newValue;
    });
  }
</script>

<div class="text-gray-200">
  <div class="mb-1">
    <div class="text-gray-300">Downloads Folder</div>
    <div class="flex flex-row items-center justify-between">
      <div class="text-gray-200 text-sm">{downloadsFolder}</div>
      <div>
        <button class="settings-button mr-1" on:click={setDownloadsFolder}
          >Edit</button
        >
        <button class="settings-button" on:click={openDownloadsFolder}
          >Open</button
        >
      </div>
    </div>
  </div>
  <div class="text-gray-300">Notifications</div>
  <div class="flex flex-row items-center justify-between mb-1">
    <label class="text-sm" for="notifications">Show Desktop Notifications</label
    >
    <input
      class="checkbox"
      type="checkbox"
      id="notifications"
      name="notifications"
      bind:checked={notifications}
    />
  </div>
  <div class="text-gray-300">Overwrite</div>
  <div class="flex flex-row items-center justify-between mb-1">
    <label class="text-sm" for="overwrite">Overwrite Existing Files</label>
    <input
      class="checkbox"
      type="checkbox"
      id="overwrite"
      name="overwrite"
      checked={overwrite}
      on:click={toggleOverwrite}
    />
  </div>
</div>
