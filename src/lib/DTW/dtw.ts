export type Sample = number | number[];

/**
 * Configuration for DTW comparison.
 */
export interface DtwOptions {
	// Distance function between two samples (scalar or vector).
	distance?: (a: Sample, b: Sample) => number;
	// Sakoe-Chiba band window in indices. If omitted, no windowing is applied.
	window?: number;
	// When true, return the optimal warping path.
	returnPath?: boolean;
	// Normalize cost by path length to compare different gesture durations.
	normalize?: boolean;
}

/**
 * Result of a DTW comparison.
 */
export interface DtwResult {
	cost: number;
	normalizedCost: number;
	path?: Array<[number, number]>;
	pathLength: number;
}

// Default distance works for both scalar signals and vector samples like [ax, ay, az].
const euclideanDistance = (a: Sample, b: Sample): number => {
	if (typeof a === 'number' && typeof b === 'number') {
		const d = a - b;
		return Math.abs(d);
	}

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) {
			throw new Error(
				`Vector length mismatch: received ${a.length} and ${b.length}`
			);
		}

		let sum = 0;
		for (let i = 0; i < a.length; i += 1) {
			const d = a[i] - b[i];
			sum += d * d;
		}
		return Math.sqrt(sum);
	}

	throw new Error('Sample type mismatch. Use all numbers or all vectors.');
};

// Walk backward from the bottom-right corner of the accumulated cost matrix
// to recover the minimum-cost alignment path.
const backtrackPath = (acc: number[][]): Array<[number, number]> => {
	const path: Array<[number, number]> = [];
	let i = acc.length - 1;
	let j = acc[0].length - 1;

	while (i > 0 || j > 0) {
		// Matrix has a 1-cell padding border, so convert matrix indices back to sequence indices.
		path.push([i - 1, j - 1]);

		if (i === 0) {
			j -= 1;
			continue;
		}
		if (j === 0) {
			i -= 1;
			continue;
		}

		const diag = acc[i - 1][j - 1];
		const up = acc[i - 1][j];
		const left = acc[i][j - 1];

		// Prefer diagonal when tied to keep alignments less stretched.
		if (diag <= up && diag <= left) {
			i -= 1;
			j -= 1;
		} else if (up < left) {
			i -= 1;
		} else {
			j -= 1;
		}
	}

	path.reverse();
	return path;
};

/**
 * Compare two time series using Dynamic Time Warping (DTW).
 *
 * Works with scalar samples (e.g. 1D signal) or vectors
 * (e.g. phone accelerometer frames like [ax, ay, az]).
 *
 * @example
 * const template = [[0, 0, 1], [0.1, 0.2, 0.9], [0.4, 0.3, 0.8]];
 * const live = [[0, 0, 1], [0.12, 0.18, 0.88], [0.42, 0.31, 0.79]];
 *
 * const result = dtw(template, live, {
 *   returnPath: true,
 *   normalize: true,
 *   window: 20
 * });
 *
 * // Lower score means more similar gesture.
 * console.log(result.cost, result.pathLength);
 *
 * @param sequenceA First sequence to compare.
 * @param sequenceB Second sequence to compare.
 * @param options Optional DTW behavior controls.
 * @returns DTW cost metrics and optional alignment path.
 */
export const dtw = (
	sequenceA: Sample[],
	sequenceB: Sample[],
	options: DtwOptions = {}
): DtwResult => {
	if (sequenceA.length === 0 || sequenceB.length === 0) {
		throw new Error('DTW requires two non-empty sequences.');
	}

	const distance = options.distance ?? euclideanDistance;
	const n = sequenceA.length;
	const m = sequenceB.length;
	const window = options.window ?? Math.max(n, m);

	// Ensure the band is wide enough to allow start-to-end alignment for unequal lengths.
	const w = Math.max(window, Math.abs(n - m));

	// acc[i][j] = best cumulative cost to align first i items of A with first j items of B.
	const acc = Array.from({ length: n + 1 }, () =>
		Array.from({ length: m + 1 }, () => Number.POSITIVE_INFINITY)
	);
	acc[0][0] = 0;

	for (let i = 1; i <= n; i += 1) {
		// Evaluate only inside the Sakoe-Chiba band to reduce runtime and prevent extreme warps.
		const jStart = Math.max(1, i - w);
		const jEnd = Math.min(m, i + w);

		for (let j = jStart; j <= jEnd; j += 1) {
			const cost = distance(sequenceA[i - 1], sequenceB[j - 1]);
			const bestPrevious = Math.min(acc[i - 1][j], acc[i][j - 1], acc[i - 1][j - 1]);
			acc[i][j] = cost + bestPrevious;
		}
	}

	const totalCost = acc[n][m];
	if (!Number.isFinite(totalCost)) {
		throw new Error(
			'No valid DTW path found. Try increasing the window constraint.'
		);
	}

	const path = options.returnPath ? backtrackPath(acc) : undefined;
	// If path is not requested, use a coarse fallback for normalization.
	const pathLength = path?.length ?? (n + m);
	const normalizedCost = totalCost / pathLength;

	return {
		cost: options.normalize ? normalizedCost : totalCost,
		normalizedCost,
		path,
		pathLength
	};
};

export default dtw;
