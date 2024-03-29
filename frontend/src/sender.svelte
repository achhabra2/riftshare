<script>
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import {
    OpenDirectoryDialog,
    OpenFilesDialog,
    ClearSelectedFiles,
    SelectedFilesSend,
    CancelWormholeRequest,
    GetSelectedFiles,
  } from "../wailsjs/go/main/App";

  import Progress from "./progress.svelte";

  String.prototype.trimEllip = function (length) {
    return this.length > length ? this.substring(0, length) + "..." : this;
  };
  let sendCode = "";
  let status = "waiting";
  let sendPercent = 0;
  let selectedFiles = [];
  let isSending = false;
  $: selectedFileNames = selectedFiles.map((fileName) =>
    fileName.split("\\").pop().split("/").pop().trimEllip(30)
  );

  function openDirectoryDialog() {
    OpenDirectoryDialog()
      .then((selection) => {
        if (selection != null) {
          selectedFiles = selection;
        } else {
          selectedFiles = [];
        }
      })
      .catch((err) => {
        // No directory selected
        console.log(err);
      });
  }

  function openFilesDialog() {
    OpenFilesDialog()
      .then((selection) => {
        if (selection != null) {
          selectedFiles = selection;
        } else {
          selectedFiles = [];
        }
      })
      .catch((err) => {
        // No files selected
        console.log(err);
      });
  }

  function onReset() {
    sendCode = "";
    status = "waiting";
    sendPercent = 0;
    selectedFiles = [];
    isSending = false;
    ClearSelectedFiles();
  }

  function onCancel() {
    CancelWormholeRequest();
    isSending = false;
    sendCode = "";
    status = "waiting";
    sendPercent = 0;
  }

  function copyCode() {
    /* Get the text field */
    var copyText = document.getElementById("sendCode");

    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /* For mobile devices */

    /* Copy the text inside the text field */
    navigator.clipboard.writeText(copyText.value);
  }

  function sendFile() {
    SelectedFilesSend();
    isSending = true;
  }
  window.runtime.EventsOn("send:started", function (newCode) {
    sendCode = newCode;
  });

  window.runtime.EventsOn("send:updated", function (percent) {
    sendPercent = percent;
    if (status != "transferring") {
      status = "transferring";
    }
  });

  window.runtime.EventsOn("send:status", function (sendStatus) {
    status = sendStatus;
    if (sendStatus == "completed" || sendStatus == "failed") {
      setTimeout(() => {
        isSending = false;
        sendCode = "";
        sendPercent = 0;
      }, 500);
    }
  });

  onMount(() => {
    GetSelectedFiles().then((filePaths) => {
      if (filePaths && filePaths.length > 0) {
        selectedFiles = filePaths;
      }
    });
  });
</script>

<div class="flex flex-col justify-center content-center h-full">
  <div
    class="border-2 border-green-300 rounded-md shadow-md w-72 h-56 p-2 mx-auto cursor-fix send-icon-container"
  >
    <!-- <div class="send-icon-container w-60 h-36" /> -->
    {#if selectedFiles.length > 0}
      <div class="grid grid-flow-row">
        {#each selectedFileNames as fileName, idx}
          {#if idx < 9}
            <div class="flex mb-1">
              <div class="icon send-file-icon mr-1" />
              <span class="text-gray-300 text-xs">{fileName}</span>
            </div>
          {:else if idx == 9}
            <div class="text-xs text-gray-100">
              ...Total Selected: {selectedFiles.length}
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div
        class="flex flex-row items-center content-center justify-around place-items-center h-full"
      >
        <div class="has-tooltip">
          <span class="tooltip">Send Files</span>
          <button
            class="file-select-icon"
            on:click={openFilesDialog}
            disabled={isSending}
          />
        </div>
        <div class="has-tooltip">
          <span class="tooltip">Send Directory</span>
          <button
            class="folder-select-icon"
            on:click={openDirectoryDialog}
            disabled={isSending}
          />
        </div>
      </div>
    {/if}
  </div>
  <div class="p-2 mx-auto">
    {#if selectedFiles.length > 0}
      <button
        class="cancel-button"
        on:click={onReset}
        disabled={isSending}
        in:slide={{ duration: 200 }}>Clear</button
      >
      <button
        class="send-button"
        on:click={sendFile}
        disabled={isSending}
        in:slide={{ duration: 200 }}>Send</button
      >
    {/if}
  </div>
  {#if isSending}
    <Progress percent={sendPercent} {status}>
      <div class="container grid">
        <button class="my-2 mx-auto cancel-button" on:click={onCancel}
          >Cancel</button
        >
        {#if sendCode}
          <div class="mx-auto mt-2" transition:slide>
            <label for="sendCode" class="send-input-label">Send Code</label>
            <div class="flex flex-row">
              <input
                id="sendCode"
                readonly
                type="text"
                placeholder="Send code will appear"
                value={sendCode}
                class="send-input mt-1"
              />
              <button class="copy-button mt-1 ml-1" on:click={copyCode}
                ><div class="copy-icon" /></button
              >
            </div>
          </div>
        {/if}
      </div>
    </Progress>
  {/if}
</div>
