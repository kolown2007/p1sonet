<script lang="ts">
    import { onMount } from 'svelte';
    import { Application } from 'pixi.js';
    import { enableCanvasClickShapeCreation, type CanvasClickShapeController } from '$lib/Cutout/cutout';

    let container: HTMLDivElement;

    onMount(() => {
        let app: Application | null = null;
        let controller: CanvasClickShapeController | null = null;

        const setup = async () => {
            app = new Application();
            await app.init({
                background: '#050505',
                resizeTo: window,
                antialias: true
            });

            container.appendChild(app.canvas);
            controller = enableCanvasClickShapeCreation({
                stage: app.stage,
                width: app.screen.width,
                height: app.screen.height
            });
        };

        void setup();

        return () => {
            controller?.destroy();
            app?.destroy(true, { children: true });
        };
    });
</script>

<div class="cutout-canvas" bind:this={container}></div>

<style>
    .cutout-canvas {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: #050505;
    }

    .cutout-canvas :global(canvas) {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>