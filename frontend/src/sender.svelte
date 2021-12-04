<script>
  import go from "../wailsjs/go/bindings";

  let sendCode = "";
  let status = "waiting";
  let sendPercent = 0;
  let selectedFiles = "";
  let isSending = false;
  $: selectedFileName = selectedFiles.split("\\").pop().split("/").pop();

  function openDialog() {
    go.main.App.OpenDialog().then((selection) => {
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
    go.main.App.SendFile();
  }
  window.runtime.EventsOn("send:started", function (newCode) {
    sendCode = newCode;
  });

  window.runtime.EventsOn("send:updated", function (percent) {
    sendPercent = percent;
  });

  window.runtime.EventsOn("send:status", function (sendStatus) {
    status = sendStatus;
  });
</script>

<button class="button" on:click={openDialog}>Select File</button>
<button class="button" on:click={sendFile}>Send</button>
<input
  id="sendCode"
  readonly
  type="text"
  placeholder="Send Code..."
  bind:value={sendCode}
/>
<button class="button" on:click={copyCode}>📄</button>
{#if sendPercent}
  <label for="file">Progress:</label>
  <progress id="file" max="100" value={sendPercent}>
    {sendPercent}%
  </progress>
{/if}
<div>Selected Files: {selectedFileName}</div>
{#if status}
<div id="status" class="text-red-300">Status: {status}</div>
{/if}