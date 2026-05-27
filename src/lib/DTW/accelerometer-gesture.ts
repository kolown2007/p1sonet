import dtw from './dtw';
import type { Sample } from './dtw';

export type CardinalGesture = 'up' | 'down' | 'left' | 'right';

export interface AccelerometerFrame {
	x: number;
	y: number;
	z: number;
	timestamp?: number;
}

export interface GestureTemplate {
	label: string;
	frames: AccelerometerFrame[];
}

export interface GesturePreprocessOptions {
	// Window size for a simple moving average. Set 1 to disable smoothing.
	smoothingWindow?: number;
	// Include z-axis as a DTW feature. Defaults to false for left/right/up/down gestures.
	includeZ?: boolean;
	// Scale each axis into [-1, 1] so templates and live signals are easier to compare.
	normalizeAxis?: boolean;
}

export interface RecognizeGestureOptions extends GesturePreprocessOptions {
	// Maximum warp distance in indices. Lower is stricter and faster.
	window?: number;
	// If set, returns null label when best score is above threshold.
	threshold?: number;
	// Minimum recent signal energy required to run recognition.
	// Increase this if stable phone still triggers false positives.
	motionThreshold?: number;
	// Number of most recent frames used for motion energy check.
	motionWindow?: number;
	// Require this many frames before recognition is attempted.
	minFrames?: number;
	// Optional custom templates. If omitted, built-in up/down/left/right templates are used.
	templates?: GestureTemplate[];
}

export interface GestureScore {
	label: string;
	score: number;
}

export interface RecognizeGestureResult {
	label: string | null;
	score: number;
	scores: GestureScore[];
	motionEnergy?: number;
}

const clamp = (value: number, min: number, max: number): number =>
	Math.max(min, Math.min(max, value));

const movingAverage = (
	frames: AccelerometerFrame[],
	windowSize: number
): AccelerometerFrame[] => {
	if (windowSize <= 1) {
		return frames;
	}

	const half = Math.floor(windowSize / 2);
	return frames.map((_, idx) => {
		const start = Math.max(0, idx - half);
		const end = Math.min(frames.length - 1, idx + half);
		let sx = 0;
		let sy = 0;
		let sz = 0;
		let count = 0;

		for (let i = start; i <= end; i += 1) {
			sx += frames[i].x;
			sy += frames[i].y;
			sz += frames[i].z;
			count += 1;
		}

		return {
			x: sx / count,
			y: sy / count,
			z: sz / count,
			timestamp: frames[idx].timestamp
		};
	});
};

const normalizeAxes = (frames: AccelerometerFrame[]): AccelerometerFrame[] => {
	let maxX = 0;
	let maxY = 0;
	let maxZ = 0;

	for (const f of frames) {
		maxX = Math.max(maxX, Math.abs(f.x));
		maxY = Math.max(maxY, Math.abs(f.y));
		maxZ = Math.max(maxZ, Math.abs(f.z));
	}

	const sx = maxX > 0 ? 1 / maxX : 1;
	const sy = maxY > 0 ? 1 / maxY : 1;
	const sz = maxZ > 0 ? 1 / maxZ : 1;

	return frames.map((f) => ({
		x: f.x * sx,
		y: f.y * sy,
		z: f.z * sz,
		timestamp: f.timestamp
	}));
};

const computeMotionEnergy = (
	frames: AccelerometerFrame[],
	motionWindow: number,
	includeZ: boolean
): number => {
	if (frames.length === 0) {
		return 0;
	}

	const start = Math.max(0, frames.length - motionWindow);
	let sum = 0;
	let count = 0;

	for (let i = start; i < frames.length; i += 1) {
		const f = frames[i];
		const energy = includeZ ? f.x * f.x + f.y * f.y + f.z * f.z : f.x * f.x + f.y * f.y;
		sum += energy;
		count += 1;
	}

	return count > 0 ? sum / count : 0;
};

export const preprocessAccelerometerFrames = (
	frames: AccelerometerFrame[],
	options: GesturePreprocessOptions = {}
): AccelerometerFrame[] => {
	if (frames.length === 0) {
		return [];
	}

	const smoothingWindow = options.smoothingWindow ?? 3;
	const smoothed = movingAverage(frames, Math.max(1, smoothingWindow));

	if (options.normalizeAxis ?? true) {
		return normalizeAxes(smoothed);
	}

	return smoothed;
};

