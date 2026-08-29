<script lang="ts">
    import { onMount } from 'svelte';
    import { SceneDirector, VideoScene, GifScene } from '$lib/Walaykatapusan/scenemanager';
    import { getChannel } from '$lib/Walaykatapusan/ably';
    import {
        buildScenes,
        fetchWalaykatapusanContent,
        normalizeMediaUrl,
        type CompactContent,
        type FeedScene
    } from '$lib/Walaykatapusan/feed';

    const UPLOAD_RETENTION_MS = 15 * 60 * 1000;
    const SERVER_REFRESH_MS = 15 * 60 * 1000;

    let container: HTMLDivElement | null = null;
    let subtitleHost: HTMLDivElement | null = null;
    let director: SceneDirector | null = null;
    let imageUploadsChannel: any | null = null;
    let uploadSceneCounter = 0;
    let mediaRegistry = new Map<
        string,
        { expiresAt: number; source: 'api' | 'ably'; sceneId: string; type: 'videoScene' | 'GifScene' }
    >();

    export let rotateLayout = false;

    type FeedAlgorithm = 'linear' | 'random';

    const feedAlgorithm: FeedAlgorithm = 'random';
    let scenes: FeedScene[] = [];

    const buildSceneId = (kind: 'videoScene' | 'GifScene', url: string): string => {
        const hash = Array.from(url).reduce((acc, char) => {
            return (acc * 31 + char.charCodeAt(0)) >>> 0;
        }, 0);

        return `${kind}-${hash.toString(16)}`;
    };

    const loadContent = async (): Promise<void> => {
        const content = await fetchWalaykatapusanContent();
        scenes = buildScenes(content);
    };

    const syncServerFeed = async (): Promise<void> => {
        const content = await fetchWalaykatapusanContent();
        const nextScenes = buildScenes(content);

        for (const scene of nextScenes) {
            const url = normalizeMediaUrl(scene.src);
            if (!url) continue;

            const existing = mediaRegistry.get(url);
            if (existing) {
                existing.expiresAt = Number.POSITIVE_INFINITY;
                continue;
            }

            const sceneId = buildSceneId(scene.type, url);
            mediaRegistry.set(url, {
                expiresAt: Number.POSITIVE_INFINITY,
                source: 'api',
                sceneId,
                type: scene.type
            });

            if (!director) continue;
            if (director.getScene(sceneId)) continue;
            registerScene({ ...scene, id: sceneId });
        }

        scenes = nextScenes;
    };

    const preloadAssets = (scenes: FeedScene[]): Promise<void[]> => {
        const promiseList = scenes
            .filter((scene): scene is FeedScene & { type: 'videoScene' } => scene.type === 'videoScene')
            .map((scene) => {
                return new Promise<void>((resolve) => {
                    const video = document.createElement('video');
                    video.src = scene.src;
                    video.preload = 'auto';

                    const finish = () => {
                        video.removeEventListener('canplaythrough', finish);
                        video.removeEventListener('error', finish);
                        resolve();
                    };

                    video.addEventListener('canplaythrough', finish);
                    video.addEventListener('error', finish);
                });
            });

        return Promise.all(promiseList);
    };

    const registerScene = (scene: FeedScene) => {
        if (!director) return;
        if (director.getScene(scene.id)) return;

        if (scene.type === 'videoScene') {
            director.register(
                new VideoScene({
                    id: scene.id,
                    src: scene.src,
                    loop: scene.loop,
                    muted: scene.muted
                })
            );
        } else {
            director.register(
                new GifScene({
                    id: scene.id,
                    src: scene.src,
                    objectFit: scene.objectFit
                })
            );
        }
    };

    const pruneExpiredUploads = () => {
        const now = Date.now();

        for (const [url, entry] of mediaRegistry.entries()) {
            if (entry.source === 'ably' && entry.expiresAt <= now) {
                mediaRegistry.delete(url);

                if (director?.getScene(entry.sceneId)) {
                    void director.destroy(entry.sceneId, 'manual');
                }
            }
        }
    };

    const rememberActiveMedia = (url: string, ttlMs: number, source: 'api' | 'ably', scene: FeedScene): boolean => {
        const normalizedUrl = normalizeMediaUrl(url);
        if (!normalizedUrl) {
            return false;
        }

        pruneExpiredUploads();

        const existing = mediaRegistry.get(normalizedUrl);
        if (existing) {
            if (source === 'ably') {
                existing.expiresAt = Date.now() + ttlMs;
            }
            return false;
        }

        const expiresAt = source === 'ably' ? Date.now() + ttlMs : Number.POSITIVE_INFINITY;
        mediaRegistry.set(normalizedUrl, {
            expiresAt,
            source,
            sceneId: scene.id,
            type: scene.type
        });
        return true;
    };

    const enqueueUploadedImage = (url: string) => {
        const normalizedUrl = normalizeMediaUrl(url);

        if (!normalizedUrl) {
            return;
        }

        const scene: FeedScene = {
            type: 'GifScene',
            id: `upload-${Date.now()}-${uploadSceneCounter++}`,
            src: normalizedUrl,
            objectFit: 'cover'
        };

        if (!rememberActiveMedia(normalizedUrl, UPLOAD_RETENTION_MS, 'ably', scene)) {
            return;
        }

        if (!director) {
            return;
        }

        registerScene(scene);
        director.enqueueScene(scene.id, true);
    };

    const setupImageUploadChannel = async () => {
        const channel = await getChannel('image_uploads');
        if (!channel) return;

        imageUploadsChannel = channel;
        channel.subscribe((msg: any) => {
            if (msg?.data?.url) {
                enqueueUploadedImage(msg.data.url);
            }
        });
    };

    const initializeDirector = async () => {
        if (!container) return;

        try {
            await loadContent();
        } catch (error) {
            console.error('[walaykatapusan] failed to load content from API', error);
            scenes = [];
        }

        await preloadAssets(scenes);
        await setupImageUploadChannel();

        director = new SceneDirector({
            container,
            transitionDuration: 800,
            selectionMode: feedAlgorithm,
            subtitles: {
                src: '/tracks/chrono2glitch2.vtt',
                loop: true
            },
            ...(rotateLayout && subtitleHost ? { subtitleContainer: subtitleHost } : {})
        });

        scenes.forEach((scene) => {
            const normalizedUrl = normalizeMediaUrl(scene.src);
            if (!normalizedUrl) return;

            const sceneId = scene.id;
            const entry = mediaRegistry.get(normalizedUrl);
            if (!entry) {
                mediaRegistry.set(normalizedUrl, {
                    expiresAt: Number.POSITIVE_INFINITY,
                    source: 'api',
                    sceneId,
                    type: scene.type
                });
            }
            registerScene({ ...scene, id: sceneId });
        });

        await director.next('init');
    };

    onMount(() => {
        let rotateTimer: number | null = null;
        let serverRefreshTimer: number | null = null;

        void initializeDirector();

        rotateTimer = window.setInterval(() => {
            director?.next('algorithm');
        }, 8000);

        serverRefreshTimer = window.setInterval(() => {
            void syncServerFeed().catch((error) => {
                console.error('[walaykatapusan] failed to refresh content from API', error);
            });
        }, SERVER_REFRESH_MS);

        return () => {
            if (rotateTimer !== null) {
                window.clearInterval(rotateTimer);
            }

            if (serverRefreshTimer !== null) {
                window.clearInterval(serverRefreshTimer);
            }

            if (director) {
                void director.destroyAll('manual');
                director = null;
            }

            if (imageUploadsChannel) {
                try {
                    imageUploadsChannel.unsubscribe();
                    imageUploadsChannel.detach();
                } catch (err) {
                    console.warn('[ably] image_uploads cleanup failed', err);
                }
                imageUploadsChannel = null;
            }
        };
    });
