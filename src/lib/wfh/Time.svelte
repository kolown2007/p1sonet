<script lang="ts">
  import { onMount } from 'svelte';

  let time = new Date();

  const updateTime = () => {
    time = new Date();
  };

  let interval: ReturnType<typeof setInterval>;
  onMount(() => {
    interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  });
</script>

<div class="clock">
  <span class="hours">{time.getHours().toString().padStart(2, '0')}</span>:
  <span class="minutes">{time.getMinutes().toString().padStart(2, '0')}</span>:
  <span class="seconds">{time.getSeconds().toString().padStart(2, '0')}</span>
</div>

<style>
  .clock {
    font-family: 'Space Mono', monospace;
    font-size: 10rem;
    color: #00FF00;
    text-align: center;
    display: flex; /* Ensures the numbers are always horizontal */
    justify-content: center;
    gap: 0.5rem; /* Adds spacing between the numbers */
  }
</style>