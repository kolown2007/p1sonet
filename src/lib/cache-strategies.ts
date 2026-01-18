/**
 * Cache strategies for service worker
 */

export const EXTERNAL_PATTERNS = [
	/https:\/\/kolown\.net\//,
	/\.(jpg|jpeg|png|gif|webp|svg)$/i
];

/**
 * Check if a URL matches external resource patterns
 */
export function isExternalResource(url: string): boolean {
	return EXTERNAL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Network-first caching strategy
 * Always tries to fetch fresh content, falls back to cache when offline
 */
export async function networkFirst(
	request: Request,
	cache: Cache,
	dynamicCache: Cache
): Promise<Response> {
	const isExternal = isExternalResource(request.url);

	try {
		const response = await fetch(request);

		if (!(response instanceof Response)) {
			throw new Error('invalid response from fetch');
		}

		// Cache successful responses
		const url = new URL(request.url);
		if (response.status === 200 && url.protocol.startsWith('http')) {
			const cacheToUse = isExternal ? dynamicCache : cache;
			cacheToUse.put(request, response.clone());
		}

		return response;
	} catch (err) {
		// Offline: fall back to cache
		const cachedResponse = await dynamicCache.match(request) || 
		                       await cache.match(request);
		
		if (cachedResponse) {
			return cachedResponse;
		}

		throw err;
	}
}

/**
 * Cache-first strategy for static assets
 */
export async function cacheFirst(
	request: Request,
	cache: Cache
): Promise<Response> {
	const cached = await cache.match(request);
	if (cached) {
		return cached;
	}

	const response = await fetch(request);
	if (response.status === 200) {
		cache.put(request, response.clone());
	}

	return response;
}
