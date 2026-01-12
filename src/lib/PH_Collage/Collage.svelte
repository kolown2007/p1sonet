<script lang="ts">
  import { onMount } from 'svelte';
  import { Application, Assets, Sprite } from 'pixi.js';

  // Array of texture URLs
  const textureUrls = [
    'https://kolown.net/storage/library/chronoescape/tribal.png',
      'https://kolown.net/storage/library/chronoescape/metal.jpg',
   
    // Add more texture URLs here
  ];

  onMount(() => {
    let app: Application | undefined;
    let interval: number | undefined;

    (async () => {
      // Create a new application
      app = new Application();

      // Initialize the application
      await app.init({ background: '#f0f0f0', resizeTo: window });

      // Append the application canvas to the document body
      document.body.appendChild(app.canvas);

      // Load all textures
      const textures = await Assets.load(textureUrls);

      // Function to add a random sprite
      function addRandomSprite() {
        // Pick a random texture
        const randomUrl = textureUrls[Math.floor(Math.random() * textureUrls.length)];
        const texture = textures[randomUrl];

        // Create sprite
        const sprite = new Sprite(texture);

        // Random position
        sprite.x = Math.random() * app!.screen.width;
        sprite.y = Math.random() * app!.screen.height;

        // Random scale (0.5 to 1.5)
        const scale = 0.5 + Math.random();
        sprite.scale.set(scale);

        // Random rotation
        sprite.rotation = Math.random() * Math.PI * 2;

        // Center anchor for better rotation/scale
        sprite.anchor.set(0.5);

        app!.stage.addChild(sprite);
      }

      // Add a sprite every 3 seconds
      interval = setInterval(addRandomSprite, 3000) as unknown as number;

      // Add initial sprite
      addRandomSprite();
    })();

    // Cleanup on component destroy
    return () => {
      if (interval) clearInterval(interval);
      if (app) app.destroy(true, { children: true });
    };
  });







</script>

<svelte:head>
  <title>Philippine Collagian</title>
</svelte:head>