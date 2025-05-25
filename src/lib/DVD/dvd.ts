import Phaser from "phaser";

export class DVD extends Phaser.GameObjects.Image {
  private xSpeed: number;
  private ySpeed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    this.xSpeed = 1;
    this.ySpeed = 1;

    this.setScale(0.1);
  }

  public update() {
    this.x += this.xSpeed;
    this.y += this.ySpeed;

    const { width, height } = this.scene.sys.game.canvas;
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    if (this.x <= halfWidth || this.x >= width - halfWidth) {
      this.xSpeed *= -1;
    }

    if (this.y <= halfHeight || this.y >= height - halfHeight) {
      this.ySpeed *= -1;
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '0x000000',
  scene: [DVD]
};