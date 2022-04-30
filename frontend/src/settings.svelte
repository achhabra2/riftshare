<script>
  import {
    GetUserPrefs,
    GetLogPath,
    AppInstalledFromPackageManager,
    SetDownloadsFolder,
    OpenFile,
    SetOverwriteParam,
    SetNotificationsParam,
    SetSelfUpdateParam,
  } from "../wailsjs/go/main/App";

  import { onMount } from "svelte";

  let downloadsFolder = "";
  let logPath = "";
  let notifications = false;
  let overwrite = false;
  let selfUpdate = false;
  let packageManaged = false;

  onMount(() => {
    GetUserPrefs().then((prefs) => {
      downloadsFolder = prefs.downloadsDirectory;
      notifications = prefs.notifications;
      overwrite = prefs.overwrite;
      selfUpdate = prefs.selfUpdate;
    });
    GetLogPath().then((path) => {
      logPath = path;
    });

    AppInstalledFromPackageManager().then((managed) => {
      packageManaged = managed;
    });
  });

  function setDownloadsFolder() {
    SetDownloadsFolder().then((folder) => {
      downloadsFolder = folder;
    });
  }

  function openDownloadsFolder() {
    OpenFile(downloadsFolder);
  }

  function toggleOverwrite() {
    SetOverwriteParam(!overwrite).then((newValue) => {
      overwrite = newValue;
    });
  }

  function toggleNotifications() {
    SetNotificationsParam(!notifications).then((newValue) => {
      notifications = newValue;
    });
  }

  function toggleSelfUpdate() {
    SetSelfUpdateParam(!selfUpdate).then((newValue) => {
      selfUpdate = newValue;
    });
  }

  $: downloadPathCleaned = downloadsFolder.replace(/.{50}.\//g, "$&\n");
  $: logPathCleaned = logPath.replace(/.{50}.\//g, "$&\n");
</script>

<div class="text-gray-200">
  <div class="mb-2">
    <div class="text-gray-300 font-bold">Downloads Folder</div>
    <div class="flex flex-row items-center justify-between">
      <div class="text-gray-200 text-xs max-w-md">{downloadPathCleaned}</div>
      <div class="w-22 inline-flex space-x-1">
        <button class="settings-button" on:click={setDownloadsFolder}
          >Edit</button
        >
        <button class="settings-button" on:click={openDownloadsFolder}
          >Open</button
        >
      </div>
    </div>
  </div>
  <div class="text-gray-300 font-bold">Notifications</div>
  <div class="flex flex-row items-center justify-between mb-2">
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
  <div class="flex flex-row items-center justify-between mb-2">
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
  <div class="flex flex-row items-center justify-between mb-2">
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
        <button
          class="settings-button"
          on:click={(event) => window.runtime.BrowserOpenURL(logPath)}
          >Open</button
        >
      </div>
    </div>
  </div>
</div>
