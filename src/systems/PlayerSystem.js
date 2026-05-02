import Phaser from 'phaser';
import { getMusic } from '../scenes/MenuScene.js';

// ─────────────────────────────────────────────────────────────────────────────
// LevelSystem — upgrade menu & player progression
// ─────────────────────────────────────────────────────────────────────────────
const ALL_UPGRADES = [
  { type: 'damage',    label: 'Power Up',     description: '+15 Damage\nBullets grow larger',                  color: 0xff6644, maxLevel: Infinity },
  { type: 'firerate',  label: 'Rapid Fire',   description: 'Fire 90ms faster',                                 color: 0xffee00, maxLevel: Infinity },
  { type: 'speed',     label: 'Swift Feet',   description: '+35 Move Speed',                                   color: 0x00ffcc, maxLevel: Infinity },
  { type: 'maxhp',     label: 'Fortify',      description: '+30 Max HP\nHeals 30 HP',                          color: 0xff4499, maxLevel: Infinity },
  { type: 'multishot', label: 'Multi-Shot',   description: '+1 Bullet per shot\nSpread fire pattern',          color: 0x88aaff, maxLevel: 10       },
  { type: 'split',     label: 'Split',        description: '+1 Orb orbits you\nShoots at enemies\nDMG = yours, SPD ÷2', color: 0xf05959, maxLevel: 10 },
  { type: 'aura',      label: 'Death Aura',   description: 'Pulsing ring kills\nenemies that get close',       color: 0xcc44ff, maxLevel: 5        },
  { type: 'laser',     label: 'Hyper Laser',  description: 'Aim with mouse, press J\nOne-shots all in path\n10s cooldown', color: 0xff8800, maxLevel: 1 },
];

export class LevelSystem {
  constructor(scene, player) {
    this.scene   = scene;
    this.player  = player;
    this._objs   = [];
    this._active = false;
    this._taken  = {};
    ALL_UPGRADES.forEach(u => { this._taken[u.type] = 0; });
  }

