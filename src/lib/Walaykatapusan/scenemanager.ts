// Barrel — re-exports the full public API from sub-modules.
// Import from this file as before: import { SceneDirector, VideoScene } from '$lib/Walaykatapusan/scenemanager'

export type { SceneKind, SceneStatus, SceneTransitionReason, SceneContext, Scene } from './scenemanager/types';
export { SceneBase } from './scenemanager/SceneBase';
export type { SceneSelectionAlgorithm, SceneDirectorOptions } from './scenemanager/SceneDirector';
export { SceneDirector } from './scenemanager/SceneDirector';
export type { SubtitleOverlayOptions } from './scenemanager/SubtitleOverlay';
export { SubtitleOverlay } from './scenemanager/SubtitleOverlay';
export type { DomSceneHooks } from './scenemanager/scenes/DomScene';
export { DomScene } from './scenemanager/scenes/DomScene';
export type { VideoTrack, VideoSceneOptions } from './scenemanager/scenes/VideoScene';
export { VideoScene } from './scenemanager/scenes/VideoScene';
export type { CanvasSceneHooks } from './scenemanager/scenes/CanvasScene';
export { CanvasScene } from './scenemanager/scenes/CanvasScene';
export type { YoutubeSceneOptions } from './scenemanager/scenes/YoutubeScene';
export { YoutubeScene } from './scenemanager/scenes/YoutubeScene';
export type { GifSceneOptions } from './scenemanager/scenes/GifScene';
export { GifScene } from './scenemanager/scenes/GifScene';
