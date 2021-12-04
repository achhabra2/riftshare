<script>
  import go from "../wailsjs/go/bindings";

  let receiveCode = "";
  let status = "waiting";
  let receivePercent = 0;
  let isReceiving = false;
  let receivePath = "";

  $: receiveFileName = receivePath.split("\\").pop().split("/").pop();

  function receiveFile() {
    go.main.App.ReceiveFile(receiveCode);
  }

  function openFile() {
    go.main.App.OpenFile(receivePath);
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
      isReceiving = false;
    }
  });
</script>

<input
  id="receiveCode"
  type="text"
  placeholder="Enter Receive Code..."
  bind:value={receiveCode}
/>
<button class="button" on:click={receiveFile}>Receive</button>
{#if receivePath}
  <div>Incoming File: {receiveFileName}</div>
  {#if !isReceiving}
    <button class="button" on:click={openFile}>Open</button>
  {/if}
{/if}
{#if isReceiving}
  <label for="file">Progress:</label>
  <progress id="file" max="100" value={receivePercent}>
    {receivePercent}%
  </progress>
{/if}
{#if status}
<div id="status" class="text-red-300">Status: {status}</div>
{/if}