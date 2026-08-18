import type { Scene, SceneContext, SceneTransitionReason } from './types';
import { SubtitleOverlay, type SubtitleOverlayOptions } from './SubtitleOverlay';

export type SceneSelectionAlgorithm = (args: {
	currentId: string | null;
	sceneIds: string[];
	scenes: Map<string, Scene>;
	reason: SceneTransitionReason;
}) => string | null;

export type SceneSelectionMode = 'linear' | 'random';

export interface SceneDirectorOptions {
	container: HTMLElement;
	algorithm?: SceneSelectionAlgorithm;
	selectionMode?: SceneSelectionMode;
	now?: () => number;
	/**
	 * Duration of the TikTok-style slide-up transition in milliseconds.
	 * Set to 0 to disable (instant switch). Defaults to 0.
	 */
	transitionDuration?: number;
	/**
	 * CSS easing for the slide transition. Defaults to a smooth ease-out.
	 */
	transitionEasing?: string;
	/**
	 * Global subtitle overlay shown on top of every scene continuously.
	 * Pass a VTT file URL and the director will load and run it automatically.
	 */
	subtitles?: SubtitleOverlayOptions;
	/**
	 * Optional alternative container for the subtitle overlay.
	 * Useful when the main container is rotated and you want the subtitle
	 * to be positioned relative to the viewport instead.
	 */
	subtitleContainer?: HTMLElement;
}

export class SceneDirector {
	private readonly scenes = new Map<string, Scene>();
	private readonly abortControllers = new Map<string, AbortController>();
	private readonly backgroundIds = new Set<string>();
	private readonly wrappers = new Map<string, HTMLDivElement>();
	private readonly queue: string[] = [];
	private readonly singleUseSceneIds = new Set<string>();
	private currentId: string | null = null;
	private readonly container: HTMLElement;
	private readonly algorithm?: SceneSelectionAlgorithm;
	private readonly now: () => number;
	private readonly transitionDuration: number;
	private readonly transitionEasing: string;
	private readonly subtitleOverlay?: SubtitleOverlay;

	public constructor(options: SceneDirectorOptions) {
		this.container = options.container;
		this.algorithm =
			options.algorithm ?? this.createBuiltInSelectionAlgorithm(options.selectionMode ?? 'linear');
		this.now = options.now ?? (() => performance.now());
		this.transitionDuration = options.transitionDuration ?? 0;
		this.transitionEasing = options.transitionEasing ?? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

		// Required for absolute wrapper positioning (also needed by the subtitle overlay)
		if (this.transitionDuration > 0 || options.subtitles) {
			const s = this.container.style;
			if (s.position !== 'relative' && s.position !== 'absolute' && s.position !== 'fixed') {
				s.position = 'relative';
			}
			s.overflow = 'hidden';
		}

		if (options.subtitles) {
			const subtitleHost = options.subtitleContainer ?? this.container;
			this.subtitleOverlay = new SubtitleOverlay(subtitleHost, options.subtitles);
			void this.subtitleOverlay.load().then(() => this.subtitleOverlay!.start());
		}
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
		const prevId = this.currentId && this.currentId !== id ? this.currentId : null;

		await nextScene.load(this.buildContext(id, reason));

		if (prevId && this.transitionDuration > 0) {
			// ---- Animated slide-up transition ----
			const outWrapper = this.getOrCreateWrapper(prevId);
			const inWrapper = this.getOrCreateWrapper(id);

			if (!inWrapper.isConnected) {
				this.container.appendChild(inWrapper);
			}
			inWrapper.style.display = 'block';
			inWrapper.style.zIndex = '1';
			outWrapper.style.zIndex = '2';

			this.backgroundIds.delete(id);
			await nextScene.start(this.buildContext(id, reason));

			await this.animateSlide(outWrapper, inWrapper);

			const prevScene = this.requireScene(prevId);
			await prevScene.runInBackground(this.buildContext(prevId, reason));
			this.backgroundIds.add(prevId);
			if (this.isSingleUse(prevId)) {
				await this.destroy(prevId, reason);
			}
			outWrapper.style.display = 'none';
			outWrapper.style.zIndex = '';
			inWrapper.style.zIndex = '';
		} else {
			// ---- Instant switch (no transition) ----
			if (prevId) {
				const prevScene = this.requireScene(prevId);
				await prevScene.runInBackground(this.buildContext(prevId, reason));
				this.backgroundIds.add(prevId);
				if (this.isSingleUse(prevId)) {
					await this.destroy(prevId, reason);
				}
				if (this.transitionDuration > 0) {
					const outWrapper = this.wrappers.get(prevId);
					if (outWrapper) outWrapper.style.display = 'none';
				}
			}

			this.backgroundIds.delete(id);
			await nextScene.start(this.buildContext(id, reason));
		}

		this.currentId = id;
	}

