import { AUTO, Game } from 'phaser';
import { DVD } from '../dvd';


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

    const resizeHandler = () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', resizeHandler);
    
    // Store handler on game for cleanup
    (game as any)._resizeHandler = resizeHandler;

    return game;
}

export default StartGame;