import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import LeaderboardScene from './scenes/LeaderboardScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import GuideScene from './scenes/GuideScene.js';

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, PauseScene, LeaderboardScene, SettingsScene, GuideScene],
};

new Phaser.Game(config);