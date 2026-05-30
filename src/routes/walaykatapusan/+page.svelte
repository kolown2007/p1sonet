<script lang="ts">
    import { onMount } from 'svelte';
    import { SceneDirector, VideoScene, YoutubeScene, GifScene } from '$lib/Walaykatapusan/scenemanager';

    let container: HTMLDivElement | null = null;

    onMount(() => {
        if (!container) {
            return;
        }

        const director = new SceneDirector({
            container,
            transitionDuration: 800,
            subtitles: {
                src: '/tracks/chrono2glitch.vtt',
                loop: true
            }
        });

        director.register(
            new VideoScene({
                id: 'video-1',
                src: 'https://kolown.net/storage/library/chronoescape/videos/chrono2glitch.mp4',
                loop: true,
                muted: true,
                // tracks: [
                //     {
                //         kind: 'subtitles',
                //         src: '/tracks/chrono2glitch.vtt',
                //         srclang: 'en',
                //         label: 'English',
                //         default: true
                //     }
                // ]
            })
        );

        director.register(
            new VideoScene({
                id: 'video-2',
                src: 'https://kolown.net/storage/library/chronoescape/videos/cocoglitch.mp4',
                loop: true,
                muted: true
            })
        );

        director.register(
            new VideoScene({
                id: 'video-3',
                src: 'https://kolown.net/storage/library/chronoescape/videos/fortnite.mp4',
                loop: true,
                muted: true
            })
        );

        // director.register(
        //     new YoutubeScene({
        //         id: 'yt-clip',
        //         src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        //         loop: true,
        //         muted: true
        //     })
        // );

        director.register(
            new GifScene({
                id: 'gif-1',
                src: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2Qwdzc3MHc1ZnlkODk1NHhmbTFoempwcHE5bXBqaTV6NWU1aHNsMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Bpqp2E59wkaOY/giphy.gif',
                objectFit: 'cover'
            })
        );

            director.register(
            new GifScene({
                id: 'gif-2',
                src: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExemlqdGpreHVxa213cmVncHdod3Uwb3Bodzlrb2Iwd2hmaG5mZWo4NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/PHiLvJlnIpS6cMZqez/giphy.gif',
                objectFit: 'cover'
            })
        );



            director.register(
            new GifScene({
                id: 'gif-3',
                src: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3Uxbmdhejdtb3JwazV3MXV1MHFxMjhxbHZnZGx5d3UwYmx2bm55aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/B6SyssSlTgPXq/giphy.gif',
                objectFit: 'cover'
            })
        );

               director.register(
            new GifScene({
                id: 'gif-4',
                src: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzU3MG13cGpiZGNtcjJrZmZucGhhZWd4OXR3YTJuY3F4YWQzMmMwOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cyDamOw9IvHKv9iWbq/giphy.gif',
                objectFit: 'cover'
            })
        );


                director.register(
            new GifScene({
                id: 'wemby',
                src: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGdmeGVleHdhcDVnbGZxbGw3Y3NleGJmbWd6N2NtcTNndnhzcjB2ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/t4S5Gt56PnyqFdSSe9/giphy.gif',
                objectFit: 'cover'
            })
        );


                     director.register(
            new GifScene({
                id: 'war',
                src: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2IzZWV6Z3FxNTl6ZzJteGFsZDQ3YWFqdGplZXJ4MmhsejExbHZmNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QR7SyBe7tQfPq/giphy.gif',
                objectFit: 'cover'
            })
        );

                     director.register(
            new GifScene({
                id: 'radar',
                src: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjdkM3hvaDcxb2RpZGptOWJkdmhlNXFpeGcwaDc2dzA2cG1wcXIxaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FX0F3UG9VDTig/giphy.gif',
                objectFit: 'cover'
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