import Phaser from 'phaser';

export const ENEMY_TYPES = {
  SLOW:     'slow',
  FAST:     'fast',
  SHOOTER:  'shooter',
  GIANT:    'giant',
  HEPTAGON: 'heptagon',
  OCTAGON:  'octagon',
  NONAGON:  'nonagon',
  DECAGON:  'decagon',
};

// Per-type animation personality
const ANIM_CONFIG = {
  [ENEMY_TYPES.SLOW]:     { breathFreq: 0.0008, breathAmpX: 0.025, breathAmpY: 0.020, hitScaleDur: 220 },
  [ENEMY_TYPES.FAST]:     { breathFreq: 0.0030, breathAmpX: 0.055, breathAmpY: 0.015, hitScaleDur:  80 },
  [ENEMY_TYPES.SHOOTER]:  { breathFreq: 0.0012, breathAmpX: 0.020, breathAmpY: 0.030, hitScaleDur: 130 },
  [ENEMY_TYPES.GIANT]:    { breathFreq: 0.0005, breathAmpX: 0.038, breathAmpY: 0.030, hitScaleDur: 280 },
  [ENEMY_TYPES.HEPTAGON]: { breathFreq: 0.0010, breathAmpX: 0.025, breathAmpY: 0.022, hitScaleDur: 160 },
  [ENEMY_TYPES.OCTAGON]:  { breathFreq: 0.0009, breathAmpX: 0.030, breathAmpY: 0.025, hitScaleDur: 170 },
  [ENEMY_TYPES.NONAGON]:  { breathFreq: 0.0016, breathAmpX: 0.040, breathAmpY: 0.022, hitScaleDur: 100 },
  [ENEMY_TYPES.DECAGON]:  { breathFreq: 0.0006, breathAmpX: 0.042, breathAmpY: 0.036, hitScaleDur: 320 },
};

