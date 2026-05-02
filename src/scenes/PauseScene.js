import Phaser from 'phaser';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this._player = data.player;
  }

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const cx = W / 2;
    const cy = H / 2;

    // Dim bg — clicking outside resumes
    this.add.rectangle(cx, cy, W, H, 0x000000, 0.72)
      .setDepth(0).setInteractive()
      .on('pointerdown', (ptr, lx, ly, evt) => {
        // only resume if click is outside the panel
        if (Math.abs(lx - cx) > 360 || Math.abs(ly - cy) > 240) this._resume();
      });

    // Panel
    this.add.rectangle(cx, cy, 720, 480, 0x0a0a1a).setStrokeStyle(2, 0x4444aa).setDepth(1);

    // Title
    this.add.text(cx, cy - 215, 'PAUSED', {
      fontSize: '34px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000033', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);

    this.add.rectangle(cx, cy - 188, 680, 1, 0x333366).setDepth(2);

    // Stats header
    this.add.text(cx, cy - 170, 'CHARACTER STATS', {
      fontSize: '12px', fontFamily: 'monospace', color: '#6666aa',
    }).setOrigin(0.5).setDepth(2);

    const p = this._player;
    if (p) {
      const stats = [
        { label: 'HP',         value: `${Math.ceil(p.hp)} / ${p.maxHp}`,          color: '#ff4466', bar: p.hp / p.maxHp },
        { label: 'Damage',     value: `${p.damage}`,                               color: '#ff8844', bar: Math.min(1, p.damage / 200) },
        { label: 'Fire Rate',  value: `${(1000/p.fireRate).toFixed(1)} shots/s`,   color: '#ffee44', bar: Math.min(1,(1000-p.fireRate)/900) },
        { label: 'Move Speed', value: `${p.speed}`,                                color: '#44ffcc', bar: Math.min(1,(p.speed-200)/300) },
        { label: 'Multi-Shot', value: `${p.multiShot} bullets`,                    color: '#88aaff', bar: p.multiShot / 8 },
        { label: 'Level',      value: `${p.level}   XP: ${p.xp}/${p.xpToNext}`,   color: '#00ffcc', bar: p.xp / p.xpToNext },
        { label: 'Laser DMG',  value: p.laserDamage ? `${p.laserDamage}` : 'Locked', color: '#ff6600', bar: Math.min(1,(p.laserDamage||0)/1000) },
        { label: 'Aura',       value: p.auraLevel > 0 ? `Lv${p.auraLevel}  R:${p.auraRadius}px` : 'Locked', color: '#cc44ff', bar: (p.auraLevel||0)/3 },
        { label: 'Split Orbs', value: p.splitOrbs > 0 ? `${p.splitOrbs} / 7 orbs` : 'Locked', color: '#00ffcc', bar: (p.splitOrbs||0)/7 },
      ];

      const LEFT  = cx - 330;
      const BARX  = cx + 30;
      const VALX  = cx + 330;
      let sy = cy - 140;

      stats.forEach(stat => {
        this.add.text(LEFT, sy, stat.label, {
          fontSize: '13px', fontFamily: 'monospace', color: '#8888aa',
        }).setOrigin(0, 0.5).setDepth(2);

        // bar bg
        this.add.rectangle(BARX, sy, 200, 8, 0x111133).setDepth(2);
        // bar fill
        const col = parseInt(stat.color.replace('#',''), 16);
        const bw  = Math.max(2, Math.min(1, stat.bar || 0) * 198);
        this.add.rectangle(BARX - 99, sy, bw, 6, col).setOrigin(0, 0.5).setDepth(3);

        this.add.text(VALX, sy, stat.value, {
          fontSize: '12px', fontFamily: 'monospace', color: stat.color,
        }).setOrigin(1, 0.5).setDepth(2);

        sy += 34;
      });
    }

    this.add.rectangle(cx, cy + 148, 680, 1, 0x333366).setDepth(2);

    // Buttons — depth 20 so always clickable
    this._btn(cx - 220, cy + 190, '▶  RESUME',    0x00ffcc, 0x003322, () => this._resume());
    this._btn(cx,       cy + 190, '⚙  SETTINGS',  0x8888ff, 0x111133, () => {
      this.scene.launch('SettingsScene', { from: 'PauseScene' });
    });
    this._btn(cx + 220, cy + 190, '⏹  MAIN MENU', 0xff4466, 0x220011, () => {
      this.scene.stop('PauseScene');
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });

    this.input.keyboard.once('keydown-ESC', () => this._resume());
  }

  _btn(x, y, label, color, bg, onClick) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const rect = this.add.rectangle(x, y, 220, 44, bg)
      .setStrokeStyle(2, color).setDepth(20).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '16px', fontFamily: 'monospace', color: hex,
    }).setOrigin(0.5).setDepth(21);
    rect.on('pointerover',  () => { rect.setAlpha(0.75); rect.setStrokeStyle(3, 0xffffff); });
    rect.on('pointerout',   () => { rect.setAlpha(1);    rect.setStrokeStyle(2, color); });
    rect.on('pointerdown',  onClick);
  }

  _resume() {
    this.scene.stop('PauseScene');
    this.scene.resume('GameScene');
  }
}