	public enqueueScene(id: string, singleUse = true): void {
		if (!this.scenes.has(id)) {
			throw new Error(`Cannot queue scene "${id}" because it is not registered.`);
		}

		if (!this.queue.includes(id)) {
			this.queue.push(id);
		}

		if (singleUse) {
			this.singleUseSceneIds.add(id);
		}
	}

	public async next(reason: SceneTransitionReason = 'algorithm'): Promise<string | null> {
		const ids = [...this.scenes.keys()];
		if (ids.length === 0) {
			return null;
		}

		let nextId: string | null = null;
		if (this.queue.length > 0) {
			nextId = this.queue.shift() ?? null;
		} else {
			const selectableIds = ids.filter((sceneId) => !this.singleUseSceneIds.has(sceneId));
			const result = this.algorithm?.({
				currentId: this.currentId,
				sceneIds: selectableIds.length ? selectableIds : ids,
				scenes: this.scenes,
				reason
			});
			nextId = result ?? null;
		}

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

		const wrapper = this.wrappers.get(id);
		if (wrapper) {
			wrapper.remove();
			this.wrappers.delete(id);
		}

		if (this.currentId === id) {
			this.currentId = null;
		}

		this.scenes.delete(id);
		this.singleUseSceneIds.delete(id);
	}

	public async destroyAll(reason: SceneTransitionReason = 'manual'): Promise<void> {
		for (const id of [...this.scenes.keys()]) {
			await this.destroy(id, reason);
		}
		this.subtitleOverlay?.destroy();
	}

	private getOrCreateWrapper(id: string): HTMLDivElement {
		let wrapper = this.wrappers.get(id);
		if (!wrapper) {
			wrapper = document.createElement('div');
			wrapper.style.cssText =
				'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;';
			this.wrappers.set(id, wrapper);
			this.container.appendChild(wrapper);
		}
		return wrapper;
	}

	private animateSlide(outgoing: HTMLDivElement, incoming: HTMLDivElement): Promise<void> {
		return new Promise((resolve) => {
			const opts: KeyframeAnimationOptions = {
				duration: this.transitionDuration,
				easing: this.transitionEasing,
				fill: 'forwards'
			};

			outgoing.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], opts);

			const anim = incoming.animate(
				[{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
				opts
			);

			anim.onfinish = () => resolve();
			anim.oncancel = () => resolve();
		});
	}

	private isSingleUse(id: string): boolean {
		return this.singleUseSceneIds.has(id);
	}

	private requireScene(id: string): Scene {
		const scene = this.scenes.get(id);
		if (!scene) {
			throw new Error(`Scene "${id}" is not registered.`);
		}

		return scene;
	}

	private createBuiltInSelectionAlgorithm(mode: SceneSelectionMode): SceneSelectionAlgorithm {
		if (mode === 'random') {
			return ({ currentId, sceneIds }) => {
				if (sceneIds.length === 0) {
					return null;
				}

				if (sceneIds.length === 1) {
					return sceneIds[0];
				}

				const availableIds = currentId ? sceneIds.filter((id) => id !== currentId) : sceneIds;
				return availableIds[Math.floor(Math.random() * availableIds.length)];
			};
		}

		return ({ currentId, sceneIds }) => {
			if (!currentId) {
				return sceneIds[0];
			}

			const index = sceneIds.indexOf(currentId);
			if (index < 0) {
				return sceneIds[0];
			}

			return sceneIds[(index + 1) % sceneIds.length];
		};
	}

	private buildContext(id: string, reason: SceneTransitionReason): SceneContext {
		const container =
			this.transitionDuration > 0 ? this.getOrCreateWrapper(id) : this.container;
		return {
			container,
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
