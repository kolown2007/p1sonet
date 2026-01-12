<script lang="ts">
	import { onMount } from 'svelte';
	let { children } = $props();

	onMount(() => {
		let hideTimer: ReturnType<typeof setTimeout>;

		function showCursor() {
			document.body.style.cursor = 'auto';
		}

		function hideCursor() {
			document.body.style.cursor = 'none';
		}

		function resetTimer() {
			showCursor();
			clearTimeout(hideTimer);
			hideTimer = setTimeout(hideCursor, 5000);
		}

		// Initialize
		resetTimer();

		// Listen for mouse movement
		window.addEventListener('mousemove', resetTimer);

		// Cleanup
		return () => {
			clearTimeout(hideTimer);
			window.removeEventListener('mousemove', resetTimer);
		};
	});
</script>

{@render children()}

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
		overflow: hidden;
	}
</style>
