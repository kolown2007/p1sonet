import { AUTO, Game } from 'phaser';
import { DVD } from '../p1sonet/dvd';


const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '0x000000',
    scene: [
        DVD

    ]
};

const StartGame = (parent: string) => {
    const game = new Game({ ...config, parent });

    window.addEventListener('resize', () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
    });

    return game;
}

export default StartGame;