  showUpgradeMenu() {
    if (this._active) return;
    this._active = true;
    this.scene.physics.pause();

    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const cx = W / 2, cy = H / 2;
    const D  = 200;

    this._mk(this.scene.add.rectangle(cx, cy, W, H, 0x000000, 0.82).setScrollFactor(0).setDepth(D));
    this._mk(this.scene.add.text(cx, cy - 155, `LEVEL UP!  →  ${this.player.level}`, {
      fontSize: '38px', fontFamily: 'monospace', color: '#ffee00', stroke: '#442200', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1));
    this._mk(this.scene.add.text(cx, cy - 108, 'Choose an upgrade:', {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1));

    const available = ALL_UPGRADES.filter(u => this._taken[u.type] < u.maxLevel);
    const choices   = Phaser.Utils.Array.Shuffle([...available]).slice(0, 3);
    const cardW = 185, cardH = 150, gap = 205;
    const startX = cx - gap;

    choices.forEach((upg, i) => {
      const cx2 = startX + i * gap;
      const cy2 = cy + 35;
      const hex  = '#' + upg.color.toString(16).padStart(6, '0');
      const takenCount = this._taken[upg.type];
      const maxStr = upg.maxLevel === Infinity ? '' : `  ${takenCount + 1}/${upg.maxLevel}`;

      const bg = this.scene.add.rectangle(cx2, cy2, cardW, cardH, 0x0d0d22)
        .setStrokeStyle(2, upg.color).setScrollFactor(0).setDepth(D + 1)
        .setInteractive({ useHandCursor: true });
      this._mk(bg);
      this._mk(this.scene.add.text(cx2, cy2 - 52, upg.label + maxStr, {
        fontSize: '17px', fontFamily: 'monospace', color: hex,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));
      this._mk(this.scene.add.text(cx2, cy2 + 2, upg.description, {
        fontSize: '13px', fontFamily: 'monospace', color: '#cccccc',
        align: 'center', wordWrap: { width: cardW - 16 }, lineSpacing: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));
      this._mk(this.scene.add.text(cx2, cy2 + 64, `[${i + 1}]`, {
        fontSize: '14px', fontFamily: 'monospace', color: hex,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));

      bg.on('pointerover', () => bg.setFillStyle(0x1a1a44));
      bg.on('pointerout',  () => bg.setFillStyle(0x0d0d22));
      bg.on('pointerdown', () => this._pick(upg));
    });

    this._k = [];
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => {
      if (!choices[i]) return;
      const key = this.scene.input.keyboard.addKey(k);
      key.once('down', () => this._pick(choices[i]));
      this._k.push(key);
    });
  }

  _mk(obj) { this._objs.push(obj); return obj; }

  _pick(upg) {
    if (!this._active) return;
    this._taken[upg.type]++;
    this.player.applyUpgrade(upg.type);
    this._objs.forEach(o => o.destroy());
    this._objs = [];
    this._k && this._k.forEach(k => k.removeAllListeners());
    this._k = [];
    this._active = false;
    this.scene.physics.resume();
    this.scene.events.emit('upgradePicked', upg);
  }

  isActive() { return this._active; }
}

// ─────────────────────────────────────────────────────────────────────────────
// OrbSystem — orbiting orbs that auto-shoot enemies
// ─────────────────────────────────────────────────────────────────────────────
const ORB_RADIUS = 80;
const ORB_SPEED  = 0; // rad/s

export class OrbSystem {
  constructor(scene, player, combat) {
    this.scene   = scene;
    this.player  = player;
    this.combat  = combat;
    this._orbs   = [];
    this._angle  = 0;
    this._timers = [];
    this._orbCount = 0;
  }

  addOrb() {
    const gfx = this.scene.add.graphics().setDepth(9);
    this._orbs.push(gfx);
    this._timers.push(0);
    this._orbCount = this._orbs.length;
  }

  update(delta) {
    if (this._orbCount === 0) return;
    this._angle = (this._angle + ORB_SPEED * (delta / 1000)) % (Math.PI * 2);

    const px = this.player.x;
    const py = this.player.y;
    const fireRate = this.player.fireRate * 2;

    this._orbs.forEach((gfx, i) => {
      const orbAngle = this._angle + (i / this._orbCount) * Math.PI * 2;
      const ox = px + Math.cos(orbAngle) * ORB_RADIUS;
      const oy = py + Math.sin(orbAngle) * ORB_RADIUS;

      gfx.clear();
      gfx.fillStyle(0x00ffcc, 0.9);
      gfx.fillCircle(ox, oy, 8);
      gfx.fillStyle(0x009966, 0.9);
      gfx.fillCircle(ox, oy, 4);
      gfx.lineStyle(1, 0x00ffcc, 0.15);
      gfx.strokeCircle(px, py, ORB_RADIUS);

      this._timers[i] -= delta;
      if (this._timers[i] <= 0) {
        this._timers[i] = fireRate;
        const target = this.combat.findNearestEnemy();
        if (target) this._fireFromOrb(ox, oy, target);
      }
    });
  }

  _fireFromOrb(ox, oy, target) {
    const bullet = this.combat._getBullet('bullet');
    const angle  = Phaser.Math.Angle.Between(ox, oy, target.x, target.y);
    bullet.setDepth(8);
    bullet.fire(ox, oy, Phaser.Math.RadToDeg(angle), this.player.damage, 260, this.player.bulletScale, false);
  }

  destroy() {
    this._orbs.forEach(g => g.destroy());
    this._orbs   = [];
    this._timers = [];
    this._orbCount = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SkillSystem — hyper laser (J key)
// ─────────────────────────────────────────────────────────────────────────────
const COOLDOWN  = 10000;
const BEAM_HALF = 56;
const BEAM_LEN  = 2000;

export class SkillSystem {
  constructor(scene, player, enemyGroup, combat) {
    this.scene      = scene;
    this.player     = player;
    this.enemyGroup = enemyGroup;
    this.combat     = combat;

    this.hasLaser   = false;
    this._cooldown  = 0;
    this._aimAngle  = 0;
    this._holding   = false;
    this._firing    = false;
    this._fireTimer = 0;
    this.laserDamage = 500;

    this._previewGfx = scene.add.graphics().setDepth(28);
    this._laserGfx   = scene.add.graphics().setDepth(30);
    this._laserGfx2  = scene.add.graphics().setDepth(29);

    this._keyJ = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this._keyJ.on('down', () => this._onJDown());
    this._keyJ.on('up',   () => this._onJUp());

    this._keys = scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this._ui = this._buildUI();
  }

  _buildUI() {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    const bg    = this.scene.add.rectangle(W / 2, H - 30, 220, 22, 0x111122).setScrollFactor(0).setDepth(52).setStrokeStyle(1, 0x4444aa);
    const bar   = this.scene.add.rectangle(W / 2 - 109, H - 30, 0, 18, 0xff4400).setOrigin(0, 0.5).setScrollFactor(0).setDepth(53);
    const label = this.scene.add.text(W / 2, H - 30, 'LASER [J] — not unlocked', {
      fontSize: '11px', fontFamily: 'monospace', color: '#555566',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(54);

    return { bg, bar, label };
  }

  unlock() { this.hasLaser = true; this._cooldown = 0; }

  _onJDown() {
    if (!this.hasLaser || this._cooldown > 0 || this._firing) return;
    this._holding = true;
  }

  _onJUp() {
    if (!this._holding) return;
    this._holding = false;
    if (!this.hasLaser || this._cooldown > 0 || this._firing) return;
    this._firing    = true;
    this._fireTimer = 450;
    this._cooldown  = COOLDOWN;
    this._previewGfx.clear();
    this.scene.cameras.main.shake(180, 0.02);
    getMusic().playSfx('laser');
  }

  _dealDamage(delta) {
    const damage = this.laserDamage * (delta / 1000);
    const px = this.player.x, py = this.player.y;
    const dx = Math.cos(this._aimAngle), dy = Math.sin(this._aimAngle);

    this.enemyGroup.getChildren().forEach(enemy => {
      if (!enemy.active) return;
      const ex  = enemy.x - px, ey = enemy.y - py;
      const dot = ex * dx + ey * dy;
      if (dot < 0) return;
      const perpX = ex - dot * dx, perpY = ey - dot * dy;
      if (Math.sqrt(perpX * perpX + perpY * perpY) <= BEAM_HALF + enemy.displayWidth / 2) {
        enemy.hp -= damage;
        if (enemy.hp <= 0) this.combat.killEnemy(enemy);
      }
    });
  }

  update(delta) {
    if (!this.hasLaser) return;
    if (this._cooldown > 0) this._cooldown -= delta;

    if (this._holding) {
      const k = this._keys;
      let vx = 0, vy = 0;
      if (k.left.isDown)  vx -= 1;
      if (k.right.isDown) vx += 1;
      if (k.up.isDown)    vy -= 1;
      if (k.down.isDown)  vy += 1;
      if (vx !== 0 || vy !== 0) this._aimAngle = Math.atan2(vy, vx);
      this._drawPreview();
    } else {
      this._previewGfx.clear();
    }

    if (this._firing) {
      this._fireTimer -= delta;
      this._dealDamage(delta);
      if (this._fireTimer <= 0) {
        this._firing = false;
        this._laserGfx.clear();
        this._laserGfx2.clear();
      } else {
        this._drawLaser();
      }
    }

    this._updateUI();
  }

  _drawPreview() {
    const gfx = this._previewGfx;
    gfx.clear();
    const px  = this.player.x, py = this.player.y;
    const dx  = Math.cos(this._aimAngle), dy = Math.sin(this._aimAngle);
    const px2 = -dy, py2 = dx;
    const len = BEAM_LEN;
    const t1x = px + px2 * BEAM_HALF, t1y = py + py2 * BEAM_HALF;
    const b1x = px - px2 * BEAM_HALF, b1y = py - py2 * BEAM_HALF;
    const SEG = 40, GAP = 18;
    let d = 0;

    gfx.lineStyle(2, 0xff8800, 0.85);
    while (d < len) {
      const e = Math.min(d + SEG, len);
      gfx.lineBetween(t1x + dx * d, t1y + dy * d, t1x + dx * e, t1y + dy * e);
      gfx.lineBetween(b1x + dx * d, b1y + dy * d, b1x + dx * e, b1y + dy * e);
      d += SEG + GAP;
    }
    gfx.lineStyle(2, 0xff8800, 0.6);
    gfx.lineBetween(t1x, t1y, b1x, b1y);
    gfx.lineStyle(1, 0xff8800, 0.3);
    d = 0;
    while (d < len) {
      const e = Math.min(d + SEG, len);
      gfx.lineBetween(px + dx * d, py + dy * d, px + dx * e, py + dy * e);
      d += SEG + GAP;
    }
  }

  _drawLaser() {
    const px = this.player.x, py = this.player.y;
    const dx = Math.cos(this._aimAngle), dy = Math.sin(this._aimAngle);
    const ex = px + dx * BEAM_LEN, ey = py + dy * BEAM_LEN;
    const t  = this._fireTimer / 450;

    this._laserGfx2.clear();
    this._laserGfx2.lineStyle(BEAM_HALF * 2 + 40, 0xff6600, 0.15 * t);
    this._laserGfx2.lineBetween(px, py, ex, ey);
    this._laserGfx2.lineStyle(BEAM_HALF * 2, 0xff8800, 0.28 * t);
    this._laserGfx2.lineBetween(px, py, ex, ey);

    this._laserGfx.clear();
    this._laserGfx.lineStyle(BEAM_HALF * 1.2, 0xffdd00, 0.65 * t);
    this._laserGfx.lineBetween(px, py, ex, ey);
    this._laserGfx.lineStyle(22, 0xffffff, 0.95 * t);
    this._laserGfx.lineBetween(px, py, ex, ey);
  }

  _updateUI() {
    const { bar, label } = this._ui;
    if (this._holding && this._cooldown <= 0) {
      label.setText('LASER — release J to fire!').setColor('#ffdd00');
      bar.width = 218; bar.setFillStyle(0xffdd00);
    } else if (this._cooldown <= 0) {
      label.setText('LASER [J hold+aim, release=fire] READY').setColor('#00ff88');
      bar.width = 218; bar.setFillStyle(0x00ff88);
    } else {
      label.setText(`LASER  ${Math.ceil(this._cooldown / 1000)}s`).setColor('#ff8844');
      bar.width = Math.floor(218 * (1 - this._cooldown / COOLDOWN));
      bar.setFillStyle(0xff4400);
    }
  }
}