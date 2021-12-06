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
      setTimeout(() => {
        isReceiving = false;
      }, 500);
    }
  });
</script>

<div class="flex flex-col justify-items-center content-center m-2">
  <div
    class="border-2 rounded-md shadow-md w-64 h-48 p-2 mx-auto receive-icon-container"
  >
    {#if receivePath}
      <div>Incoming File: {receiveFileName}</div>
      {#if !isReceiving}
        <button class="button" on:click={openFile}>Open</button>
      {/if}
    {/if}
  </div>
  <div class="p-2 mx-auto">
    <form action="">
      <label for="receiveCode" class="receive-input-label">Receive Code </label>
      <input
        id="receiveCode"
        type="text"
        placeholder="eg. 5-component-button"
        bind:value={receiveCode}
        class="receive-input"
      />
      <button class="receive-button" type="submit" on:click={receiveFile}>Receive</button>
    </form>
  </div>
  <!-- {#if status}
  <div id="status" class="text-red-300">Status: {status}</div>
{/if} -->
  {#if isReceiving}
    <div class="mx-auto p-2 w-3/4">
      <div class="mb-1 flex justify-between">
        <span class="text-base text-blue-700 font-medium dark:text-white"
          >{status}</span
        >
        <span class="text-sm font-medium text-blue-700 dark:text-white"
          >{receivePercent}%</span
        >
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          class="bg-blue-600 h-2.5 rounded-full"
          style={"width: " + receivePercent.toString() + "%"}
        />
      </div>
    </div>
  {/if}
</div>
