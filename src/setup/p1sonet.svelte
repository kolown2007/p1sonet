<script lang="ts">
  import { onMount } from "svelte";
  import Phaser from "phaser";
  import type { BodyType } from "matter";

  let game: Phaser.Game;

  onMount(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: 'phaser-container',
      backgroundColor: '0x000000', // Black background
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0.5 },
          debug: false
        }
      },
      scene: {

        preload: function () {
          this.load.image('img', 'https://kolown.net/assets/p1sonet/image.png');
        },

        create: function () {
          const { width, height } = this.sys.game.canvas;

        


          // Add a Matter.js sprite
            const imageicon = this.matter.add.sprite(width / 2, height / 3, 'img', undefined, {
            isStatic: false,
            restitution: 1
            });

            // Add event listener for device orientation
            window.addEventListener('deviceorientation', (event) => {
            const { beta, gamma } = event; // beta is front-back tilt in degrees, gamma is left-right tilt in degrees

            // Apply force to the sprite based on the tilt
            const forceX = gamma !== null ? Phaser.Math.DegToRad(gamma) * 0.1 : 0; // Convert degrees to radians and scale, use 0 if gamma is null
            const forceY = beta !== null ? Phaser.Math.DegToRad(beta) * 0.1 : 0; // Convert degrees to radians and scale, use 0 if beta is null

            if (imageicon.body) {
              this.matter.body.applyForce(imageicon.body as BodyType, { x: imageicon.body.position.x, y: imageicon.body.position.y }, { x: forceX, y: forceY });
            }
            });

       imageicon.setScale(0.4);


          // Set the world bounds to match the window dimensions
          this.matter.world.setBounds(0, 0, width, height);

     
        }
      }
    };

    game = new Phaser.Game(config);

    // Listen for the window resize event and update the game dimensions
    const resizeHandler = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      game.scale.resize(newWidth, newHeight);

      // Update the Matter.js world bounds based on the new window dimensions
      game.scene.scenes.forEach((scene) => {
        if (scene.matter) {
          scene.matter.world.setBounds(0, 0, newWidth, newHeight);
        }
      });
    };

    window.addEventListener('resize', resizeHandler);

    return () => {
      if (game) {
        game.destroy(true);
      }
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('deviceorientation', () => {});
    };
  });
</script>

<div id="phaser-container" style="width: 100%; height: 100vh;"></div>

<style>

      /* Apply styles to make the component fullscreen */
      :global(html, body) {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    #phaser-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    
    }
</style>