<script>
  import go from "../wailsjs/go/bindings";

  let sendCode = "";
  let status = "waiting";
  let sendPercent = 0;
  let selectedFiles = [];
  let isSending = false;
  $: selectedFileNames = selectedFiles.map((fileName) =>
    fileName.split("\\").pop().split("/").pop()
  );

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
  });

  window.runtime.EventsOn("send:status", function (sendStatus) {
    status = sendStatus;
    if (sendStatus == "completed") {
      isSending = false;
    }
  });
</script>

<!-- <button class="button" on:click={openDialog}>Select File</button> -->
<button class="rounded-lg px-4 py-2 bg-blue-500 text-blue-100 hover:bg-blue-600 duration-300" on:click={openMultiple}>Select File(s)</button>
<button class="rounded-lg px-4 py-2 bg-blue-500 text-blue-100 hover:bg-blue-600 duration-300" on:click={sendFile}>Send</button>
<div class="mb-6">
  <label for="sendCode" class="text-sm font-medium text-gray-900 block mb-2"
    >Send Code
  </label>
  <input
    id="sendCode"
    readonly
    type="text"
    placeholder="Send Code..."
    bind:value={sendCode}
    class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
  />
</div>
<button class="button" on:click={copyCode}>📄</button>
{#if selectedFiles}
  <div>
    <p>Selected Files:</p>
    <ul>
      {#each selectedFileNames as fileName}
        <li>{fileName}</li>
      {/each}
    </ul>
  </div>
{/if}
{#if status}
  <div id="status" class="text-red-300">Status: {status}</div>
{/if}
{#if sendPercent && isSending}
  <label for="file">Progress:</label>
  <progress id="file" max="100" value={sendPercent}>
    {sendPercent}%
  </progress>
{/if}
