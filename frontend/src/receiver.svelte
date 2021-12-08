<script>
  import go from "../wailsjs/go/bindings";
  import Progress from "./progress.svelte";


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
    go.main.App.ReceiveFile(receiveCode);
  }

  function openFile() {
    go.main.App.OpenFile(receivePath);
  }

  function onCancel() {
    go.main.App.CancelWormholeRequest().then(() => {
      isReceiving = false;
      receiveCode = "";
      status = "waiting";
      receivePercent = 0;
    }).catch(err => {
      console.log(err);
    });
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
    class="border-2 border-green-300 rounded-md shadow-md w-64 h-40 p-2 mx-auto receive-icon-container"
  >
    {#if receivePath}
      <!-- <p class="text-gray-400 text-sm">Incoming Files:</p> -->
      <div
        class="flex flex-col justify-center items-center space-y-2 bg-gray-800 bg-opacity-60"
      >
        <div class="icon-lg receive-file-icon" />
        <span class="text-gray-200">{receiveFileName}</span>
        {#if !isReceiving}
          <button class="open-button text-sm" on:click={openFile}>Open</button>
        {/if}
      </div>
    {/if}
  </div>
  <div class="p-2 mx-auto">
    <form on:submit|preventDefault={receiveFile}>
      <label for="receiveCode" class="receive-input-label">Receive Code </label>
      <input
        id="receiveCode"
        type="text"
        placeholder="eg. 5-component-button"
        bind:value={receiveCode}
        class="receive-input"
      />
      <button class="receive-button" type="submit" disabled={!receiveCodeValid}>Download</button>
    </form>
  </div>
  {#if isReceiving}
    <Progress percent={receivePercent} {status}>
      <div class="container grid">
        <button class="my-2 mx-auto send-button" on:click={onCancel}
          >Cancel</button
        >
      </div>
    </Progress>
  {/if}
</div>