// Velocity stretch strength per type
const STRETCH = {
  [ENEMY_TYPES.FAST]:     0.30,
  [ENEMY_TYPES.NONAGON]:  0.24,
  [ENEMY_TYPES.DECAGON]:  0.13,
  [ENEMY_TYPES.HEPTAGON]: 0.16,
  [ENEMY_TYPES.SHOOTER]:  0.10,
  [ENEMY_TYPES.GIANT]:    0.08,
  [ENEMY_TYPES.SLOW]:     0.06,
  [ENEMY_TYPES.OCTAGON]:  0.07,
};

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy_slow');
    this.enemyType     = ENEMY_TYPES.SLOW;
    this.type          = ENEMY_TYPES.SLOW;
    this._hitFlash     = 0;
    this._shootTimer   = 0;
    this._shieldTimer  = 0;
    this._shieldActive = false;
    this._healTimer    = 0;
    this.hp = 80; this.maxHp = 80;
    this.speed = 65; this.damage = 12; this.xpValue = 15;
    this.canShoot = false;
    this.setDepth(5);

    // Anim state (randomised per instance)
    this._breathPhase  = Math.random() * Math.PI * 2;
    this._breathPhaseY = this._breathPhase + 0.8 + Math.random() * 1.4;
    this._baseScaleX   = 1;
    this._baseScaleY   = 1;
    this._hitScaleTimer = 0;
    this._hitScaleDur   = 150;
    this._isCharging    = false;
    this._chargeLevel   = 0;
    this._healFlash     = 0;
    this._shieldFlicker = 0;
    this._healText      = null;
  }

  activate(x, y, type, hpMult = 1, dmgMult = 1) {
    this.enemyType = type;
    this.type      = type;

    this.setActive(true);
    this.setVisible(true);
    this.body.reset(x, y);
    this.clearTint();
    this.setAlpha(1);
    this.setRotation(0);

    this._hitFlash      = 0;
    this._shootTimer    = 0;
    this._shieldTimer   = 0;
    this._shieldActive  = false;
    this._healTimer     = 0;
    this.canShoot       = false;

    this._breathPhase   = Math.random() * Math.PI * 2;
    this._breathPhaseY  = this._breathPhase + 0.8 + Math.random() * 1.4;
    this._hitScaleTimer = 0;
    this._isCharging    = false;
    this._chargeLevel   = 0;
    this._healFlash     = 0;
    this._shieldFlicker = 0;
    if (this._healText) { this._healText.destroy(); this._healText = null; }

    this._applyStats(type, hpMult, dmgMult);
  }

  _applyStats(type, hpMult = 1, dmgMult = 1) {
    switch (type) {
      case ENEMY_TYPES.SLOW:
        this.hp = Math.floor(100 * hpMult); this.maxHp = this.hp;
        this.speed = 65; this.damage = Math.floor(30 * dmgMult); this.xpValue = 15;
        this.setTexture('enemy_slow');
        this._baseScaleX = 1.0; this._baseScaleY = 1.0; break;

      case ENEMY_TYPES.FAST:
        this.hp = Math.floor(50 * hpMult); this.maxHp = this.hp;
        this.speed = 160; this.damage = Math.floor(10 * dmgMult); this.xpValue = 8;
        this.setTexture('enemy_fast');
        this._baseScaleX = 0.9; this._baseScaleY = 0.9; break;

      case ENEMY_TYPES.SHOOTER:
        this.hp = 1000; this.maxHp = 1000;
        this.speed = 120; this.damage = 50; this.xpValue = 25;
        this.canShoot = true;
        this._shootTimer = 2000 + Math.random() * 1000;
        this.setTexture('enemy_shooter');
        this._baseScaleX = 1.0; this._baseScaleY = 1.0; break;

      case ENEMY_TYPES.GIANT:
        this.hp = 5000; this.maxHp = 5000;
        this.speed = 100; this.damage = 100; this.xpValue = 80;
        this.setTexture('enemy_giant');
        this._baseScaleX = 2.2; this._baseScaleY = 2.2; break;

      case ENEMY_TYPES.HEPTAGON:
        this.hp = 5000; this.maxHp = 5000;
        this.speed = 130; this.damage = 80; this.xpValue = 120;
        this._shieldTimer = 3000; this._shieldActive = false;
        this.setTexture('enemy_heptagon');
        this._baseScaleX = 2.2; this._baseScaleY = 2.2; break;

      case ENEMY_TYPES.OCTAGON:
        this.hp = 8000; this.maxHp = 8000;
        this.speed = 165; this.damage = 100; this.xpValue = 200;
        this._healTimer = 5000;
        this.setTexture('enemy_octagon');
        this._baseScaleX = 1.0; this._baseScaleY = 1.0; break;

      case ENEMY_TYPES.NONAGON:
        this.hp = 5000; this.maxHp = 5000;
        this.speed = 320; this.damage = 50; this.xpValue = 100;
        this.setTexture('enemy_nonagon');
        this._baseScaleX = 1.0; this._baseScaleY = 1.0; break;

      case ENEMY_TYPES.DECAGON:
        this.hp = 10000; this.maxHp = 10000;
        this.speed = 250; this.damage = 999; this.xpValue = 500;
        this.canShoot = true;
        this._shootTimer = 3000 + Math.random() * 1000;
        this.setTexture('enemy_decagon');
        this._baseScaleX = 2.2; this._baseScaleY = 2.2; break;
    }
    this.setScale(this._baseScaleX, this._baseScaleY);
  }

  hasActiveShield() {
    return this.enemyType === ENEMY_TYPES.HEPTAGON && this._shieldActive;
  }

  update(time, delta, player, onShoot) {
    if (!this.active || !player) return;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.scene.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), this.speed, this.body.velocity);
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;

    // Hit flash
    if (this._hitFlash > 0) {
      this._hitFlash -= delta;
      if (this._hitFlash <= 0) this.clearTint();
    }

    // Shoot + charge anim
    if (this.canShoot && onShoot) {
      this._shootTimer -= delta;
      const cooldown    = (this.enemyType === ENEMY_TYPES.DECAGON ? 3500 : 2200) + Math.random() * 800;
      const chargeWin   = 800;
      if (!this._isCharging && this._shootTimer < chargeWin) this._isCharging = true;
      if (this._isCharging) {
        this._chargeLevel = Phaser.Math.Clamp(1 - this._shootTimer / chargeWin, 0, 1);
      }
      if (this._shootTimer <= 0) {
        this._shootTimer  = cooldown;
        this._isCharging  = false;
        this._chargeLevel = 0;
        onShoot(this, player);
      }
    }

    // Heptagon shield toggle
    if (this.enemyType === ENEMY_TYPES.HEPTAGON) {
      this._shieldTimer -= delta;
      if (this._shieldTimer <= 0) {
        if (this._shieldActive) {
          this._shieldActive = false; this._shieldTimer = 3000; this._shieldFlicker = 0;
        } else {
          this._shieldActive = true;  this._shieldTimer = 2000; this._shieldFlicker = 500;
        }
      }
      if (this._shieldFlicker > 0) this._shieldFlicker -= delta;
    }

    // Octagon regen
    if (this.enemyType === ENEMY_TYPES.OCTAGON) {
      this._healTimer -= delta;
      if (this._healTimer <= 0) {
        this._healTimer = 5000;
        this.hp = Math.min(this.maxHp, this.hp + 30);
        this._healFlash = 650;
        this._spawnHealIndicator();
      }
      if (this._healFlash > 0) this._healFlash -= delta;
    }

    this._updateAnim(time, delta, vx, vy);
  }

  _updateAnim(time, delta, vx, vy) {
    const cfg = ANIM_CONFIG[this.enemyType] || ANIM_CONFIG[ENEMY_TYPES.SLOW];
    const bx  = this._baseScaleX;
    const by  = this._baseScaleY;

    // ── 1. Breathing (asymmetric X/Y, random phase) ──────────────────
    const breathX = Math.sin(time * cfg.breathFreq + this._breathPhase)  * cfg.breathAmpX;
    const breathY = Math.sin(time * cfg.breathFreq * 1.13 + this._breathPhaseY) * cfg.breathAmpY;
    let sx = bx * (1 + breathX);
    let sy = by * (1 + breathY);

    // ── 2. Velocity stretch (lean toward movement direction) ──────────
    const spd2 = vx * vx + vy * vy;
    if (spd2 > 10) {
      const spd     = Math.sqrt(spd2);
      const normX   = vx / spd;
      const normY   = vy / spd;
      const str     = STRETCH[this.enemyType] || 0.1;
      const absNX   = Math.abs(normX);
      const absNY   = 1 - absNX;
      sx += absNX * str * bx;
      sy += absNY * str * by;
      // Squash perpendicular axis slightly
      sx -= absNY * str * 0.3 * bx;
      sy -= absNX * str * 0.3 * by;
    }

    // ── 3. Hit scale jerk (squash on impact) ─────────────────────────
    if (this._hitScaleTimer > 0) {
      this._hitScaleTimer -= delta;
      const t = this._hitScaleTimer / this._hitScaleDur; // 1→0 as it fades
      sx *= Phaser.Math.Linear(1, 0.72, t);
      sy *= Phaser.Math.Linear(1, 1.35, t);
    }

    // ── 4. Per-type personality ───────────────────────────────────────
    switch (this.enemyType) {

      // Tam giác (FAST): kéo dài mạnh, rung tốc độ, warm tint khi bay nhanh
      case ENEMY_TYPES.FAST: {
        sx += Math.sin(time * 0.032) * 0.018 * bx;  // jitter X
        if (spd2 > 18000 && this._hitFlash <= 0) {
          this.setTint(0xffddaa);
        } else if (this._hitFlash <= 0) {
          this.clearTint();
        }
        break;
      }

      // Ngũ giác (SHOOTER): xoay nhẹ, bùng scale khi charge
      case ENEMY_TYPES.SHOOTER: {
        this.setRotation(Math.sin(time * 0.0013) * 0.09);
        if (this._isCharging) {
          const swell = 1 + this._chargeLevel * 0.28 + Math.sin(time * 0.04) * 0.05 * this._chargeLevel;
          sx *= swell; sy *= swell;
          const g = Math.floor(Phaser.Math.Linear(170, 50, this._chargeLevel));
          this.setTint((0xff << 16) | (g << 8));
        } else if (this._hitFlash <= 0) {
          this.clearTint();
        }
        break;
      }

      // Lục giác (GIANT): rung nặng liên tục
      case ENEMY_TYPES.GIANT: {
        const tr = Math.sin(time * 0.021) * 0.04 * bx;
        sx += tr; sy -= tr * 0.5;
        // thêm vertical shake
        sy += Math.sin(time * 0.031 + 1.3) * 0.025 * by;
        break;
      }

      // Thất giác (HEPTAGON): nhấp nháy khi bật shield, pulse xanh khi có shield
      case ENEMY_TYPES.HEPTAGON: {
        if (this._shieldActive) {
          if (this._shieldFlicker > 0) {
            this.setAlpha(Math.floor(time / 55) % 2 === 0 ? 1 : 0.25);
          } else {
            this.setAlpha(1);
            const pulse  = 0.5 + 0.5 * Math.sin(time * 0.008);
            const gb = Math.floor(180 + pulse * 75);
            this.setTint((0x66 << 16) | (gb << 8) | 0xff);
          }
          // pulsing scale
          sx *= 1 + Math.sin(time * 0.006) * 0.07;
          sy *= 1 + Math.sin(time * 0.006 + 1.2) * 0.07;
        } else {
          this.setAlpha(1);
          if (this._hitFlash <= 0) this.clearTint();
        }
        break;
      }

      // Bát giác (OCTAGON): phát sáng xanh + nở to khi hồi máu
      case ENEMY_TYPES.OCTAGON: {
        if (this._healFlash > 0) {
          const t = this._healFlash / 650;
          const g = Math.floor(Phaser.Math.Linear(0x80, 0xff, t));
          this.setTint((0x00 << 16) | (g << 8) | 0x55);
          const swell = 1 + t * 0.18;
          sx *= swell; sy *= swell;
        } else if (this._hitFlash <= 0) {
          this.clearTint();
        }
        break;
      }

      // Cửu giác (NONAGON): alpha dao động = mờ ảo, tím pha
      case ENEMY_TYPES.NONAGON: {
        const ghost = 0.50 + 0.48 * Math.sin(time * 0.0019 + this._breathPhase);
        this.setAlpha(ghost);
        if (this._hitFlash <= 0) {
          const p = 0.5 + 0.5 * Math.sin(time * 0.003);
          const r = Math.floor(Phaser.Math.Linear(0x77, 0xcc, p));
          this.setTint((r << 16) | 0x0055cc);
        }
        break;
      }

      // Thập giác (DECAGON): boss glow đỏ, scale pulse ominous, tremor mạnh
      case ENEMY_TYPES.DECAGON: {
        const bossPulse = 1 + 0.07 * Math.sin(time * 0.0017);
        sx *= bossPulse; sy *= bossPulse;
        // tremor
        const tr = Math.sin(time * 0.024) * 0.05 * bx;
        sx += tr; sy -= tr * 0.6;
        sy += Math.sin(time * 0.033 + 2) * 0.03 * by;
        if (this._hitFlash <= 0 && !this._isCharging) {
          const glow = 0.4 + 0.6 * Math.sin(time * 0.0021);
          const g    = Math.floor(glow * 35);
          this.setTint((0xff << 16) | (g << 8) | 0x00);
        }
        break;
      }
    }

    this.setScale(sx, sy);
  }

  _spawnHealIndicator() {
    if (!this.scene || !this.scene.add) return;
    if (this._healText) { this._healText.destroy(); this._healText = null; }
    this._healText = this.scene.add.text(this.x, this.y - 30, '+', {
      fontSize: '24px', fontFamily: 'monospace',
      color: '#00ff88', stroke: '#004422', strokeThickness: 3,
    }).setDepth(20).setOrigin(0.5);

    this.scene.tweens.add({
      targets: this._healText,
      y: this.y - 85, alpha: 0,
      duration: 900, ease: 'Cubic.Out',
      onComplete: () => {
        if (this._healText) { this._healText.destroy(); this._healText = null; }
      },
    });
  }

  takeDamage(amount) {
    if (this._shieldActive) return false;
    this.hp -= amount;
    this._hitFlash = 100;
    this.setTint(0xffffff);
    // Trigger hit scale jerk
    const cfg = ANIM_CONFIG[this.enemyType] || ANIM_CONFIG[ENEMY_TYPES.SLOW];
    this._hitScaleTimer = cfg.hitScaleDur;
    this._hitScaleDur   = cfg.hitScaleDur;
    return this.hp <= 0;
  }

  isAlive() { return this.hp > 0 && this.active; }
}