import { SceneBase } from '../SceneBase';
import type { SceneContext } from '../types';

export interface GifSceneOptions {
	id: string;
	/** URL to an image file (GIF, PNG, JPG, etc.) that the browser can display in an <img>. */
	src: string;
	className?: string;
	/** How to fit the image in the container. Defaults to 'cover'. */
	objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export class GifScene extends SceneBase {
	private readonly options: GifSceneOptions;
	private element?: HTMLImageElement;

	public constructor(options: GifSceneOptions) {
		super(options.id, 'image');
		this.options = options;
	}

	protected override async onLoad(_context: SceneContext): Promise<void> {
		if (this.element) {
			return;
		}

		const img = document.createElement('img');
		img.src = this.options.src;
		img.className = this.options.className ?? '';
		img.style.cssText = [
			'width:100%',
			'height:100%',
			`object-fit:${this.options.objectFit ?? 'cover'}`,
			'display:none'
		].join(';');

		// Wait for the first frame to decode so the transition isn't blank
		await img.decode().catch(() => undefined);

		this.element = img;
	}

	protected override async onStart(context: SceneContext): Promise<void> {
		if (!this.element) {
			return;
		}

		if (!this.element.isConnected) {
			context.container.appendChild(this.element);
		}

		this.element.style.display = 'block';
	}

	protected override async onBackground(_context: SceneContext): Promise<void> {
		if (!this.element) {
			return;
		}

		// Hide the element — the GIF resets to frame 1 when re-shown, which is
		// the same behaviour browsers use for off-screen GIFs.
		this.element.style.display = 'none';
	}

	protected override async onStop(_context: SceneContext): Promise<void> {
		if (!this.element) {
			return;
		}

		this.element.style.display = 'none';
	}

	protected override async onDestroy(_context: SceneContext): Promise<void> {
		if (!this.element) {
			return;
		}

		this.element.remove();
		this.element.src = '';
		this.element = undefined;
	}
}
