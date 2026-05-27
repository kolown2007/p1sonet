export type SceneKind = 'video' | 'canvas' | 'dom' | 'custom';

export type SceneStatus =
	| 'idle'
	| 'loading'
	| 'ready'
	| 'running'
	| 'background'
	| 'destroyed';

export type SceneTransitionReason = 'init' | 'manual' | 'algorithm';

export interface SceneContext {
	container: HTMLElement;
	reason: SceneTransitionReason;
	now: () => number;
	signal: AbortSignal;
}

export interface Scene {
	readonly id: string;
	readonly kind: SceneKind;
	readonly status: SceneStatus;

	load(context: SceneContext): Promise<void>;
	start(context: SceneContext): Promise<void>;
	runInBackground(context: SceneContext): Promise<void>;
	stop(context: SceneContext): Promise<void>;
	destroy(context: SceneContext): Promise<void>;
}

export abstract class SceneBase implements Scene {
	public readonly id: string;
	public readonly kind: SceneKind;
	protected _status: SceneStatus = 'idle';

	protected constructor(id: string, kind: SceneKind = 'custom') {
		this.id = id;
		this.kind = kind;
	}

	public get status(): SceneStatus {
		return this._status;
	}

	public async load(context: SceneContext): Promise<void> {
		this.assertNotDestroyed();
		if (this._status !== 'idle') {
			return;
		}

		this._status = 'loading';
		await this.onLoad(context);
		this._status = 'ready';
	}

	public async start(context: SceneContext): Promise<void> {
		this.assertNotDestroyed();
		if (this._status === 'idle') {
			await this.load(context);
		}

		await this.onStart(context);
		this._status = 'running';
	}

	public async runInBackground(context: SceneContext): Promise<void> {
		this.assertNotDestroyed();
		await this.onBackground(context);
		this._status = 'background';
	}

	public async stop(context: SceneContext): Promise<void> {
		this.assertNotDestroyed();
		await this.onStop(context);
		this._status = 'ready';
	}

	public async destroy(context: SceneContext): Promise<void> {
		if (this._status === 'destroyed') {
			return;
		}

		await this.onDestroy(context);
		this._status = 'destroyed';
	}

	protected async onLoad(_context: SceneContext): Promise<void> {
		// Default no-op
	}

	protected async onStart(_context: SceneContext): Promise<void> {
		// Default no-op
	}

	protected async onBackground(_context: SceneContext): Promise<void> {
		// Default no-op
	}

	protected async onStop(_context: SceneContext): Promise<void> {
		// Default no-op
	}

	protected async onDestroy(_context: SceneContext): Promise<void> {
		// Default no-op
	}

	private assertNotDestroyed(): void {
		if (this._status === 'destroyed') {
			throw new Error(`Scene "${this.id}" is already destroyed.`);
		}
	}
}

export type SceneSelectionAlgorithm = (args: {
	currentId: string | null;
	sceneIds: string[];
	scenes: Map<string, Scene>;
	reason: SceneTransitionReason;
}) => string | null;

export interface SceneDirectorOptions {
	container: HTMLElement;
	algorithm?: SceneSelectionAlgorithm;
	now?: () => number;
}

export class SceneDirector {
	private readonly scenes = new Map<string, Scene>();
	private readonly abortControllers = new Map<string, AbortController>();
	private readonly backgroundIds = new Set<string>();
	private currentId: string | null = null;
	private readonly container: HTMLElement;
	private readonly algorithm?: SceneSelectionAlgorithm;
	private readonly now: () => number;

	public constructor(options: SceneDirectorOptions) {
		this.container = options.container;
		this.algorithm = options.algorithm;
		this.now = options.now ?? (() => performance.now());
	}

	public register(scene: Scene): void {
		if (this.scenes.has(scene.id)) {
			throw new Error(`Scene "${scene.id}" is already registered.`);
		}

		this.scenes.set(scene.id, scene);
	}

	public getScene(id: string): Scene | undefined {
		return this.scenes.get(id);
	}

	public listScenes(): Scene[] {
		return [...this.scenes.values()];
	}

	public getCurrentScene(): Scene | null {
		return this.currentId ? (this.scenes.get(this.currentId) ?? null) : null;
	}

	public async load(id: string, reason: SceneTransitionReason = 'manual'): Promise<void> {
		const scene = this.requireScene(id);
		await scene.load(this.buildContext(id, reason));
	}

	public async play(id: string, reason: SceneTransitionReason = 'manual'): Promise<void> {
		const nextScene = this.requireScene(id);
		await nextScene.load(this.buildContext(id, reason));

		if (this.currentId && this.currentId !== id) {
			const currentScene = this.requireScene(this.currentId);
			await currentScene.runInBackground(this.buildContext(currentScene.id, reason));
			this.backgroundIds.add(currentScene.id);
		}

		this.backgroundIds.delete(id);
		await nextScene.start(this.buildContext(id, reason));
		this.currentId = id;
	}

	public async next(reason: SceneTransitionReason = 'algorithm'): Promise<string | null> {
		const ids = [...this.scenes.keys()];
		if (ids.length === 0) {
			return null;
		}

		const nextId =
			this.algorithm?.({
				currentId: this.currentId,
				sceneIds: ids,
				scenes: this.scenes,
				reason
			}) ?? this.defaultLinearSelection(ids);

		if (!nextId) {
			return null;
		}

		await this.play(nextId, reason);
		return nextId;
	}

	public async stop(id: string, reason: SceneTransitionReason = 'manual'): Promise<void> {
		const scene = this.requireScene(id);
		await scene.stop(this.buildContext(id, reason));

		this.backgroundIds.delete(id);
		if (this.currentId === id) {
			this.currentId = null;
		}
	}

