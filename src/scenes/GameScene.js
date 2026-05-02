import Phaser from 'phaser';
import Player from '../objects/Player.js';
import Enemy from '../objects/Enemy.js';
import SpawnSystem from '../systems/SpawnSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import { LevelSystem, OrbSystem, SkillSystem } from '../systems/PlayerSystem.js';
import { saveScore, formatTime } from './LeaderboardScene.js';
import { getMusic } from './MenuScene.js';

// HeartPickup — inlined (only used here)
class HeartPickup extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'heart');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true);
    this.body.allowGravity = false;
    this.healAmount = 30;
    this.setDepth(4);
    this._tween = null;
  }
  activate(x, y, healAmount = 30) {
    this.setActive(true).setVisible(true).setPosition(x, y);
    this.body.reset(x, y);
    this.healAmount = healAmount;
    if (this._tween) this._tween.stop();
    this._tween = this.scene.tweens.add({
      targets: this, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }
  deactivate() {
    if (this._tween) { this._tween.stop(); this._tween = null; }
    this.setActive(false).setVisible(false);
  }
}

const WORLD_W = 5000;
const WORLD_H = 5000;
const HEART_SPAWN_INTERVAL = 18000;
const HEART_HEAL = 15;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    getMusic().playGame();
    this._createWorld();
    this._createPlayer();
    this._createGroups();
    this._createSystems();
    this._createCamera();
    this._createUI();
    this._bindEvents();

    this._survived     = 0;
    this._gameOver     = false;
    this._paused       = false;
    this._auraDmgAccum = 0;
    this._auraPulse    = 0;
    this._heartTimer   = HEART_SPAWN_INTERVAL;
    this._bossActive   = false;
    this._waveIndex    = 0;
    this._pendingLevels = 0;
  }

  _createWorld() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.add.tileSprite(0, 0, WORLD_W, WORLD_H, 'tile').setOrigin(0, 0).setDepth(0);
  }

  _createPlayer() {
    this._player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    this._auraGfx = this.add.graphics().setDepth(9);

    this._wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
  }

  _createGroups() {
    this._bulletGroup = this.physics.add.group({ runChildUpdate: true });
    this._enemyGroup  = this.physics.add.group();
    this._heartGroup  = this.physics.add.group();
  }

  _createSystems() {
    this._spawn       = new SpawnSystem(this, this._player, this._enemyGroup);
    this._combat      = new CombatSystem(this, this._player, this._bulletGroup, this._enemyGroup);
    this._levelSystem = new LevelSystem(this, this._player);
    this._skillSystem = new SkillSystem(this, this._player, this._enemyGroup, this._combat);
    this._orbSystem   = new OrbSystem(this, this._player, this._combat);

    this.physics.add.overlap(this._player, this._heartGroup, (player, heart) => {
      if (!heart.active) return;
      player.hp = Math.min(player.maxHp, player.hp + heart.healAmount);
      this._hpBar.setFillStyle(0x44ff88);
      this.time.delayedCall(300, () => this._hpBar?.setFillStyle(0xff2244));
      heart.deactivate();
    });
  }

  _createCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this._player, true, 0.1, 0.1);
  }

  _createUI() {
    const W = this.scale.width;
    const H = this.scale.height;

    // HP bar
    this._hpBg    = this.add.rectangle(14, 14, 200, 18, 0x330000).setOrigin(0,0).setScrollFactor(0).setDepth(50);
    this._hpBar   = this.add.rectangle(15, 15, 198, 16, 0xff2244).setOrigin(0,0).setScrollFactor(0).setDepth(51);
    this._hpLabel = this.add.text(20, 15, 'HP', { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' })
      .setScrollFactor(0).setDepth(52);

    // XP bar
    this._xpBg    = this.add.rectangle(14, 38, 200, 10, 0x002233).setOrigin(0,0).setScrollFactor(0).setDepth(50);
    this._xpBar   = this.add.rectangle(15, 39, 0, 8, 0x00ccff).setOrigin(0,0).setScrollFactor(0).setDepth(51);
    this._xpLabel = this.add.text(220, 35, 'LV 1', { fontSize: '12px', fontFamily: 'monospace', color: '#00ccff' })
      .setScrollFactor(0).setDepth(52);

    // Timer survival
    this._timerText = this.add.text(W / 2, 12, '00:00', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(52);

    // Kills
    this._killText = this.add.text(W - 10, 12, 'Kills: 0', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(52);

    // ESC hint
    this.add.text(50, H - 20, 'ESC = Pause', {
      fontSize: '11px', fontFamily: 'monospace', color: '#d0f12a',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(52);

    // Boss wave UI
    this._bossLabel_txt = this.add.text(W / 2, 6, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ff6666', stroke: '#220000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(55).setVisible(false);

    this._bossBarBg = this.add.rectangle(W / 2, 34, 300, 12, 0x220000)
      .setStrokeStyle(1, 0x661111)
      .setScrollFactor(0).setDepth(54).setVisible(false);
    this._bossBar = this.add.rectangle(W / 2 - 149, 34, 298, 10, 0xff2244)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(55).setVisible(false);

    // Wave clear banner (ẩn lúc đầu)
    this._waveClearText = this.add.text(W / 2, H / 2 - 60, '', {
      fontSize: '36px', fontFamily: 'monospace',
      color: '#00ffcc', stroke: '#003322', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setVisible(false);

    this._kills = 0;

  }

  _bindEvents() {
    this.events.on('levelUp', () => this._levelSystem.showUpgradeMenu());
    this.events.on('enemyKilled', () => this._kills++);
    this.events.on('upgradePicked', upg => {
      if (upg.type === 'laser') this._skillSystem.unlock();
      if (upg.type === 'split') this._orbSystem.addOrb();
    });

    this.events.on('bossWaveStart', ({ label, waveIndex }) => {
      this._startBossWave(label, waveIndex);
    });

    // SpawnSystem emit event này sau khi toàn bộ boss đã spawn xong
    this.events.on('bossWaveEnd', ({ waveIndex, bonusLevels }) => {
      this._endBossWave(bonusLevels ?? 0);
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (this._gameOver || this._levelSystem.isActive() || this._paused) return;
      this._paused = true;
      this.scene.pause('GameScene');
      this.scene.launch('PauseScene', { player: this._player });
    });

    this.events.on('resume', () => { this._paused = false; });
  }

  _startBossWave(label, waveIndex) {
    this._bossActive = true;
    this._waveIndex  = waveIndex;

    this._bossLabel_txt.setText(`⚔ ${label}`).setVisible(true);
    this._bossBarBg.setVisible(true);
    // Thanh boss bar giờ chỉ dùng để hiển thị trạng thái, không đếm ngược
    this._bossBar.width = 298;
    this._bossBar.setVisible(true);
    this._timerText.setVisible(false);

  }

  _endBossWave(bonusLevels) {
    this._bossActive = false;

    // Ẩn boss UI, hiện lại timer
    this._bossLabel_txt.setVisible(false);
    this._bossBarBg.setVisible(false);
    this._bossBar.setVisible(false);
    this._timerText.setVisible(true);

    // Flash xanh báo hiệu wave kết thúc

    // Hiện banner WAVE CLEAR
    const W = this.scale.width;
    const H = this.scale.height;
    this._waveClearText
      .setText(`✦ WAVE CLEAR  +${bonusLevels} LV ✦`)
      .setVisible(true)
      .setAlpha(1);

    this.tweens.add({
      targets: this._waveClearText,
      alpha: 0,
      y: H / 2 - 120,
      duration: 2200,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this._waveClearText.setVisible(false).setY(H / 2 - 60);
      },
    });

    // Đưa bonus levels vào hàng đợi — update() sẽ xử lý lần lượt
    if (bonusLevels > 0) {
      this._pendingLevels = (this._pendingLevels || 0) + bonusLevels;
    }
  }

  update(time, delta) {
    if (this._gameOver) return;

    // Xử lý bonus level từ wave clear — mở menu lần lượt, không chồng chéo
    if (this._pendingLevels > 0 && !this._levelSystem.isActive()) {
      this._pendingLevels--;
      this._player.level++;
      this._player.xpToNext = Math.floor(this._player.xpToNext * 1.4);
      this._player.laserDamage += 10;
      getMusic().playSfx('levelup');
      this._levelSystem.showUpgradeMenu();
      return;
    }

    if (this._levelSystem.isActive()) return;

    if (!this._bossActive) this._survived += delta;

    this._player.update(time, delta, this._wasd);

    this._enemyGroup.getChildren().forEach(enemy => {
      if (enemy.active) enemy.update(time, delta, this._player, (s, p) => this._combat.fireEnemyBullet(s, p));
    });

    if (this._player.canFire()) {
      const target = this._combat.findNearestEnemy();
      if (target) { this._combat.fireBulletsAtTarget(target); this._player.onFired(); getMusic().playSfx('shoot'); }
    }

    this._spawn.update(delta);
    this._updateAura(delta);
    this._skillSystem.update(delta);
    this._orbSystem.update(delta);
    this._spawnHearts(delta);
    this._drawShields();
    this._updateUI();

    if (!this._player.isAlive()) this._triggerGameOver();
  }

  _drawShields() {
    this._enemyGroup.getChildren().forEach(enemy => {
      if (!enemy.active || !enemy.hasActiveShield || !enemy.hasActiveShield()) {
        if (enemy._shieldGfx) enemy._shieldGfx.clear();
        return;
      }
      if (!enemy._shieldGfx) enemy._shieldGfx = this.add.graphics().setDepth(6);
      const pulse = (Math.sin(this.time.now / 200) + 1) / 2;
      enemy._shieldGfx.clear();
      enemy._shieldGfx.lineStyle(3 + pulse * 2, 0x4488ff, 0.7 + pulse * 0.3);
      enemy._shieldGfx.strokeCircle(enemy.x, enemy.y, enemy.displayWidth * 0.65);
      enemy._shieldGfx.fillStyle(0x4488ff, 0.08 + pulse * 0.06);
      enemy._shieldGfx.fillCircle(enemy.x, enemy.y, enemy.displayWidth * 0.65);
    });
  }

  _spawnHearts(delta) {
    this._heartTimer -= delta;
    if (this._heartTimer > 0) return;
    this._heartTimer = HEART_SPAWN_INTERVAL;

    const angle = Math.random() * Math.PI * 2;
    const dist  = 200 + Math.random() * 250;
    const x = Phaser.Math.Clamp(this._player.x + Math.cos(angle) * dist, 100, WORLD_W - 100);
    const y = Phaser.Math.Clamp(this._player.y + Math.sin(angle) * dist, 100, WORLD_H - 100);

    let heart = this._heartGroup.getChildren().find(h => !h.active);
    if (!heart) {
      heart = new HeartPickup(this, x, y);
      this._heartGroup.add(heart);
    }
    heart.activate(x, y, HEART_HEAL);
    this.time.delayedCall(12000, () => { if (heart.active) heart.deactivate(); });
  }

  _updateAura(delta) {
    const player = this._player;
    const gfx    = this._auraGfx;
    gfx.clear();
    if (player.auraRadius <= 0) return;

    this._auraPulse = (this._auraPulse + delta / 900) % 1;
    const pulse = Math.sin(this._auraPulse * Math.PI);
    const r     = player.auraRadius;
    const alpha = 0.25 + pulse * 0.30;

    gfx.lineStyle(5 + pulse * 4, 0xcc44ff, alpha + 0.2);
    gfx.strokeCircle(player.x, player.y, r);
    gfx.lineStyle(2, 0xee88ff, alpha * 0.6);
    gfx.strokeCircle(player.x, player.y, r * 0.7);
    gfx.fillStyle(0xcc44ff, alpha * 0.12);
    gfx.fillCircle(player.x, player.y, r);

    this._auraDmgAccum += player.auraDamage * (delta / 1000);
    const dmg = Math.floor(this._auraDmgAccum);
    if (dmg >= 1) {
      this._auraDmgAccum -= dmg;
      this._enemyGroup.getChildren().forEach(enemy => {
        if (!enemy.active) return;
        if (enemy.hasActiveShield && enemy.hasActiveShield()) return;
        if (Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) <= r) {
          if (enemy.takeDamage(dmg)) this._combat.killEnemy(enemy);
        }
      });
    }
  }

  _updateUI() {
    const p = this._player;
    this._hpBar.width = Math.floor(198 * Math.max(0, p.hp / p.maxHp));
    this._hpLabel.setText(`HP  ${Math.ceil(p.hp)}/${p.maxHp}`);
    this._xpBar.width = Math.floor(198 * (p.xp / p.xpToNext));
    this._xpLabel.setText(`LV ${p.level}`);

    if (!this._bossActive) {
      const s = Math.floor(this._survived / 1000);
      this._timerText.setText(
        `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
      );
    }
    this._killText.setText(`Kills: ${this._kills}`);
  }

  _triggerGameOver() {
    this._gameOver = true;
    this.physics.pause();
    getMusic().playSfx('gameover');

    const survivedMs = this._survived;
    const kills      = this._kills;
    const level      = this._player.level;

    const W  = this.scale.width;
    const H  = this.scale.height;
    const cx = W / 2;
    const cy = H / 2;

    this.add.rectangle(cx, cy, W, H, 0x000000, 0.85).setDepth(200).setScrollFactor(0);

    this.add.text(cx, cy - 150, 'GAME OVER', {
      fontSize: '52px', fontFamily: 'monospace',
      color: '#ff2244', stroke: '#440011', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

    const timeStr = formatTime(survivedMs);
    [
      [`⏱  ${timeStr}`,      '#ffffff', cy - 90],
      [`⭐  Level ${level}`, '#00ffcc', cy - 60],
      [`💀  Kills ${kills}`, '#ffcc00', cy - 30],
    ].forEach(([txt, col, y]) => {
      this.add.text(cx, y, txt, { fontSize: '20px', fontFamily: 'monospace', color: col })
        .setOrigin(0.5).setDepth(201).setScrollFactor(0);
    });

    this.add.text(cx, cy + 10, 'NAME:', {
      fontSize: '15px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

    this.add.rectangle(cx, cy + 50, 280, 40, 0x111133)
      .setStrokeStyle(2, 0x00ffcc).setDepth(201).setScrollFactor(0);

    let nameStr  = '';
    let cursorOn = true;

    const nameTxt = this.add.text(cx, cy + 50, '|', {
      fontSize: '20px', fontFamily: 'monospace', color: '#00ffcc',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    const cursorEvent = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => { cursorOn = !cursorOn; nameTxt.setText(nameStr + (cursorOn ? '|' : ' ')); },
    });

    const keyHandler = (e) => {
      if (e.key === 'Backspace') nameStr = nameStr.slice(0, -1);
      else if (e.key === 'Enter') submit();
      else if (e.key.length === 1 && nameStr.length < 16) nameStr += e.key;
      nameTxt.setText(nameStr + (cursorOn ? '|' : ' '));
    };

    this.input.keyboard.on('keydown', keyHandler);

    const cleanup = () => {
      this.input.keyboard.off('keydown', keyHandler);
      cursorEvent.remove(false);
    };

    const submit = () => {
      cleanup();
      const name   = nameStr.trim() || 'Anonymous';
      const scores = saveScore(name, survivedMs, kills, level);
      const idx    = scores.findIndex(s => s.name === name && s.time === survivedMs && s.kills === kills);
      this.scene.start('LeaderboardScene', { highlight: idx });
    };

    const saveBtn = this.add.text(cx, cy + 100, '[ 🏆 SAVE ]', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#443300', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0).setInteractive({ useHandCursor: true });
    saveBtn.on('pointerdown', submit);
    saveBtn.on('pointerover', () => saveBtn.setColor('#fff8cc'));
    saveBtn.on('pointerout',  () => saveBtn.setColor('#ffcc00'));

    this.add.text(cx - 95, cy + 150, '[ AGAIN ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#00ffcc',
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { cleanup(); this.scene.restart(); });

    this.add.text(cx + 95, cy + 150, '[ MENU ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { cleanup(); this.scene.start('MenuScene'); });
  }
}