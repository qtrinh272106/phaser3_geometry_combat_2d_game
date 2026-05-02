import Phaser from 'phaser';
import { ENEMY_TYPES } from '../objects/Enemy.js';

// ─────────────────────────────────────────────────────────────────────────────
// Bullet — inlined (previously objects/Bullet.js)
// ─────────────────────────────────────────────────────────────────────────────
class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'bullet');
    this.damage = 50;
    this._lifespan = 0;
    this.bulletScale = 1;
    this.isEnemyBullet = false;
  }

  fire(x, y, angle, damage, speed = 320, scale = 1, isEnemyBullet = false) {
    this.setActive(true).setVisible(true);
    this.body.reset(x, y);
    this.damage        = damage;
    this._lifespan     = 2200;
    this.bulletScale   = scale;
    this.isEnemyBullet = isEnemyBullet;
    this.setScale(scale).setDepth(isEnemyBullet ? 7 : 8);
    this.setTint(isEnemyBullet ? 0xff4444 : 0xffdd00);
    this.scene.physics.velocityFromAngle(angle, speed, this.body.velocity);
    this.setRotation(Phaser.Math.DegToRad(angle + 90));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this._lifespan -= delta;
    if (this._lifespan <= 0) {
      this.setActive(false).setVisible(false);
      this.body.stop();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CombatSystem
// ─────────────────────────────────────────────────────────────────────────────
export default class CombatSystem {
  constructor(scene, player, bulletGroup, enemyGroup) {
    this.scene       = scene;
    this.player      = player;
    this.bulletGroup = bulletGroup;
    this.enemyGroup  = enemyGroup;
    this._setupColliders();
  }

  _setupColliders() {
    // Player bullets → enemies
    this.scene.physics.add.overlap(
      this.bulletGroup, this.enemyGroup,
      (bullet, enemy) => {
        if (!bullet.active || !enemy.active || bullet.isEnemyBullet) return;
        if (enemy.hasActiveShield && enemy.hasActiveShield()) {
          this._spawnHitParticles(bullet.x, bullet.y, 0x4488ff);
          bullet.setActive(false).setVisible(false); bullet.body.stop();
          return;
        }
        this._spawnHitParticles(bullet.x, bullet.y, 0xffdd00);
        bullet.setActive(false).setVisible(false); bullet.body.stop();
        if (enemy.takeDamage(bullet.damage)) this.killEnemy(enemy);
      }, null, this
    );

    // Enemy bullets → player
    this.scene.physics.add.overlap(
      this.player, this.bulletGroup,
      (player, bullet) => {
        if (!bullet.active || !bullet.isEnemyBullet) return;
        bullet.setActive(false).setVisible(false); bullet.body.stop();
        if (player.takeDamage(bullet.damage)) {
          this._spawnHitParticles(player.x, player.y, 0xff2244);
        }
      }, null, this
    );

    // Enemy body → player
    this.scene.physics.add.overlap(
      this.player, this.enemyGroup,
      (player, enemy) => {
        if (!enemy.active) return;
        if (player.takeDamage(enemy.damage)) {
          this._spawnHitParticles(player.x, player.y, 0xff4444);
        }
      }, null, this
    );
  }

  killEnemy(enemy) {
    this._spawnDeathParticles(enemy.x, enemy.y, enemy.enemyType);
    enemy.setActive(false).setVisible(false);
    enemy.body.stop();
    this.scene.events.emit('enemyKilled', { type: enemy.enemyType });
    if (this.player.addXp(enemy.xpValue)) this.scene.events.emit('levelUp');
  }

  fireEnemyBullet(enemy, player) {
    const isDecagon = enemy.enemyType === ENEMY_TYPES.DECAGON;
    const bullet = this._getBullet(isDecagon ? 'bullet_giant' : 'bullet_shooter');
    const angle  = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    bullet.setDepth(7);
    bullet.fire(enemy.x, enemy.y, Phaser.Math.RadToDeg(angle),
      isDecagon ? 99999 : enemy.damage,
      isDecagon ? 90    : 240,
      isDecagon ? 2.5   : 1,
      true
    );
  }

  fireBulletsAtTarget(targetEnemy) {
    const player     = this.player;
    const baseAngle  = Phaser.Math.Angle.Between(player.x, player.y, targetEnemy.x, targetEnemy.y);
    const spread     = 18;
    const startAngle = Phaser.Math.RadToDeg(baseAngle) - (player.multiShot - 1) * spread / 2;
    for (let i = 0; i < player.multiShot; i++) {
      const bullet = this._getBullet('bullet');
      bullet.fire(player.x, player.y, startAngle + i * spread, player.damage, 520, player.bulletScale, false);
    }
  }

  _getBullet(texture = 'bullet') {
    let bullet = this.bulletGroup.getChildren().find(b => !b.active);
    if (!bullet) {
      bullet = new Bullet(this.scene, 0, 0);
      this.scene.add.existing(bullet);
      this.scene.physics.add.existing(bullet);
      this.bulletGroup.add(bullet);
    }
    bullet.setTexture(texture);
    return bullet;
  }

  findNearestEnemy() {
    let nearest = null, minDist = Infinity;
    this.enemyGroup.getChildren().forEach(e => {
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < minDist) { minDist = d; nearest = e; }
    });
    return nearest;
  }

  _spawnHitParticles(x, y, color = 0xffdd00) {
    for (let i = 0; i < 5; i++) {
      const p = this.scene.add.image(x, y, 'particle').setTint(color).setDepth(20).setScale(0.7);
      const a = Phaser.Math.Between(0, 360), d = Phaser.Math.Between(18, 45);
      this.scene.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        alpha: 0, scale: 0.1, duration: 280, ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  _spawnDeathParticles(x, y, type) {
    const colorMap = {
      [ENEMY_TYPES.SLOW]: 0xff4400, [ENEMY_TYPES.FAST]: 0xff8800,
      [ENEMY_TYPES.SHOOTER]: 0xaa44ff, [ENEMY_TYPES.GIANT]: 0xff0000,
      [ENEMY_TYPES.HEPTAGON]: 0x4488ff, [ENEMY_TYPES.OCTAGON]: 0xffcc00,
      [ENEMY_TYPES.NONAGON]: 0xcccccc, [ENEMY_TYPES.DECAGON]: 0xffffff,
    };
    const color = colorMap[type] || 0xff4400;
    const count = [ENEMY_TYPES.GIANT, ENEMY_TYPES.OCTAGON, ENEMY_TYPES.DECAGON].includes(type) ? 24 : 10;
    for (let i = 0; i < count; i++) {
      const p = this.scene.add.image(x, y, 'particle').setTint(color).setDepth(20).setScale(1.2);
      const a = Phaser.Math.Between(0, 360), d = Phaser.Math.Between(30, 100);
      this.scene.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        alpha: 0, scale: 0.1, duration: 500, ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }
}