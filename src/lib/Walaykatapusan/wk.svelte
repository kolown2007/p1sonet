<script lang="ts">
    import { onMount } from 'svelte';
    import { SceneDirector, VideoScene, YoutubeScene, GifScene } from '$lib/Walaykatapusan/scenemanager';
    import content from '$lib/Walaykatapusan/content.json';
    
    let container: HTMLDivElement | null = null;

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
                container: container!, // The ! tells TS container is definitely not null here
                transitionDuration: 800,
                subtitles: {
                    src: '/tracks/chrono2glitch2.vtt',
                    loop: true
                }
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

<main>
    <div bind:this={container} class="scene-root"></div>
    <!-- <div class="status-pill">Auto cycling 3 videos</div> -->
</main>

<style>
    main {
        position: fixed;
        inset: 0;
        background: #111;
    }

    .scene-root {
        width: 100%;
        height: 100%;
    }

   
</style>