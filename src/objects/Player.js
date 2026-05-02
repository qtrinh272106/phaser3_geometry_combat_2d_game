import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(10);
    this.setScale(1);

    this.maxHp       = 200;
    this.hp          = 200;
    this.speed       = 200;
    this.damage      = 50;
    this.fireRate    = 1000;
    this.bulletScale = 1;
    this.multiShot   = 1;

    this.auraRadius  = 0;
    this.auraDamage  = 0;
    this.auraLevel   = 0;

    this.laserDamage = 500;

    this.xp          = 0;
    this.level       = 1;
    this.xpToNext    = 50;

    this._fireCooldown = 0;
    this._invincible   = 0;

    // Anim state
    this._breathPhase  = Math.random() * Math.PI * 2;
    this._breathPhaseY = this._breathPhase + 0.9;
    this._hitScaleTimer = 0;
    this._baseScale    = 1;
  }

  update(time, delta, keys) {
    let vx = 0, vy = 0;
    if (keys.left.isDown)  vx -= 1;
    if (keys.right.isDown) vx += 1;
    if (keys.up.isDown)    vy -= 1;
    if (keys.down.isDown)  vy += 1;
    if (vx !== 0 && vy !== 0) { vx /= Math.SQRT2; vy /= Math.SQRT2; }
    this.setVelocity(vx * this.speed, vy * this.speed);

    if (vx > 0)      this.setFlipX(false);
    else if (vx < 0) this.setFlipX(true);

    if (this._fireCooldown > 0) this._fireCooldown -= delta;
    if (this._invincible   > 0) this._invincible   -= delta;

    // Invincibility blink
    const baseAlpha = (this._invincible > 0 && Math.floor(this._invincible / 80) % 2 === 0) ? 0.35 : 1;
    this.setAlpha(baseAlpha);

    // ── Player animation ──────────────────────────────────────────────
    this._updateAnim(time, delta, vx, vy);
  }

  _updateAnim(time, delta, inputVX, inputVY) {
    const bs = this._baseScale;

    // 1. Breathing — gentle, slightly asymmetric
    const breathX = Math.sin(time * 0.0018 + this._breathPhase)  * 0.028;
    const breathY = Math.sin(time * 0.0021 + this._breathPhaseY) * 0.022;
    let sx = bs * (1 + breathX);
    let sy = bs * (1 + breathY);

    // 2. Velocity lean (based on input direction for responsiveness)
    const moving = (inputVX !== 0 || inputVY !== 0);
    if (moving) {
      const absX = Math.abs(inputVX);
      const absY = Math.abs(inputVY);
      const str  = 0.12;
      sx += absX * str * bs;
      sy += absY * str * bs;
      sx -= absY * str * 0.35 * bs;
      sy -= absX * str * 0.35 * bs;
    }

    // 3. Hit scale jerk
    if (this._hitScaleTimer > 0) {
      this._hitScaleTimer -= delta;
      const t = this._hitScaleTimer / 200;
      sx *= Phaser.Math.Linear(1, 0.68, t);
      sy *= Phaser.Math.Linear(1, 1.40, t);
    }

    this.setScale(sx, sy);
  }

  canFire()  { return this._fireCooldown <= 0; }
  onFired()  { this._fireCooldown = this.fireRate; }

  takeDamage(amount) {
    if (this._invincible > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this._invincible = 1200;
    this._hitScaleTimer = 200;
    this.scene.cameras.main.shake(120, 0.012);
    return true;
  }

  addXp(amount) {
    this.xp += amount;
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(this.xpToNext * 1.4);
      this.laserDamage += 10;
      return true;
    }
    return false;
  }

  applyUpgrade(type) {
    switch (type) {
      case 'damage':
        this.damage += 15;
        this.bulletScale = Math.min(3.5, 1 + (this.damage - 20) / 30);
        break;
      case 'firerate':
        this.fireRate = Math.max(100, this.fireRate - 90);
        break;
      case 'speed':
        this.speed += 35;
        break;
      case 'maxhp':
        this.maxHp += 30;
        this.hp = Math.min(this.hp + 50, this.maxHp);
        break;
      case 'multishot':
        this.multiShot = Math.min(8, this.multiShot + 1);
        break;
      case 'aura':
        this.auraLevel++;
        this.auraRadius = 90 + this.auraLevel * 35;
        this.auraDamage = 50 + this.auraLevel * 20;
        break;
      case 'laser':
        break;
      case 'split':
        this.splitOrbs = (this.splitOrbs || 0) + 1;
        break;
    }
  }

  isAlive() { return this.hp > 0; }
}