interface VttCue {
	start: number; // seconds
	end: number;
	lines: string[];
}

function parseTimestamp(ts: string): number {
	const parts = ts.trim().split(':');
	if (parts.length === 3) {
		return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + parseFloat(parts[2]);
	}
	if (parts.length === 2) {
		return Number(parts[0]) * 60 + parseFloat(parts[1]);
	}
	return 0;
}

function parseVtt(raw: string): VttCue[] {
	const cues: VttCue[] = [];

	for (const block of raw.replace(/\r\n/g, '\n').split(/\n\n+/)) {
		const lines = block.trim().split('\n');
		const tsIndex = lines.findIndex((l) => l.includes('-->'));
		if (tsIndex < 0) continue;

		const [startStr, endRaw] = lines[tsIndex].split('-->');
		// Strip any position/alignment cues that follow the end timestamp
		const endStr = endRaw.trim().split(' ')[0];
		const start = parseTimestamp(startStr);
		const end = parseTimestamp(endStr);

		const text = lines
			.slice(tsIndex + 1)
			.join('\n')
			.trim();
		if (text) {
			cues.push({ start, end, lines: text.split('\n') });
		}
	}

	return cues.sort((a, b) => a.start - b.start);
}

export interface SubtitleOverlayOptions {
	/** URL to a WebVTT (.vtt) file */
	src: string;
	/** Extra CSS class applied to the overlay element */
	className?: string;
	/** Loop the track when it ends. Defaults to true. */
	loop?: boolean;
}

/**
 * Persistent subtitle overlay that sits on top of all scene wrappers and
 * renders VTT cues continuously, surviving scene transitions.
 */
export class SubtitleOverlay {
	private readonly container: HTMLElement;
	private readonly options: SubtitleOverlayOptions;
	private readonly el: HTMLDivElement;
	private cues: VttCue[] = [];
	private duration = 0;
	private startedAt: number | null = null;
	private rafId: number | null = null;

	public constructor(container: HTMLElement, options: SubtitleOverlayOptions) {
		this.container = container;
		this.options = options;

		const el = document.createElement('div');
		if (options.className) el.className = options.className;
		el.style.cssText = [
			'position:absolute',
			'bottom:10%',
			'left:50%',
			'transform:translateX(-50%)',
			'z-index:9999',
			'pointer-events:none',
			'text-align:center',
			'color:#fff',
			'font-size:clamp(18px,3.5vw,28px)',
			'font-family:sans-serif',
			'text-shadow:0 5px 6px rgba(0,0,0,.85),0 0 2px rgba(0,0,0,.6)',
			'max-width:80%',
			'line-height:1.5',
			'display:none'
		].join(';');
		this.el = el;
	}

	public async load(): Promise<void> {
		const res = await fetch(this.options.src);
		if (!res.ok) {
			throw new Error(
				`SubtitleOverlay: could not fetch "${this.options.src}" (${res.status})`
			);
		}
		this.cues = parseVtt(await res.text());
		this.duration = this.cues.length > 0 ? this.cues[this.cues.length - 1].end : 0;
	}

	public start(): void {
		if (!this.el.isConnected) {
			this.container.appendChild(this.el);
		}
		this.el.style.display = 'block';
		this.startedAt = performance.now();
		this.tick();
	}

	public stop(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.startedAt = null;
		this.el.style.display = 'none';
		this.el.innerHTML = '';
	}

	public destroy(): void {
		this.stop();
		this.el.remove();
	}

	private tick(): void {
		if (this.startedAt === null) return;

		let elapsed = (performance.now() - this.startedAt) / 1000;

		if (this.duration > 0 && elapsed >= this.duration) {
			if (this.options.loop !== false) {
				this.startedAt = performance.now();
				elapsed = 0;
			} else {
				this.setCue(null);
				return;
			}
		}

		const cue = this.cues.find((c) => elapsed >= c.start && elapsed < c.end) ?? null;
		this.setCue(cue);
		this.rafId = requestAnimationFrame(() => this.tick());
	}

	private setCue(cue: VttCue | null): void {
		// Avoid unnecessary DOM writes
		const next = cue ? cue.lines.join('\n') : '';
		if (this.el.dataset['cue'] === next) return;
		this.el.dataset['cue'] = next;

		this.el.innerHTML = '';
		if (!cue) return;

		for (let i = 0; i < cue.lines.length; i++) {
			const span = document.createElement('span');
			span.textContent = cue.lines[i];
			this.el.appendChild(span);
			if (i < cue.lines.length - 1) {
				this.el.appendChild(document.createElement('br'));
			}
		}
	}
}
