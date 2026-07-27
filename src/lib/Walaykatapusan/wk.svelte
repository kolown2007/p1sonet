<script lang="ts">
    import { onMount } from 'svelte';
    import { SceneDirector, VideoScene, YoutubeScene, GifScene } from '$lib/Walaykatapusan/scenemanager';
    import content from '$lib/Walaykatapusan/content.json';
    
    let container: HTMLDivElement | null = null;
    let subtitleHost: HTMLDivElement | null = null;
    export let rotateLayout = false;

    interface BaseScene {
        type: 'videoScene' | 'GifScene';
        id: string;
        src: string;
        objectFit?: "cover" | "none" | "contain" | "fill" | "scale-down";
        loop?: boolean;
        muted?: boolean;
    }

    const preloadAssets = (scenes: BaseScene[]): Promise<void[]> => {
        const promises: Promise<void>[] = scenes
            .filter((scene): scene is BaseScene & { type: 'videoScene' } => scene.type === 'videoScene')
            .map(scene => {
                return new Promise<void>((resolve) => {
                    const video = document.createElement('video');
                    video.src = scene.src;
                    video.preload = 'auto';
                    
                    const onReady = () => {
                        video.removeEventListener('canplaythrough', onReady);
                        video.removeEventListener('error', onReady);
                        resolve();
                    };

                    video.addEventListener('canplaythrough', onReady);
                    video.addEventListener('error', onReady);
                });
            });
            
        return Promise.all(promises);
    };

    onMount(() => {
        if (!container) return;

        // 1. Declare variables at the top of onMount so the cleanup function can see them
        let director: SceneDirector | undefined;
        let rotateTimer: number | undefined;

        const scenes = content as BaseScene[];

        const initialize = async () => {
            // Wait for videos to load
            await preloadAssets(scenes);

            // 2. Assign to the higher-scoped variable
            director = new SceneDirector({
                container: container!,
                transitionDuration: 800,
                subtitles: {
                    src: '/tracks/chrono2glitch2.vtt',
                    loop: true
                },
                ...(rotateLayout && subtitleHost ? { subtitleContainer: subtitleHost } : {})
            });

            // Register scenes
            scenes.forEach((scene) => {
                switch (scene.type) {
                    case 'videoScene':
                        director!.register(
                            new VideoScene({
                                id: scene.id,
                                src: scene.src,
                                loop: scene.loop,
                                muted: scene.muted
                            })
                        );
                        break;
                    case 'GifScene':
                        director!.register(
                            new GifScene({
                                id: scene.id,
                                src: scene.src,
                                objectFit: scene.objectFit 
                            })
                        );
                        break;
                }
            });

            // 3. Play and set timer AFTER initialization is fully complete
            void director.play('video-1', 'init');

            rotateTimer = window.setInterval(() => {
                void director!.next('algorithm');
            }, 8000);
        };

        // Start the process
        initialize();

        // 4. Cleanup function
        return () => {
            // Safely clear/destroy only if they were successfully created
            if (rotateTimer) window.clearInterval(rotateTimer);
            if (director) void director.destroyAll('manual');
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
        transform: translate(-50%, -50%) rotate(90deg);
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