import { SceneBase } from '../SceneBase';
import type { SceneContext } from '../types';

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
