<script>
  import Sender from "./sender.svelte";
  import Receiver from "./receiver.svelte";

  let appMode = "send";
</script>

<main>
  <div class="container mx-auto py-8">
    <ul class="flex justify-center space-x-2">
      <li>
        <button
          on:click={() => (appMode = "send")}
          class="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg shadow-lg"
          >Send
        </button>
      </li>
      <li>
        <button
          on:click={() => (appMode = "receive")}
          class="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg shadow-lg"
          >Receive
        </button>
      </li>
      <li>
        <button
          on:click={() => (appMode = "settings")}
          class="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg shadow-lg"
          >Settings
        </button>
      </li>
    </ul>
  </div>
  <div
    class="container mx-auto px-4 py-4 bg-indigo-800 rounded-lg shadow-lg bg-opacity-50"
    data-wails-no-drag
  >
    {#if appMode == "send"}
      <Sender />
    {:else if appMode == "receive"}
      <Receiver />
    {/if}
  </div>
</main>

<style global lang="postcss">
@import "./styles.pcss"

</style>
