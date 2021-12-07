<script>
  export let status = waiting;
  export let percent = 0;
  import { slide } from "svelte/transition";
</script>

<div class="progress-outer" transition:slide>
  <div class="progress-inner">
    <div class="mb-1 flex justify-between">
      <span class="text-base text-gray-100 font-medium"
        >{status}</span
      >
      <span class="text-sm font-medium text-gray-100"
        >{percent}%</span
      >
    </div>
    <div class="w-full bg-green-900 rounded-full h-4 shadow-inner">
      <div
        class="bg-green-500 h-4 rounded-full animate-pulse"
        style={"width: " + percent.toString() + "%"}
      />
    </div>
    <slot></slot>
  </div>
</div>
