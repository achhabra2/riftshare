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
          class="inline-block px-4 py-2 bg-purple-500 text-white"
          >Send
        </button>
      </li>
      <li>
        <button
          on:click={() => (appMode = "receive")}
          class="inline-block px-4 py-2 bg-purple-500 text-white"
          >Receive
        </button>
      </li>
      <li>
        <button
          on:click={() => (appMode = "settings")}
          class="inline-block px-4 py-2 bg-purple-500 text-white"
          >Settings
        </button>
      </li>
    </ul>
  </div>
  {#if appMode == "send"}
    <Sender />
  {:else if appMode == "receive"}
    <Receiver />
  {/if}
</main>

<style global lang="postcss">
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  main {
    height: 100%;
    width: 100%;
  }

  button {
    -webkit-appearance: default-button;
    padding: 6px;
  }

  #logo {
    width: 40%;
    height: 40%;
    padding-top: 20%;
    margin: auto;
    display: block;
    background-position: center;
    background-repeat: no-repeat;
    background-image: url("assets/images/logo-dark.svg");
  }
</style>
