let realtime: any = null;

/**
 * Initialize (or return existing) Ably Realtime client.
 * Uses dynamic import to avoid SSR issues and an authCallback that mirrors your component.
 */
export async function initAbly(): Promise<any | null> {
	if (typeof window === 'undefined') return null;
	if (realtime) return realtime;

	const { Realtime } = await import('ably');

	realtime = new Realtime({
		authCallback: async (tokenParams: any, callback: any) => {
			try {
				const res = await fetch('https://kolown.net/api/ghost_auth', {
					method: 'GET',
					credentials: 'include'
				});
				if (!res.ok) return callback(new Error('auth failed: ' + res.status));
				const tokenRequest = await res.json();
				callback(null, tokenRequest);
			} catch (err) {
				callback(err);
			}
		}
	});

	realtime.connection.on('connected', () => {
		console.log('[ably] connected');
	});
	realtime.connection.on('disconnected', () => {
		console.log('[ably] disconnected');
	});
	realtime.connection.on('failed', (err: any) => {
		console.error('[ably] connection failed', err);
	});

	return realtime;
}

export function getAbly(): any | null {
	return realtime;
}

/**
 * Get (and attach) a channel. Returns null on SSR or failure.
 */
export async function getChannel(name: string, opts?: any): Promise<any | null> {
	const r = await initAbly();
	if (!r) return null;
	const ch = r.channels.get(name, opts);
	try {
		await ch.attach();
	} catch (e) {
		// attach may fail; still return channel to let caller decide
		console.warn('[ably] channel attach failed', name, e);
	}
	return ch;
}

export async function publishToChannel(
	channelName: string,
	event: string,
	data: any
): Promise<void> {
	const ch = await getChannel(channelName);
	if (!ch) throw new Error('Ably channel not available');
	ch.publish(event, data);
}

export function closeAbly(): void {
	if (realtime) {
		try {
			realtime.close();
		} catch (e) {
			/* ignore */
		}
		realtime = null;
	}
}