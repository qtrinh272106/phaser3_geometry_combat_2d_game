import Phaser from 'phaser';
import MusicManager from '../systems/MusicManager.js';

let _music = null;
export function getMusic() {
  if (!_music) _music = new MusicManager();
  return _music;
}

export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const { width: W, height: H } = this.scale;
    const cx = W / 2, cy = H / 2;

    // Bật nhạc sảnh
    getMusic().playMenu();

    // Background
    if (this.textures.exists('bg_menu')) {
      this.add.image(cx, cy, 'bg_menu').setDisplaySize(W, H).setDepth(0);
    } else {
      this.add.rectangle(cx, cy, W, H, 0x0d0d1a);
    }

    // ── Image buttons — dọc, từ trên xuống ───────────────────────────
    const btnGap    = 75;
    const btnScale  = 0.38;
    const btnStartY = cy + 60;

    this._imgBtn('start',    cx, btnStartY + btnGap * 0, btnScale, () => this.scene.start('GameScene'));
    this._imgBtn('guide',    cx, btnStartY + btnGap * 1, btnScale, () => this.scene.start('GuideScene', { from: 'MenuScene' }));
    this._imgBtn('rank',     cx, btnStartY + btnGap * 2, btnScale, () => this.scene.start('LeaderboardScene'));
    this._imgBtn('settings', cx, btnStartY + btnGap * 3, btnScale, () => this.scene.start('SettingsScene', { from: 'MenuScene' }));

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
  }

  // Image button với 2 frame normal/hover
  _imgBtn(name, x, y, scale = 1, onClick) {
    const keyNormal = `btn_${name}`;
    const keyHover  = `btn_${name}_hover`;
    const hasImg    = this.textures.exists(keyNormal);

    const img = hasImg
      ? this.add.image(x, y, keyNormal).setScale(scale)
      : this._placeholderBtn(x, y, name);

    img.setInteractive({ useHandCursor: true });

    if (hasImg) {
      img.on('pointerover',  () => img.setTexture(keyHover));
      img.on('pointerout',   () => img.setTexture(keyNormal));
    } else {
      img.on('pointerover',  () => img.setAlpha(0.75));
      img.on('pointerout',   () => img.setAlpha(1));
    }
    img.on('pointerdown', onClick);
    return img;
  }

  _placeholderBtn(x, y, label) {
    // Placeholder khi chưa có ảnh
    const g = this.add.graphics();
    g.fillStyle(0x1a1a3a);
    g.fillRoundedRect(x - 70, y - 24, 140, 48, 8);
    g.lineStyle(2, 0x4444aa);
    g.strokeRoundedRect(x - 70, y - 24, 140, 48, 8);
    this.add.text(x, y, label.toUpperCase(), {
      fontSize: '14px', fontFamily: 'monospace', color: '#8888cc',
    }).setOrigin(0.5);
    // Trả về vùng hit ảo
    const zone = this.add.zone(x, y, 140, 48).setInteractive({ useHandCursor: true });
    zone.on('pointerover',  () => g.lineStyle(2, 0xaaaaff) && g.strokeRoundedRect(x - 70, y - 24, 140, 48, 8));
    zone.on('pointerout',   () => g.lineStyle(2, 0x4444aa) && g.strokeRoundedRect(x - 70, y - 24, 140, 48, 8));
    return zone;
  }

  _buildMusicBar(W, H) {
    const music = getMusic();
    const y = H - 30;

    this.add.rectangle(W / 2, y, 380, 36, 0x111122, 0.92).setStrokeStyle(1, 0x334455);

    const onoffBtn = this.add.text(W / 2 - 170, y, music.isBgmOn() ? '🔊' : '🔇', {
      fontSize: '18px', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const prevBtn = this.add.text(W / 2 - 120, y, '◀', {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaffcc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const nameText = this.add.text(W / 2 - 10, y, music.currentName(), {
      fontSize: '12px', fontFamily: 'monospace', color: '#ccffee',
    }).setOrigin(0.5);

    const nextBtn = this.add.text(W / 2 + 90, y, '▶▶', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaffcc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const volDown = this.add.text(W / 2 + 120, y, '–', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffcc88',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const volText = this.add.text(W / 2 + 150, y, `${music.getVolume()}%`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffeecc',
    }).setOrigin(0.5);

    const volUp = this.add.text(W / 2 + 178, y, '+', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffcc88',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const refresh = () => {
      nameText.setText(music.currentName());
      onoffBtn.setText(music.isBgmOn() ? '🔊' : '🔇');
      volText.setText(`${music.getVolume()}%`);
    };

    prevBtn.on('pointerdown',  () => { music.prev(); refresh(); });
    nextBtn.on('pointerdown',  () => { music.next(); refresh(); });
    volDown.on('pointerdown',  () => { music.volumeDown(); refresh(); });
    volUp.on('pointerdown',    () => { music.volumeUp(); refresh(); });
    onoffBtn.on('pointerdown', () => {
      music.setBgmOn(!music.isBgmOn());
      refresh();
    });

    [prevBtn, nextBtn, onoffBtn, volDown, volUp].forEach(b => {
      b.on('pointerover', () => b.setAlpha(0.5));
      b.on('pointerout',  () => b.setAlpha(1.0));
    });
  }
}