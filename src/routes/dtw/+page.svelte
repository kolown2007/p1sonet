<script lang="ts">
	import { onMount } from 'svelte';
	import {
		AccelerometerGestureBuffer,
		type CardinalGesture,
		type RecognizeGestureOptions
	} from '$lib/DTW/accelerometer-gesture';

	type PermissionState = 'idle' | 'granted' | 'denied' | 'unsupported';
	type GestureDisplay = CardinalGesture | 'waiting';

	const buffer = new AccelerometerGestureBuffer(120, 650);
	const recognizeOptions: RecognizeGestureOptions = {
		threshold: 0.35,
		motionThreshold: 0.04,
		motionWindow: 12,
		minFrames: 16,
		smoothingWindow: 3,
		normalizeAxis: true
	};

	let permission: PermissionState = 'idle';
	let activeGesture: GestureDisplay = 'waiting';
	let debugScore = 'inf';
	let status = 'Tap start to enable accelerometer recognition.';
	let lastClassifyAt = 0;

	const positionClass = (gesture: GestureDisplay): string => {
		if (gesture === 'left') return 'pos-left';
		if (gesture === 'right') return 'pos-right';
		if (gesture === 'up') return 'pos-up';
		if (gesture === 'down') return 'pos-down';
		return 'pos-center';
	};

	let textPosition = positionClass(activeGesture);
	$: textPosition = positionClass(activeGesture);

	const onMotion = (event: DeviceMotionEvent): void => {
		const acc = event.accelerationIncludingGravity;
		if (!acc) {
			return;
		}

		buffer.push({
			x: acc.x ?? 0,
			y: acc.y ?? 0,
			z: acc.z ?? 0,
			timestamp: Date.now()
		});

		const now = Date.now();
		if (now - lastClassifyAt < 120) {
			return;
		}
		lastClassifyAt = now;

		const result = buffer.recognize(recognizeOptions);
		debugScore = Number.isFinite(result.score) ? result.score.toFixed(3) : 'inf';
		activeGesture = (result.label ?? 'waiting') as GestureDisplay;
	};

	const startTracking = async (): Promise<void> => {
		if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') {
			permission = 'unsupported';
			status = 'Device motion is not supported on this device/browser.';
			return;
		}

		const maybeRequestable = DeviceMotionEvent as typeof DeviceMotionEvent & {
			requestPermission?: () => Promise<'granted' | 'denied'>;
		};

		try {
			if (maybeRequestable.requestPermission) {
				const result = await maybeRequestable.requestPermission();
				if (result !== 'granted') {
					permission = 'denied';
					status = 'Motion permission was denied.';
					return;
				}
			}

			window.addEventListener('devicemotion', onMotion);
			permission = 'granted';
			status = 'Move your phone. Gesture text will snap to direction.';
		} catch {
			permission = 'denied';
			status = 'Could not access motion sensors.';
		}
	};

	onMount(() => {
		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('devicemotion', onMotion);
			}
		};
	});
</script>

<main class="stage">
	<div class="hud">
		<button on:click={startTracking} disabled={permission === 'granted'}>
			{permission === 'granted' ? 'tracking' : 'start'}
		</button>
		<p>{status}</p>
		<p>score: {debugScore}</p>
	</div>

	<h1 class={`gesture ${textPosition}`}>{activeGesture}</h1>
</main>

<style>
	.stage {
		position: fixed;
		inset: 0;
		background: #000;
		color: #fff;
		width: 100vw;
		height: 100vh;
		font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
	}

	.hud {
		position: absolute;
		left: 1rem;
		top: 1rem;
		z-index: 2;
		font-size: 0.875rem;
		opacity: 0.85;
	}

	button {
		background: #fff;
		color: #000;
		border: 0;
		padding: 0.45rem 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.hud p {
		margin: 0.45rem 0 0;
	}

	.gesture {
		position: absolute;
		margin: 0;
		font-size: clamp(2.25rem, 10vw, 8rem);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		transition:
			left 180ms ease,
			top 180ms ease,
			transform 180ms ease;
		user-select: none;
	}

	.pos-center {
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
	}

	.pos-left {
		left: 7vw;
		top: 50%;
		transform: translateY(-50%);
	}

	.pos-right {
		right: 7vw;
		top: 50%;
		transform: translateY(-50%);
	}

	.pos-up {
		left: 50%;
		top: 9vh;
		transform: translateX(-50%);
	}

	.pos-down {
		left: 50%;
		bottom: 9vh;
		transform: translateX(-50%);
	}
</style>
