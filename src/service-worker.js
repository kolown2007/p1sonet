/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';
import { networkFirst, cacheFirst } from '$lib/cache-strategies.ts';

const CACHE = `cache-${version}`;
const DYNAMIC_CACHE = `dynamic-${version}`;

const ASSETS = [
	...build,
	...files
];

self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE && key !== DYNAMIC_CACHE) {
				await caches.delete(key);
			}
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);
		const dynamicCache = await caches.open(DYNAMIC_CACHE);

		// Static app assets - cache first (versioned)
		if (ASSETS.includes(url.pathname)) {
			return cacheFirst(event.request, cache);
		}

		// Everything else - network first with cache fallback
		return networkFirst(event.request, cache, dynamicCache);
	}

	event.respondWith(respond());
});