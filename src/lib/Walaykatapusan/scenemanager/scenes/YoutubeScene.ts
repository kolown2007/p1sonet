import { SceneBase } from '../SceneBase';
import type { SceneContext } from '../types';

export interface YoutubeSceneOptions {
	id: string;
	/** Any YouTube URL: watch, youtu.be, shorts, or direct embed URL */
	src: string;
	autoplay?: boolean;
	muted?: boolean;
	loop?: boolean;
	controls?: boolean;
	/**
	 * Scale the player up so it fills the container edge-to-edge with no black
	 * bars (like object-fit: cover on a video). Defaults to true.
	 */
	coverFill?: boolean;
}

function parseYoutubeId(url: string): string | null {
	try {
		const u = new URL(url);

		// Already an embed URL
		if (u.pathname.startsWith('/embed/')) {
			return u.pathname.split('/embed/')[1].split('/')[0] || null;
		}

		// youtu.be/VIDEO_ID
		if (u.hostname === 'youtu.be') {
			return u.pathname.slice(1).split('/')[0] || null;
		}

		// /shorts/VIDEO_ID
		const shortsMatch = u.pathname.match(/^\/shorts\/([^/]+)/);
		if (shortsMatch) {
			return shortsMatch[1];
		}

		// ?v=VIDEO_ID
		const v = u.searchParams.get('v');
		if (v) {
			return v;
		}

		return null;
	} catch {
		return null;
	}
}

export class YoutubeScene extends SceneBase {
	private readonly options: YoutubeSceneOptions;
	private readonly videoId: string;
	private iframe?: HTMLIFrameElement;

	public constructor(options: YoutubeSceneOptions) {
		super(options.id, 'custom');

		const id = parseYoutubeId(options.src);
		if (!id) {
			throw new Error(
				`YoutubeScene "${options.id}": could not parse a video ID from "${options.src}"`
			);
		}

		this.options = options;
		this.videoId = id;
	}

	private buildEmbedUrl(): string {
		const autoplay = this.options.autoplay !== false ? 1 : 0;
		const mute = this.options.muted !== false ? 1 : 0;
		const loop = this.options.loop !== false ? 1 : 0;
		const controls = this.options.controls ? 1 : 0;

		const params = new URLSearchParams({
			autoplay: String(autoplay),
			mute: String(mute),
			loop: String(loop),
			controls: String(controls),
			playsinline: '1',
			rel: '0',
			...(loop ? { playlist: this.videoId } : {})
		});

		return `https://www.youtube.com/embed/${this.videoId}?${params.toString()}`;
	}

	protected override async onLoad(_context: SceneContext): Promise<void> {
		if (this.iframe) {
			return;
		}

		const coverFill = this.options.coverFill !== false;

		const iframe = document.createElement('iframe');
		iframe.src = this.buildEmbedUrl();
		iframe.allow = 'autoplay; fullscreen; picture-in-picture';
		iframe.allowFullscreen = true;
		// Cover-fill: oversizes the iframe so the 16:9 player fills any aspect
		// ratio container without black bars, mirroring object-fit:cover.
		iframe.style.cssText = coverFill
			? [
					'position:absolute',
					'top:50%',
					'left:50%',
					'width:100vw',
					'height:56.25vw',  /* 16:9 — grows with viewport width */
					'min-height:100vh',
					'min-width:177.78vh', /* 16:9 — grows with viewport height */
					'transform:translate(-50%,-50%)',
					'border:none',
					'pointer-events:none',
					'display:none'
			  ].join(';')
			: 'width:100%;height:100%;border:none;display:none;';
		this.iframe = iframe;
	}

	protected override async onStart(context: SceneContext): Promise<void> {
		if (!this.iframe) {
			return;
		}

		if (!this.iframe.isConnected) {
			context.container.appendChild(this.iframe);
		}

		this.iframe.style.display = 'block';
	}

	protected override async onBackground(_context: SceneContext): Promise<void> {
		if (!this.iframe) {
			return;
		}

		this.iframe.style.display = 'none';
		this.iframe.src = '';
	}

	protected override async onStop(_context: SceneContext): Promise<void> {
		if (!this.iframe) {
			return;
		}

		this.iframe.style.display = 'none';
		this.iframe.src = '';
	}

	protected override async onDestroy(_context: SceneContext): Promise<void> {
		if (!this.iframe) {
			return;
		}

		this.iframe.src = '';
		this.iframe.remove();
		this.iframe = undefined;
	}
}
