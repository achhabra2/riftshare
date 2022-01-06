<script>
  import go from "../wailsjs/go/bindings";
  import { onMount } from "svelte";

  let downloadsFolder = "";
  let logPath = "";
  let notifications = false;
  let overwrite = false;
  let selfUpdate = false; 
  let packageManaged = false;

  onMount(() => {
    go.main.App.GetUserPrefs().then(prefs => {
      downloadsFolder = prefs.downloadsDirectory;
      notifications = prefs.notifications;
      overwrite = prefs.overwrite;
      selfUpdate = prefs.selfUpdate;
    });
    go.main.App.GetLogPath().then((path) => {
      logPath = path;
    });

    go.main.App.AppInstalledFromPackageManager().then(managed => {
      packageManaged = managed;
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
    go.main.App.SetOverwriteParam(!overwrite).then(newValue => {
      overwrite = newValue;
    });
  }

  function toggleNotifications() {
    go.main.App.SetNotificationsParam(!notifications).then(newValue => {
      notifications = newValue;
    });
  }

  function toggleSelfUpdate() {
    go.main.App.SetSelfUpdateParam(!selfUpdate).then(newValue => {
      selfUpdate = newValue;
    });
  }

  $: downloadPathCleaned = downloadsFolder.replace(/.{50}/g, "$&\r\n");
  $: logPathCleaned = logPath.replace(/.{50}/g, "$&\r\n");
</script>

<div class="text-gray-200">
  <div class="mb-1">
    <div class="text-gray-300 font-bold">Downloads Folder</div>
    <div class="flex flex-row items-center justify-between">
      <div class="text-gray-200 text-xs max-w-md">{downloadPathCleaned}</div>
      <div class="w-22">
        <button class="settings-button mr-1" on:click={setDownloadsFolder}
          >Edit</button
        >
        <button class="settings-button" on:click={openDownloadsFolder}
          >Open</button
        >
      </div>
    </div>
  </div>
  <div class="text-gray-300 font-bold">Notifications</div>
  <div class="flex flex-row items-center justify-between mb-1">
    <label class="text-sm" for="notifications">Show Desktop Notifications</label
    >
    <input
      class="checkbox"
      type="checkbox"
      id="notifications"
      name="notifications"
      checked={notifications}
      on:input={toggleNotifications}
    />
  </div>
  <div class="text-gray-300 font-bold">Overwrite</div>
  <div class="flex flex-row items-center justify-between mb-1">
    <label class="text-sm" for="overwrite">Overwrite Existing Files</label>
    <input
      class="checkbox"
      type="checkbox"
      id="overwrite"
      name="overwrite"
      checked={overwrite}
      on:input={toggleOverwrite}
    />
  </div>
  <div class="text-gray-300 font-bold">Auto Update</div>
  <div class="flex flex-row items-center justify-between mb-1">
    {#if packageManaged}
    <span class="text-sm">Update from Package Manager</span>
    {:else}
    <label class="text-sm" for="selfUpdate">Auto Update Enabled</label>
    <input
      class="checkbox"
      type="checkbox"
      id="selfUpdate"
      name="selfUpdate"
      checked={selfUpdate}
      on:input={toggleSelfUpdate}
    />
    {/if}
  </div>
  <div class="mb-1">
    <div class="text-gray-300 font-bold">Logs</div>
    <div class="flex flex-row items-center justify-between">
      <div class="text-gray-200 text-xs">{logPathCleaned}</div>
      <div>
        <button class="settings-button" on:click={(event) => window.runtime.BrowserOpenURL(logPath)}
          >Open</button
        >
      </div>
    </div>
  </div>
</div>
