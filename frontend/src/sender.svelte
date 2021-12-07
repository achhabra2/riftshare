<script>
  import { slide } from "svelte/transition";
  import go from "../wailsjs/go/bindings";

  import Progress from "./progress.svelte";

  let sendCode = "";
  let status = "waiting";
  let sendPercent = 0;
  let selectedFiles = [];
  let isSending = false;
  $: selectedFileNames = selectedFiles.map((fileName) =>
    fileName.split("\\").pop().split("/").pop()
  );
  let bar;

  function openDialog() {
    go.main.App.OpenDialog().then((selection) => {
      selectedFiles = selection;
    });
  }

  function openMultiple() {
    go.main.App.OpenDirectory().then((selection) => {
      selectedFiles = selection;
    });
  }

  function onReset() {
    sendCode = "";
    status = "waiting";
    sendPercent = 0;
    selectedFiles = [];
    isSending = false;
  }

  function onCancel() {
    go.main.App.CancelWormholeRequest().then(() => {
      isSending = false;
      sendCode = "";
      status = "waiting";
      sendPercent = 0;
    });
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
    go.main.App.SelectedFilesSend();
  }
  window.runtime.EventsOn("send:started", function (newCode) {
    sendCode = newCode;
    isSending = true;
  });

  window.runtime.EventsOn("send:updated", function (percent) {
    sendPercent = percent;
    bar.set(percent);
  });

  window.runtime.EventsOn("send:status", function (sendStatus) {
    status = sendStatus;
    if (sendStatus == "completed" || sendStatus == "failed") {
      setTimeout(() => {
        isSending = false;
        sendCode = "";
      }, 500);
    }
  });
</script>

<div class="flex flex-col justify-items-center content-center m-2">
  {#if selectedFiles}
    <div
      class="border-2 border-green-300 rounded-md shadow-md w-64 h-40 p-2 mx-auto send-icon-container cursor-fix"
    >
      <p class="text-gray-400 text-sm">Selected:</p>
      <ul class="file-list">
        {#each selectedFileNames as fileName}
          <li class="text-gray-300 text-xs">{fileName}</li>
        {/each}
      </ul>
    </div>
  {:else}
    <div />
  {/if}
  <div class="p-2 mx-auto">
    <!-- <button class="button" on:click={openDialog}>Select File</button> -->
    <button class="send-button" on:click={openMultiple} disabled={isSending}
      >Select File(s)</button
    >
    {#if selectedFiles.length > 0}
      <button
        class="rounded-lg px-4 py-2 bg-blue-500 text-blue-100 hover:bg-blue-600 duration-300 disabled:opacity-50"
        on:click={sendFile}
        disabled={isSending}
        in:slide={{ duration: 200 }}>Send</button
      >
    {/if}
  </div>
  {#if isSending}
    <Progress percent={sendPercent} {status}>
      <div class="container grid">
        <button class="my-2 mx-auto send-button" on:click={onCancel}
          >Cancel</button
        >
        {#if sendCode}
          <div class="mx-auto" transition:slide>
            <label for="sendCode" class="send-input-label">Send Code </label>
            <input
              id="sendCode"
              readonly
              type="text"
              placeholder="Send code will appear"
              value={sendCode}
              class="send-input"
            />
            <button class="send-button" on:click={copyCode}>📄</button>
          </div>
        {/if}
      </div>
    </Progress>
  {/if}
</div>