</script>

<svelte:head>
    <title>Walay Katapusan</title>
</svelte:head>

<main class:rotated={rotateLayout} class:monochrome={true}>
    <div bind:this={container} class="scene-root"></div>

    {#if rotateLayout}
        <div bind:this={subtitleHost} class="subtitle-host"></div>
    {/if}
</main>

<style>
    main {
        position: fixed;
        inset: 0;
        background:
            linear-gradient(180deg, rgba(255,245,240,0.12), rgba(120,0,18,0.04)),
            url('https://kolown.net/storage/library/chronoescape/loading/kraftpaper.png') center/cover no-repeat;
        isolation: isolate;
    }

    main.rotated {
        inset: unset;
        top: 50%;
        left: 50%;
        width: 100vh;
        height: 100vw;
        transform: translate(-50%, -50%) rotate(-90deg);
        transform-origin: center;
    }

    main.monochrome .scene-root {
        filter: grayscale(1) contrast(0.72) brightness(1.02) saturate(0) sepia(0.08);
        opacity: 0.8;
    }

    main.monochrome::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
            radial-gradient(circle at 50% 50%, rgba(120, 0, 18, 0.18) 0%, rgba(120, 0, 18, 0.09) 26%, transparent 58%),
            linear-gradient(180deg, rgba(120, 0, 18, 0.12), rgba(40, 0, 5, 0.18));
        mix-blend-mode: multiply;
        opacity: 0.9;
        pointer-events: none;
        z-index: 2;
    }

    main.monochrome::after {
        content: '';
        position: absolute;
        inset: -8%;
        background:
            linear-gradient(120deg, transparent 0%, rgba(0,0,0,0.04) 30%, transparent 35%, transparent 42%, rgba(0,0,0,0.03) 48%, transparent 52%, transparent 58%, rgba(0,0,0,0.04) 64%, transparent 70%),
            linear-gradient(180deg, rgba(255,255,255,0.018), rgba(0,0,0,0.08)),
            radial-gradient(circle, rgba(0, 0, 0, 0.12) 0 0.7px, transparent 1.1px) 0 0 / 9px 9px,
            repeating-linear-gradient(
                0deg,
                rgba(255,255,255,0.012),
                rgba(255,255,255,0.012) 1px,
                rgba(0,0,0,0.012) 1px,
                rgba(0,0,0,0.012) 4px
            );
        mix-blend-mode: multiply;
        opacity: 0.9;
        pointer-events: none;
        z-index: 3;
    }

    .scene-root {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #111;
        transition: filter 250ms ease;
    }

    .subtitle-host {
        position: absolute;
        left: 50%;
        bottom: 4%;
        transform: translateX(-50%);
        width: 10rem;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 0.5rem;
        z-index: 9999;
        pointer-events: none;
    }

</style>