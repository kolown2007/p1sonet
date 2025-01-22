<script lang="ts">
    import { onMount } from "svelte";
    import * as BABYLON from "@babylonjs/core";
    import "@babylonjs/loaders/glTF";
    import HavokPhysics from "@babylonjs/havok";

    onMount(async () => {
        // Create a Babylon.js scene
        const canvas = document.getElementById("babylon-canvas") as HTMLCanvasElement;
        const engine = new BABYLON.WebGPUEngine(canvas);
        await engine.initAsync();

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
                    
                    
            // Add PointsCloudSystem
            
            // var pcs = new BABYLON.PointsCloudSystem("pcs", 1, scene);
            // pcs.addSurfacePoints(sculptureMesh as BABYLON.Mesh, 1000, BABYLON.PointColor.Color, 0);
            // pcs.buildMeshAsync();

    //         scene.onPointerObservable.add((pointerInfo) => {
    //     switch (pointerInfo.type) {
    //         case BABYLON.PointerEventTypes.POINTERDOWN:
    //             isScattering = true;
    //             console.log("Scattering started (mouse)");
    //             break;
    //         case BABYLON.PointerEventTypes.POINTERUP:
    //             isScattering = false;
    //             console.log("Scattering stopped (mouse)");
    //             break;
    //     }
    // });


            var pcs = new BABYLON.PointsCloudSystem("pcs", 3, scene);
            pcs.addSurfacePoints(sculptureMesh as BABYLON.Mesh, 800, BABYLON.PointColor.Color, 0);
            
            const particleVelocities: BABYLON.Vector3[] = [];
            const originalPositions: BABYLON.Vector3[] = [];
            let isResetting = false;
            let time = 0;

            // Improved noise function for natural movement
            const noise = {
                seed: Math.random(),
                get: function(x: number, y: number, z: number) {
                    return (Math.sin(x * 1.5 + this.seed) * Math.cos(y * 2.3 + this.seed) * Math.sin(z * 1.7 + this.seed) +
                           Math.cos(x * 2.1 + this.seed) * Math.sin(y * 1.9 + this.seed) * Math.cos(z * 2.5 + this.seed)) * 0.5;
                }
            };

            pcs.updateParticle = function(particle) {
                const index = particle.idx;
                time += 0.001;
                
                if (!originalPositions[index]) {
                    originalPositions[index] = particle.position.clone();
                    particleVelocities[index] = new BABYLON.Vector3(0, 0, 0);
                }

                if (isResetting) {
                    particle.position = BABYLON.Vector3.Lerp(
                        particle.position,
                        originalPositions[index],
                        0.05  // Slower reset for smoother movement
                    );
                } else {
                    const distanceFromOrigin = BABYLON.Vector3.Distance(
                        particle.position,
                        originalPositions[index]
                    );

                    if (distanceFromOrigin > 10) {
                        // Smooth return to boundary
                        const direction = originalPositions[index].subtract(particle.position).normalize();
                        particleVelocities[index].addInPlace(direction.scale(0.001));
                    } else {
                        // Natural flowing movement
                        const scale = 0.3;  // Scale of the noise pattern
                        const speed = 0.1;  // Speed of movement
                        
                        // Get noise values for each dimension
                        const nx = noise.get(time + index, particle.position.y * scale, particle.position.z * scale);
                        const ny = noise.get(particle.position.x * scale, time + index, particle.position.z * scale);
                        const nz = noise.get(particle.position.x * scale, particle.position.y * scale, time + index);
                        
                        // Apply smooth force
                        particleVelocities[index].addInPlace(new BABYLON.Vector3(
                            nx * speed,
                            ny * speed,
                            nz * speed
                        ));
                    }
                    
                    // Apply velocity with damping
                    particle.position.addInPlace(particleVelocities[index]);
                    particleVelocities[index].scaleInPlace(0.98); // Damping factor
                }
                
                return particle;
            };

            // Add click handler
            scene.onPointerObservable.add((pointerInfo) => {
                if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                    isResetting = true;
                    console.log("Resetting positions");
                }
                if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
                    isResetting = false;
                    console.log("Resuming random movement");
                }
            });

            pcs.buildMeshAsync().then(() => {
                scene.registerBeforeRender(() => {
                    pcs.setParticles();
                });
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