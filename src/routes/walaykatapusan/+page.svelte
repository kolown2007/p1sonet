<script lang="ts">
    import { onMount } from 'svelte';
    import { SceneDirector, VideoScene, YoutubeScene } from '$lib/Walaykatapusan/scenemanager';

    let container: HTMLDivElement | null = null;

    onMount(() => {
        if (!container) {
            return;
        }

        const director = new SceneDirector({ container });

        director.register(
            new VideoScene({
                id: 'video-1',
                src: 'https://kolown.net/storage/library/chronoescape/videos/chrono2glitch.mp4',
                loop: true,
                muted: true,
                tracks: [
                    {
                        kind: 'subtitles',
                        src: '/tracks/chrono2glitch.vtt',
                        srclang: 'en',
                        label: 'English',
                        default: true
                    }
                ]
            })
        );

        // director.register(
        //     new VideoScene({
        //         id: 'video-2',
        //         src: 'https://kolown.net/storage/library/chronoescape/videos/cocoglitch.mp4',
        //         loop: true,
        //         muted: true
        //     })
        // );

        director.register(
            new VideoScene({
                id: 'video-3',
                src: 'https://kolown.net/storage/library/chronoescape/videos/fortnite.mp4',
                loop: true,
                muted: true
            })
        );

        director.register(
            new YoutubeScene({
                id: 'yt-clip',
                src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                loop: true,
                muted: true
            })
        );

        void director.play('video-1', 'init');

        const rotateTimer = window.setInterval(() => {
            void director.next('algorithm');
        }, 8000);

        return () => {
            window.clearInterval(rotateTimer);
            void director.destroyAll('manual');
        };
    });
</script>

<svelte:head>
    <title>Walay Katapusan - Video Scene Sample</title>
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