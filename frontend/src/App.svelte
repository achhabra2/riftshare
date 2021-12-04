<script>
  import Sender from "./sender.svelte"
  import Receiver from "./receiver.svelte"


  let appMode;
</script>

<main>
  <div id="logo" />
  <div id="input" data-wails-no-drag>
    <label for="appMode">Select Mode</label>

    <select name="modes" id="appMode" bind:value={appMode}>
      <option value="">--Please choose an option--</option>
      <option value="send">Send</option>
      <option value="receive">Receive</option>
    </select>

    {#if appMode == "send"}
    <Sender />
    {:else if appMode == "receive"}
    <Receiver />
    {/if}
  </div>
</main>

<style global lang="postcss">
  /* @tailwind base; */
  /* @tailwind components; */
  /* @tailwind utilities; */
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
