<script>
  import { fade } from "svelte/transition";
  import Sender from "./sender.svelte";
  import Receiver from "./receiver.svelte";

  let appMode = "send";
</script>

<main>
  <div class="pt-2 pb-2 text-sm text-center text-gray-200 font-sans cursor-fix">
    Wails Wormhole GUI
  </div>
  <div class="container mx-auto py-1">
    <ul class="flex justify-center space-x-1 flex-row">
      <li class="">
        <button
          class={appMode == "send" ? "tab-item-active" : "tab-item-inactive"}
          on:click={() => (appMode = "send")}
        >
          <i class="fas fa-space-shuttle text-base mr-1" /> Send
        </button>
      </li>
      <li class="">
        <button
          class={appMode == "receive" ? "tab-item-active" : "tab-item-inactive"}
          on:click={() => (appMode = "receive")}
        >
          <i class="fas fa-cog text-base mr-1" /> Receive
        </button>
      </li>
      <li class="">
        <button
          class={appMode == "settings"
            ? "tab-item-active"
            : "tab-item-inactive"}
          on:click={() => (appMode = "settings")}
        >
          <i class="fas fa-briefcase text-base mr-1" /> Settings
        </button>
      </li>
    </ul>
  </div>
  <!-- <div class="container mx-auto py-8">
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
  </div> -->
  {#if appMode == "send"}
    <div
      class="tab-container"
      in:fade={{ duration: 100, delay: 200 }}
      out:fade={{ duration: 100, delay: 0 }}
      data-wails-no-drag
    >
      <Sender />
    </div>
  {:else if appMode == "receive"}
    <div
      class="tab-container"
      in:fade={{ duration: 100, delay: 200 }}
      out:fade={{ duration: 100, delay: 0 }}
      data-wails-no-drag
    >
      <Receiver />
    </div>
  {/if}
</main>

<style global lang="postcss">
  @import "./styles.pcss";
</style>