	public async destroy(id: string, reason: SceneTransitionReason = 'manual'): Promise<void> {
		const scene = this.requireScene(id);
		await scene.destroy(this.buildContext(id, reason));

		this.abortControllers.get(id)?.abort();
		this.abortControllers.delete(id);
		this.backgroundIds.delete(id);

		if (this.currentId === id) {
			this.currentId = null;
		}

		this.scenes.delete(id);
	}

	public async destroyAll(reason: SceneTransitionReason = 'manual'): Promise<void> {
		for (const id of [...this.scenes.keys()]) {
			await this.destroy(id, reason);
		}
	}

	private requireScene(id: string): Scene {
		const scene = this.scenes.get(id);
		if (!scene) {
			throw new Error(`Scene "${id}" is not registered.`);
		}

		return scene;
	}

	private defaultLinearSelection(ids: string[]): string {
		if (!this.currentId) {
			return ids[0];
		}

		const index = ids.indexOf(this.currentId);
		if (index < 0) {
			return ids[0];
		}

		return ids[(index + 1) % ids.length];
	}

	private buildContext(id: string, reason: SceneTransitionReason): SceneContext {
		return {
			container: this.container,
			reason,
			now: this.now,
			signal: this.ensureAbortController(id).signal
		};
	}

	private ensureAbortController(id: string): AbortController {
		let controller = this.abortControllers.get(id);
		if (!controller || controller.signal.aborted) {
			controller = new AbortController();
			this.abortControllers.set(id, controller);
		}

		return controller;
	}
}

export interface DomSceneHooks {
	onLoad?: (context: SceneContext) => void | Promise<void>;
	onStart?: (context: SceneContext) => void | Promise<void>;
	onBackground?: (context: SceneContext) => void | Promise<void>;
	onStop?: (context: SceneContext) => void | Promise<void>;
	onDestroy?: (context: SceneContext) => void | Promise<void>;
}

export class DomScene extends SceneBase {
	private readonly hooks: DomSceneHooks;

	public constructor(id: string, hooks: DomSceneHooks) {
		super(id, 'dom');
		this.hooks = hooks;
	}

	protected override async onLoad(context: SceneContext): Promise<void> {
		await this.hooks.onLoad?.(context);
	}

	protected override async onStart(context: SceneContext): Promise<void> {
		await this.hooks.onStart?.(context);
	}

	protected override async onBackground(context: SceneContext): Promise<void> {
		await this.hooks.onBackground?.(context);
	}

	protected override async onStop(context: SceneContext): Promise<void> {
		await this.hooks.onStop?.(context);
	}

	protected override async onDestroy(context: SceneContext): Promise<void> {
		await this.hooks.onDestroy?.(context);
	}
}

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

export interface CanvasSceneHooks {
	onCreate: (canvas: HTMLCanvasElement, context: SceneContext) => void | Promise<void>;
	onStart?: (canvas: HTMLCanvasElement, context: SceneContext) => void | Promise<void>;
	onBackground?: (canvas: HTMLCanvasElement, context: SceneContext) => void | Promise<void>;
	onStop?: (canvas: HTMLCanvasElement, context: SceneContext) => void | Promise<void>;
	onDestroy?: (canvas: HTMLCanvasElement, context: SceneContext) => void | Promise<void>;
}

export class CanvasScene extends SceneBase {
	private readonly hooks: CanvasSceneHooks;
	private readonly className?: string;
	private canvas?: HTMLCanvasElement;

	public constructor(id: string, hooks: CanvasSceneHooks, className?: string) {
		super(id, 'canvas');
		this.hooks = hooks;
		this.className = className;
	}

	protected override async onLoad(context: SceneContext): Promise<void> {
		if (this.canvas) {
			return;
		}

		const canvas = document.createElement('canvas');
		canvas.className = this.className ?? '';
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		this.canvas = canvas;

		await this.hooks.onCreate(canvas, context);
	}

	protected override async onStart(context: SceneContext): Promise<void> {
		if (!this.canvas) {
			return;
		}

		if (!this.canvas.isConnected) {
			context.container.appendChild(this.canvas);
		}

		this.canvas.style.display = 'block';
		await this.hooks.onStart?.(this.canvas, context);
	}

	protected override async onBackground(context: SceneContext): Promise<void> {
		if (!this.canvas) {
			return;
		}

		this.canvas.style.display = 'none';
		await this.hooks.onBackground?.(this.canvas, context);
	}

	protected override async onStop(context: SceneContext): Promise<void> {
		if (!this.canvas) {
			return;
		}

		this.canvas.style.display = 'none';
		await this.hooks.onStop?.(this.canvas, context);
	}

	protected override async onDestroy(context: SceneContext): Promise<void> {
		if (!this.canvas) {
			return;
		}

		await this.hooks.onDestroy?.(this.canvas, context);
		this.canvas.remove();
		this.canvas = undefined;
	}
}

export interface YoutubeSceneOptions {
	id: string;
	/** Any YouTube URL: watch, youtu.be, shorts, or direct embed URL */
	src: string;
	autoplay?: boolean;
	muted?: boolean;
	loop?: boolean;
	controls?: boolean;
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
			throw new Error(`YoutubeScene "${options.id}": could not parse a video ID from "${options.src}"`);
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

		const iframe = document.createElement('iframe');
		iframe.src = this.buildEmbedUrl();
		iframe.allow = 'autoplay; fullscreen; picture-in-picture';
		iframe.allowFullscreen = true;
		iframe.style.cssText = 'width:100%;height:100%;border:none;display:none;';
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

		// Pause playback by blanking src, restore on next start
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
