<script>
  export let status = waiting;
  export let percent = 0;
  import { slide } from "svelte/transition";
</script>

<div class="progress-outer" transition:slide>
  <div class="progress-inner">
    <div class="mb-1 flex justify-between">
      <span class="text-base text-blue-700 font-medium dark:text-white"
        >{status}</span
      >
      <span class="text-sm font-medium text-blue-700 dark:text-white"
        >{percent}%</span
      >
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div
        class="bg-blue-600 h-2.5 rounded-full"
        style={"width: " + percent.toString() + "%"}
      />
    </div>
    <slot></slot>
  </div>
</div>
