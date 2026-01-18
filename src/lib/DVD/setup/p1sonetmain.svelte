<script module lang="ts">

    import type { Game, Scene } from "phaser";

    export type TPhaserRef = {
        game: Game | null,
        scene: Scene | null
    };

</script>

<script lang="ts">

    import { onMount } from "svelte";
    import StartGame from "./main";
    import { EventBus } from './EventBus';


    interface Props {
        phaserRef?: TPhaserRef;
        currentActiveScene: (scene: Scene) => void | undefined;
    }

    let { phaserRef = $bindable({
        game: null,
        scene: null
    }), currentActiveScene }: Props = $props();

    onMount(() => {

        phaserRef.game = StartGame("game-container");

        const sceneReadyHandler = (scene_instance: Scene) => {

            phaserRef.scene = scene_instance;

            if(currentActiveScene)
            {
                
                currentActiveScene(scene_instance);
                
            }

        };
        
        EventBus.on('current-scene-ready', sceneReadyHandler);
        
        return () => {
            EventBus.off('current-scene-ready', sceneReadyHandler);
            if (phaserRef.game) {
                const resizeHandler = (phaserRef.game as any)._resizeHandler;
                if (resizeHandler) {
                    window.removeEventListener('resize', resizeHandler);
                }
                phaserRef.game.destroy(true);
            }
        };

    });

</script>

<div id="game-container"></div>