export const accelerometerToDtwSamples = (
	frames: AccelerometerFrame[],
	options: GesturePreprocessOptions = {}
): Sample[] => {
	const processed = preprocessAccelerometerFrames(frames, options);
	const includeZ = options.includeZ ?? false;

	return processed.map((f) => (includeZ ? [f.x, f.y, f.z] : [f.x, f.y]));
};

// Creates synthetic templates for quick start gesture matching.
export const createCardinalGestureTemplates = (
	length = 24,
	amplitude = 1
): GestureTemplate[] => {
	const n = Math.max(8, length);
	const center = (n - 1) / 2;
	const halfWidth = n / 2;

	const makePulse = (axis: 'x' | 'y', sign: 1 | -1): AccelerometerFrame[] => {
		const out: AccelerometerFrame[] = [];
		for (let i = 0; i < n; i += 1) {
			const distance = Math.abs(i - center);
			const envelope = clamp(1 - distance / halfWidth, 0, 1);
			const value = sign * amplitude * envelope;

			out.push({
				x: axis === 'x' ? value : 0,
				y: axis === 'y' ? value : 0,
				z: 0
			});
		}
		return out;
	};

	return [
		{ label: 'up', frames: makePulse('y', 1) },
		{ label: 'down', frames: makePulse('y', -1) },
		{ label: 'right', frames: makePulse('x', 1) },
		{ label: 'left', frames: makePulse('x', -1) }
	];
};

export const recognizeCardinalGesture = (
	frames: AccelerometerFrame[],
	options: RecognizeGestureOptions = {}
): RecognizeGestureResult => {
	if (frames.length === 0) {
		return { label: null, score: Number.POSITIVE_INFINITY, scores: [], motionEnergy: 0 };
	}

	const minFrames = options.minFrames ?? 12;
	if (frames.length < minFrames) {
		return {
			label: null,
			score: Number.POSITIVE_INFINITY,
			scores: [],
			motionEnergy: 0
		};
	}

	const includeZ = options.includeZ ?? false;
	const motionWindow = options.motionWindow ?? 10;
	const motionEnergy = computeMotionEnergy(frames, Math.max(1, motionWindow), includeZ);
	const motionThreshold = options.motionThreshold ?? 0.03;

	if (motionEnergy < motionThreshold) {
		return {
			label: null,
			score: Number.POSITIVE_INFINITY,
			scores: [],
			motionEnergy
		};
	}

	const templates = options.templates ?? createCardinalGestureTemplates();
	const candidate = accelerometerToDtwSamples(frames, options);
	const window = options.window;

	const scores: GestureScore[] = templates.map((template) => {
		const templateSamples = accelerometerToDtwSamples(template.frames, options);
		const result = dtw(candidate, templateSamples, {
			window,
			normalize: true
		});
		return {
			label: template.label,
			score: result.normalizedCost
		};
	});

	scores.sort((a, b) => a.score - b.score);
	const best = scores[0];
	const threshold = options.threshold;
	const label = threshold !== undefined && best.score > threshold ? null : best.label;

	return {
		label,
		score: best.score,
		scores,
		motionEnergy
	};
};

// Lightweight buffer that lets UI code push sensor frames and classify on demand.
export class AccelerometerGestureBuffer {
	private readonly maxFrames: number;
	private readonly cooldownMs: number;
	private frames: AccelerometerFrame[] = [];
	private lastDetectionTime = 0;

	constructor(maxFrames = 120, cooldownMs = 500) {
		this.maxFrames = Math.max(16, maxFrames);
		this.cooldownMs = Math.max(0, cooldownMs);
	}

	push(frame: AccelerometerFrame): void {
		this.frames.push(frame);
		if (this.frames.length > this.maxFrames) {
			this.frames.shift();
		}
	}

	clear(): void {
		this.frames = [];
	}

	getFrames(): AccelerometerFrame[] {
		return [...this.frames];
	}

	recognize(options: RecognizeGestureOptions = {}): RecognizeGestureResult {
		const now = Date.now();
		if (this.lastDetectionTime > 0 && now - this.lastDetectionTime < this.cooldownMs) {
			return {
				label: null,
				score: Number.POSITIVE_INFINITY,
				scores: []
			};
		}

		const result = recognizeCardinalGesture(this.frames, options);
		if (result.label) {
			this.lastDetectionTime = now;
		}
		return result;
	}
}
