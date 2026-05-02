import Phaser from 'phaser';
import { getMusic } from './MenuScene.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() { super({ key: 'SettingsScene' }); }

  init(data) {
    this._from = data?.from || 'MenuScene'; // where to go back
  }

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const cx = W / 2, cy = H / 2;
    const music = getMusic();

    // Dim overlay
    this.add.rectangle(cx, cy, W, H, 0x000000, 0.82).setDepth(0);

    // Panel
    // Panel background
    if (this.textures.exists('bg_panel')) {
      this.add.image(cx, cy, 'bg_panel').setDisplaySize(560, 480).setDepth(1);
    } else {
      this.add.rectangle(cx, cy, 560, 480, 0x0a0a1a)
        .setStrokeStyle(2, 0x4444aa).setDepth(1);
    }

    this.add.text(cx, cy - 210, '⚙  SETTINGS', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(2);

    this.add.rectangle(cx, cy - 185, 520, 1, 0x333366).setDepth(2);

    let row = cy - 140;
    const ROW_H = 76;

    // ── Row builder helpers ──────────────────────────────────────────
    const label = (txt, y) => this.add.text(cx - 240, y, txt, {
      fontSize: '15px', fontFamily: 'monospace', color: '#8888cc',
    }).setOrigin(0, 0.5).setDepth(2);

    const toggle = (x, y, isOn, onToggle) => {
      const bg  = this.add.rectangle(x, y, 68, 32, isOn ? 0x00cc66 : 0x333344)
        .setStrokeStyle(2, isOn ? 0x00ff88 : 0x555566).setDepth(2).setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, y, isOn ? 'ON' : 'OFF', {
        fontSize: '13px', fontFamily: 'monospace', color: isOn ? '#00ff88' : '#666688',
      }).setOrigin(0.5).setDepth(3);
      const refresh = (state) => {
        bg.setFillStyle(state ? 0x00cc66 : 0x333344);
        bg.setStrokeStyle(2, state ? 0x00ff88 : 0x555566);
        txt.setText(state ? 'ON' : 'OFF').setColor(state ? '#00ff88' : '#666688');
      };
      bg.on('pointerdown', () => {
        const next = !bg._state;
        bg._state = next;
        refresh(next);
        onToggle(next);
      });
      bg._state = isOn;
      refresh(isOn);
      return { bg, txt };
    };

    const volRow = (x, y, getValue, onUp, onDown) => {
      const minus = this._smallBtn(x - 55, y, '–', 0xffcc88, () => {
        onDown();
        valTxt.setText(`${getValue()}%`);
      });
      const valTxt = this.add.text(x, y, `${getValue()}%`, {
        fontSize: '14px', fontFamily: 'monospace', color: '#ffeecc',
      }).setOrigin(0.5).setDepth(2);
      const plus = this._smallBtn(x + 55, y, '+', 0xffcc88, () => {
        onUp();
        valTxt.setText(`${getValue()}%`);
      });
      return { minus, valTxt, plus };
    };

    // ── Row 1: Music BGM ─────────────────────────────────────────────
    label('Music (BGM)', row);
    toggle(cx + 20, row, music.isBgmOn(), (val) => music.setBgmOn(val));
    volRow(cx + 170, row,
      () => music.getVolume(),
      () => music.volumeUp(),
      () => music.volumeDown()
    );
    row += ROW_H;

    // ── Row 2: Sound FX ──────────────────────────────────────────────
    label('Sound FX', row);
    toggle(cx + 20, row, music.isSfxOn(), (val) => music.setSfxOn(val));
    volRow(cx + 170, row,
      () => music.getSfxVolume(),
      () => { music.setSfxVolume(Math.min(1, music._sfxVolume + 0.1)); },
      () => { music.setSfxVolume(Math.max(0, music._sfxVolume - 0.1)); }
    );
    row += ROW_H;


    // ── Back button ───────────────────────────────────────────────────
    this._btn(cx, row + 72, '← BACK', 0x00ffcc, 0x003322, () => {
      if (this._from === 'PauseScene') {
        this.scene.stop();
      } else {
        this.scene.start(this._from);
      }
    });

    this.input.keyboard.once('keydown-ESC', () => {
      if (this._from === 'PauseScene') this.scene.stop();
      else this.scene.start(this._from);
    });
  }

  _smallBtn(x, y, label, color, onClick) {
    const hex  = '#' + color.toString(16).padStart(6, '0');
    const rect = this.add.rectangle(x, y, 36, 28, 0x111133)
      .setStrokeStyle(1, color).setDepth(2).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '16px', fontFamily: 'monospace', color: hex,
    }).setOrigin(0.5).setDepth(3);
    rect.on('pointerover',  () => rect.setAlpha(0.6));
    rect.on('pointerout',   () => rect.setAlpha(1));
    rect.on('pointerdown',  onClick);
    return rect;
  }

  _btn(x, y, lbl, color, bg, onClick) {
    const hex  = '#' + color.toString(16).padStart(6, '0');
    const rect = this.add.rectangle(x, y, 200, 44, bg)
      .setStrokeStyle(2, color).setDepth(2).setInteractive({ useHandCursor: true });
    this.add.text(x, y, lbl, {
      fontSize: '16px', fontFamily: 'monospace', color: hex,
    }).setOrigin(0.5).setDepth(3);
    rect.on('pointerover',  () => { rect.setAlpha(0.7); rect.setStrokeStyle(3, 0xffffff); });
    rect.on('pointerout',   () => { rect.setAlpha(1);   rect.setStrokeStyle(2, color); });
    rect.on('pointerdown',  onClick);
  }
}