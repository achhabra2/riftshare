<script>
  import { fade } from "svelte/transition";
  import Sender from "./sender.svelte";
  import Receiver from "./receiver.svelte";
  import Settings from "./settings.svelte";
  import About from "./about.svelte";
  let appMode = "send";
</script>

<main data-wails-no-drag>
  <!-- <div class="pt-2 pb-2 text-sm text-center text-gray-200 font-sans cursor-fix">
    RiftShare
  </div> -->
  <div class="container mx-auto py-1">
    <ul class="flex justify-center space-x-1 flex-row">
      <li class="">
        <button
          class={appMode == "send"
            ? "tab-item tab-item-active"
            : "tab-item tab-item-inactive"}
          on:click={() => (appMode = "send")}
        >
          <div class="icon send-tab-icon mr-1" />
          <span>Send</span>
        </button>
      </li>
      <li class="">
        <button
          class={appMode == "receive"
            ? "tab-item tab-item-active"
            : "tab-item tab-item-inactive"}
          on:click={() => (appMode = "receive")}
        >
          <div class="icon receive-tab-icon mr-1" />
          <span>Receive</span>
        </button>
      </li>
      <li class="">
        <button
          class={appMode == "settings"
            ? "tab-item tab-item-active"
            : "tab-item tab-item-inactive"}
          on:click={() => (appMode = "settings")}
        >
          <div class="icon settings-tab-icon mr-1" />
          <span>Settings</span>
        </button>
      </li>
      <li class="">
        <button
          class={appMode == "about"
            ? "tab-item tab-item-active"
            : "tab-item tab-item-inactive"}
          on:click={() => (appMode = "about")}
        >
          <div class="icon about-tab-icon mr-1" />
          <span>About</span>
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
  <div class="tab-container">
    {#if appMode == "send"}
      <Sender />
    {:else if appMode == "receive"}
      <Receiver />
    {:else if appMode == "settings"}
      <Settings />
    {:else if appMode == "about"}
      <About />
    {/if}
  </div>
</main>

<style global lang="postcss">
  @import "./styles.pcss";
</style>
