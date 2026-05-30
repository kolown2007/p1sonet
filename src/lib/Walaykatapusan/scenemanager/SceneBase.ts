import type { Scene, SceneContext, SceneKind, SceneStatus } from './types';

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
