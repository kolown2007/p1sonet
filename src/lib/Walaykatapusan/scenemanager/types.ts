export type SceneKind = 'video' | 'canvas' | 'dom' | 'image' | 'custom';

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
