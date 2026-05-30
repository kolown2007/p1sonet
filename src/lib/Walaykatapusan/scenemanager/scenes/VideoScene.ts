import { SceneBase } from '../SceneBase';
import type { SceneContext } from '../types';

export interface VideoTrack {
	/** URL to a WebVTT (.vtt) file */
	src: string;
	kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
	srclang?: string;
	label?: string;
	default?: boolean;
}

export interface VideoSceneOptions {
	id: string;
	src: string;
	className?: string;
	loop?: boolean;
	muted?: boolean;
	keepPlayingInBackground?: boolean;
	tracks?: VideoTrack[];
}

export class VideoScene extends SceneBase {
	private readonly options: VideoSceneOptions;
	private element?: HTMLVideoElement;

	public constructor(options: VideoSceneOptions) {
		super(options.id, 'video');
		this.options = options;
	}

	protected override async onLoad(_context: SceneContext): Promise<void> {
		if (this.element) {
			return;
		}

		const video = document.createElement('video');
		video.src = this.options.src;
		video.preload = 'auto';
		video.loop = this.options.loop ?? false;
		video.muted = this.options.muted ?? true;
		video.playsInline = true;
		video.className = this.options.className ?? '';
		video.style.width = '100%';
		video.style.height = '100%';
		video.style.objectFit = 'cover';

		for (const track of this.options.tracks ?? []) {
			const el = document.createElement('track');
			el.src = track.src;
			el.kind = track.kind;
			if (track.srclang) el.srclang = track.srclang;
			if (track.label) el.label = track.label;
			if (track.default) el.default = true;
			video.appendChild(el);
		}

		this.element = video;
	}

	protected override async onStart(context: SceneContext): Promise<void> {
		if (!this.element) {
			return;
		}

		if (!this.element.isConnected) {
			context.container.appendChild(this.element);
		}

		this.element.style.display = 'block';
		await this.element.play().catch(() => undefined);
	}

	protected override async onBackground(_context: SceneContext): Promise<void> {
		if (!this.element) {
			return;
		}

		if (!this.options.keepPlayingInBackground) {
			this.element.pause();
		}

		this.element.style.display = 'none';
	}

	protected override async onStop(_context: SceneContext): Promise<void> {
		if (!this.element) {
			return;
		}

		this.element.pause();
		this.element.style.display = 'none';
	}

	protected override async onDestroy(_context: SceneContext): Promise<void> {
		if (!this.element) {
			return;
		}

		this.element.pause();
		this.element.remove();
		this.element.src = '';
		this.element.load();
		this.element = undefined;
	}
}
