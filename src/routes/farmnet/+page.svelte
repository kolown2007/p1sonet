<script lang="ts">
import * as Ably from 'ably';
import * as BABYLON from '@babylonjs/core';
import { onMount } from 'svelte';

onMount(() => {
  // Hardcoded test key (remove before committing)
  const apiKey = 'Yb71sw.QZOH2w:zr9J3Yub0IxlwZMzRa2TEoaBigpKXqDjHHxQjMrbN9E';

  const ably = new Ably.Realtime({ key: apiKey });
  const channel = ably.channels.get('channel1');

  channel.subscribe((message: any) => {
    // Try to decode common payload types
    let payload: any = message.data;
    if (message.data instanceof ArrayBuffer || message.data instanceof Uint8Array) {
      const buf = message.data instanceof ArrayBuffer ? new Uint8Array(message.data) : message.data;
      payload = new TextDecoder().decode(buf);
    }

    // Attempt to parse JSON
    let parsed: any = null;
    if (typeof payload === 'string') {
      try { parsed = JSON.parse(payload); } catch (e) { /* not JSON */ }
    } else if (typeof payload === 'object') {
      parsed = payload;
    }

    // Map imu fields to rotation (pitch, roll, yaw) in degrees -> radians
    const toRad = (deg: number) => deg * Math.PI / 180;
    if (parsed) {
      const pitch = parsed.pitch ?? parsed.p ?? parsed.ax ?? null;
      const roll = parsed.roll ?? parsed.r ?? parsed.ay ?? null;
      const yaw = parsed.yaw ?? parsed.y ?? parsed.az ?? null;

      if (typeof pitch === 'number' || typeof roll === 'number' || typeof yaw === 'number') {
        // Mirror yaw and roll so device-left -> stick-left
        const tX = pitch != null ? toRad(pitch) : (targetRotation.x ?? 0);
        const tY = yaw != null ? toRad(-yaw) : (targetRotation.y ?? 0); // invert yaw
        const tZ = roll != null ? toRad(-roll) : (targetRotation.z ?? 0); // invert roll

        // set the target rotation (we'll smoothly lerp towards this in the render loop)
        targetRotation.x = tX;
        targetRotation.y = tY;
        targetRotation.z = tZ;
      }
    }

    console.log('payload', payload, 'parsed', parsed);
  });

  // --- Babylon scene setup ---
  // Ensure the canvas fills the viewport via CSS
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
  let engine: BABYLON.Engine | null = null;
  let scene: BABYLON.Scene | null = null;
  let onResize: (() => void) | null = null;

  // keep a reference to the stick so incoming data can update it
  let stickMesh: BABYLON.Mesh | null = null;
  // target rotation we lerp toward (radians)
  let targetRotation: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 0);

  if (canvas) {
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    scene = new BABYLON.Scene(engine);

    // Camera: ArcRotate so user can orbit around the stick
    const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, Math.PI / 3, 6, new BABYLON.Vector3(0, 1, 0), scene);
    camera.attachControl(canvas, true);

    // Light
    const light = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    // Create a thin cylinder to represent the stick
    // height 3, diameter 0.1, positioned so its base sits at y=0 (standing, no ground mesh)
    const stickHeight = 3;
  const stick = BABYLON.MeshBuilder.CreateCylinder('stick', { height: stickHeight, diameterTop: 0.08, diameterBottom: 0.08, tessellation: 16 }, scene);
  stick.position = new BABYLON.Vector3(0, stickHeight / 2, 0);
  stickMesh = stick;

    // Material for the stick
    const mat = new BABYLON.StandardMaterial('stickMat', scene);
    mat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
    stick.material = mat;

  // (removed top sphere — user requested no ball on top)

  // make the scene background lighter for better visibility
  scene.clearColor = new BABYLON.Color4(0.94, 0.97, 1.0, 1.0);

    // Render loop with smooth interpolation toward targetRotation
    const lerpFactor = 0.15; // smaller -> slower smoothing
    engine.runRenderLoop(() => {
      if (scene) {
        if (stickMesh) {
          // ensure rotationQuaternion isn't interfering
          try { (stickMesh as any).rotationQuaternion = null; } catch (e) { /* ignore */ }
          // smooth step toward target rotation
          stickMesh.rotation = BABYLON.Vector3.Lerp(stickMesh.rotation, targetRotation, lerpFactor);
        }
        scene.render();
      }
    });

    // Resize handling (named handler so we can remove it later)
    onResize = () => {
      try { engine && engine.resize(); } catch (e) { /* ignore */ }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  // Cleanup when component unmounts
  return () => {
    try { channel.unsubscribe(); } catch (e) { /* ignore */ }
    try { ably.close(); } catch (e) { /* ignore */ }

    try {
      if (engine) {
        engine.stopRenderLoop();
        engine.dispose();
      }
    } catch (e) {
      // ignore
    }

    // remove the named handlers
    if (onResize) {
      try { window.removeEventListener('resize', onResize); } catch (e) { /* ignore */ }
      try { window.removeEventListener('orientationchange', onResize); } catch (e) { /* ignore */ }
    }
  };
});
</script>

<div style="position:fixed; inset:0; margin:0; padding:0;">
  <canvas id="renderCanvas" style="width:100%; height:100%; display:block; background:#eef6ff"></canvas>
</div>

