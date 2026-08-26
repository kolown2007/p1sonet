<script lang="ts">
    import { onMount } from 'svelte';
    import { SceneDirector, VideoScene, GifScene } from '$lib/Walaykatapusan/scenemanager';
    import { getChannel } from '$lib/Walaykatapusan/ably';
    import content from '$lib/Walaykatapusan/content.json';

    let container: HTMLDivElement | null = null;
    let subtitleHost: HTMLDivElement | null = null;
    let director: SceneDirector | null = null;
    let imageUploadsChannel: any | null = null;
    let pendingUploadUrls: string[] = [];
    let uploadSceneCounter = 0;

    export let rotateLayout = false;

    type FeedAlgorithm = 'linear' | 'random';

    interface BaseScene {
        type: 'videoScene' | 'GifScene';
        id: string;
        src: string;
        objectFit?: 'cover' | 'none' | 'contain' | 'fill' | 'scale-down';
        loop?: boolean;
        muted?: boolean;
    }

    interface CompactContent {
        videos: string[];
        gifs: string[];
    }

    const feedAlgorithm: FeedAlgorithm = 'random';

    const scenes: BaseScene[] = [
        ...(content as CompactContent).videos.map((src, index) => ({
            type: 'videoScene' as const,
            id: `video-${index + 1}`,
            src,
            loop: true,
            muted: true
        })),
        ...(content as CompactContent).gifs.map((src, index) => ({
            type: 'GifScene' as const,
            id: `gif-${index + 1}`,
            src,
            objectFit: 'cover' as const
        }))
    ];

    const preloadAssets = (scenes: BaseScene[]): Promise<void[]> => {
        const promiseList = scenes
            .filter((scene): scene is BaseScene & { type: 'videoScene' } => scene.type === 'videoScene')
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

    const registerScene = (scene: BaseScene) => {
        if (!director) return;

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

    const enqueueUploadedImage = (url: string) => {
        if (!director) {
            pendingUploadUrls.push(url);
            return;
        }

        const id = `upload-${Date.now()}-${uploadSceneCounter++}`;
        director.register(
            new GifScene({
                id,
                src: url,
                objectFit: 'cover'
            })
        );
        director.enqueueScene(id, true);
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

        scenes.forEach(registerScene);
        pendingUploadUrls.forEach(enqueueUploadedImage);
        pendingUploadUrls = [];

        await director.next('init');
    };

    onMount(() => {
        let rotateTimer: number | null = null;

        void initializeDirector();

        rotateTimer = window.setInterval(() => {
            director?.next('algorithm');
        }, 8000);

        return () => {
            if (rotateTimer !== null) {
                window.clearInterval(rotateTimer);
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

<main class:rotated={rotateLayout}>
    <div bind:this={container} class="scene-root"></div>

    {#if rotateLayout}
        <div bind:this={subtitleHost} class="subtitle-host"></div>
    {/if}
</main>

<style>
    main {
        position: fixed;
        inset: 0;
        background: #111;
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

    .scene-root {
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #111;
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