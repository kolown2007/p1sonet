<script lang="ts">
    import { onMount } from "svelte";
    import * as BABYLON from "@babylonjs/core";
    import "@babylonjs/loaders/glTF";
    import HavokPhysics from "@babylonjs/havok";

    onMount(async () => {
        // Create a Babylon.js scene
        const canvas = document.getElementById("babylon-canvas") as HTMLCanvasElement;
        const engine = new BABYLON.Engine(canvas, true);

        // Load Havok Physics WASM file
        const havokInstance = await HavokPhysics({
            locateFile: (path) => `/HavokPhysics.wasm`
        });
        const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);

        const createScene = function () {
            const scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

            const camera = new BABYLON.ArcRotateCamera(
                "Camera",
                Math.PI / 2,
                Math.PI / 2,
                2,
                new BABYLON.Vector3(2, 10, 10),
                scene
            );
            camera.setTarget(BABYLON.Vector3.Zero());
            camera.attachControl(canvas, true);

            camera.lowerBetaLimit = 0.1; // Prevent the camera from going below the plane
            camera.upperBetaLimit = Math.PI / 2; // Prevent the camera from going above the plane
            camera.lowerRadiusLimit = 5; // Prevent the camera from zooming in too close



            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

            // Default intensity is 1. Let's dim the light a small amount
            light.intensity = 0.2;

            var light2 = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(-1, -0.5, -1.0), scene);
            light2.position = new BABYLON.Vector3(3, 6, 4);



             // Shadows
            var shadowGenerator = new BABYLON.ShadowGenerator(1024, light2);
            shadowGenerator.useBlurExponentialShadowMap = true;
            shadowGenerator.blurKernel = 32;

            

            // Enable physics
            scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);

            var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 100, height: 100}, scene);
            ground.position.y = -5.0;

           new BABYLON.PhysicsAggregate(ground, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, scene);

            // Create a sphere with physics
            const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: .5, segments: 32 }, scene);
            sphere.position.y = 10;
            sphere.position.x = -7;

             new BABYLON.PhysicsAggregate(sphere, BABYLON.PhysicsShapeType.SPHERE, { mass: .5, restitution:.75}, scene);


            // const sphere2 = BABYLON.MeshBuilder.CreateSphere("sphere2", { diameter: 2, segments: 32 }, scene);
            // sphere2.position.y = 20;
            // var sphereAggregate2 = new BABYLON.PhysicsAggregate(sphere2, BABYLON.PhysicsShapeType.SPHERE, { mass: .5, restitution:0.75}, scene);

    

            // Load jollibee.glb model from root
            BABYLON.SceneLoader.ImportMesh(
                "",
                "https://kolown.net/assets/p1sonet/",
                "jollibee.glb",
                scene,
                (meshes) => {
                    console.log("meshes", meshes);
                    const sculptureMesh = meshes[1];
               

                    

                    sculptureMesh.scaling = new BABYLON.Vector3(5, 5, 5); 

                    sculptureMesh.position.x = 5; 
                    sculptureMesh.position.y = 1;
                
                 

            new BABYLON.PhysicsAggregate(sculptureMesh, BABYLON.PhysicsShapeType.MESH, { mass: .2, restitution:0.5}, scene);
        

            shadowGenerator.addShadowCaster(sphere);
            shadowGenerator.addShadowCaster(sculptureMesh);
            ground.receiveShadows = true;

            

            scene.registerBeforeRender(() => {
                        sculptureMesh.rotate(BABYLON.Axis.Y, 0.01, BABYLON.Space.LOCAL);
                    });
                    
             

                }


                
            );







            

            return scene;
        };

        const scene = createScene();

        engine.runRenderLoop(() => {
            scene.render();
        });

        window.addEventListener("resize", () => {
            engine.resize();
        });
    });
</script>

<canvas id="babylon-canvas"></canvas>

<style>
    canvas {
        width: 100%;
        height: 100%;
        display: block;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
</style>