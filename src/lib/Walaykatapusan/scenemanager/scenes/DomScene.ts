import { SceneBase } from '../SceneBase';
import type { SceneContext } from '../types';

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
