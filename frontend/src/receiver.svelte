<script>
  import {
    ReceiveFile,
    OpenFile,
    GetUserPrefs,
    CancelWormholeRequest,
    GetReceivedFile,
  } from "../wailsjs/go/main/App";

  import Progress from "./progress.svelte";
  import { onMount } from "svelte";

  let receiveCode = "";
  const receivePattern = /\d+\-\w+\-\w+/;

  $: receiveCodeValid = receivePattern.test(receiveCode);

  let status = "waiting";
  let receivePercent = 0;
  let isReceiving = false;
  let receivePath = "";

  String.prototype.trimEllip = function (length) {
    return this.length > length ? this.substring(0, length) + "..." : this;
  };
  $: receiveFileName = receivePath
    .split("\\")
    .pop()
    .split("/")
    .pop()
    .trimEllip(24);

  function receiveFile() {
    ReceiveFile(receiveCode);
  }

  function openFile() {
    OpenFile(receivePath);
  }

  function openDownloadsFolder() {
    GetUserPrefs().then((prefs) => {
      OpenFile(prefs.downloadsDirectory);
    });
  }

  function onCancel() {
    CancelWormholeRequest();
    isReceiving = false;
    receiveCode = "";
    status = "waiting";
    receivePercent = 0;
    receivePath = "";
  }

  window.runtime.EventsOn("receive:updated", function (percent) {
    receivePercent = percent;
  });

  window.runtime.EventsOn("receive:started", function () {
    isReceiving = true;
  });

  window.runtime.EventsOn("receive:path", function (path) {
    receivePath = path;
  });

  window.runtime.EventsOn("receive:status", function (receiveStatus) {
    status = receiveStatus;
    if (receiveStatus == "completed") {
      setTimeout(() => {
        isReceiving = false;
        receivePercent = 0;
      }, 500);
    }
  });

  onMount(() => {
    GetReceivedFile().then((path) => {
      if (path) {
        receivePath = path;
      }
    });
  });
</script>

<div class="flex flex-col justify-items-center content-center m-2">
  <div
    class="border-2 border-green-300 rounded-md shadow-md w-72 h-56 p-2 mx-auto receive-icon-container"
  >
    {#if receivePath}
      <!-- <p class="text-gray-400 text-sm">Incoming Files:</p> -->
      <div
        class="flex flex-col justify-center items-center space-y-2 bg-gray-800 rounded-md bg-opacity-60 h-full"
      >
        <div class="icon-lg receive-file-icon" />
        <span class="text-gray-200">{receiveFileName}</span>
        {#if !isReceiving}
          <div class="inline-flex space-x-1">
            <button class="open-button text-sm" on:click={openFile}
              >Open File</button
            >
            <button class="open-button text-sm" on:click={openDownloadsFolder}
              >Open Folder</button
            >
          </div>
        {/if}
      </div>
    {/if}
  </div>
  <div class="p-2 mx-auto">
    <form on:submit|preventDefault={receiveFile} autocomplete="off">
      <label for="receiveCode" class="receive-input-label">Receive Code </label>
      <input
        id="receiveCode"
        type="text"
        placeholder="eg. 5-component-button"
        bind:value={receiveCode}
        class="receive-input"
      />
      <button class="receive-button" type="submit" disabled={!receiveCodeValid}
        >Download</button
      >
    </form>
  </div>
  {#if isReceiving}
    <Progress percent={receivePercent} {status}>
      <div class="container grid">
        <button class="my-2 mx-auto cancel-button" on:click={onCancel}
          >Cancel</button
        >
      </div>
    </Progress>
  {/if}
</div>
