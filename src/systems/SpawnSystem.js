import Phaser from 'phaser';
import Enemy, { ENEMY_TYPES } from '../objects/Enemy.js';

// Hard cap: số lượng cố định mỗi loại boss spawn trong mỗi wave
const BOSS_HARD_CAP = {
  [ENEMY_TYPES.SHOOTER]:  20,
  [ENEMY_TYPES.GIANT]:    10,
  [ENEMY_TYPES.HEPTAGON]: 5,
  [ENEMY_TYPES.OCTAGON]:  4,
  [ENEMY_TYPES.NONAGON]:  2,
  [ENEMY_TYPES.DECAGON]:  1,
};

// Mốc thời gian (ms) và cấu hình boss wave
const MILESTONES = [
  { time: 180000, label: 'WAVE 1 — SHOOTER', bossTypes: [
    { type: ENEMY_TYPES.SHOOTER, delay: 200 },
    { type: ENEMY_TYPES.SLOW,    count: 25, delay: 100 },
    { type: ENEMY_TYPES.FAST,    count: 20, delay: 150 },
  ]},
  { time: 360000, label: 'WAVE 2 — GIANT', bossTypes: [
    { type: ENEMY_TYPES.GIANT,   delay: 600 },
    { type: ENEMY_TYPES.SHOOTER, delay: 300 },
    { type: ENEMY_TYPES.SLOW,    count: 15, delay: 100 },
  ]},
  { time: 540000, label: 'WAVE 3 — HEPTAGON', bossTypes: [
    { type: ENEMY_TYPES.HEPTAGON, delay: 700 },
    { type: ENEMY_TYPES.GIANT,    delay: 500 },
    { type: ENEMY_TYPES.SHOOTER,  delay: 300 },
  ]},
  { time: 720000, label: 'WAVE 4 — OCTAGON', bossTypes: [
    { type: ENEMY_TYPES.OCTAGON,  delay: 900 },
    { type: ENEMY_TYPES.HEPTAGON, delay: 600 },
    { type: ENEMY_TYPES.GIANT,    delay: 500 },
  ]},
  { time: 900000, label: 'WAVE 5 — NONAGON', bossTypes: [
    { type: ENEMY_TYPES.NONAGON,  delay: 300 },
    { type: ENEMY_TYPES.OCTAGON,  delay: 800 },
    { type: ENEMY_TYPES.HEPTAGON, delay: 600 },
  ]},
  { time: 1080000, label: 'BOSS — DECAGON', bossTypes: [
    { type: ENEMY_TYPES.DECAGON,  delay: 1500 },
    { type: ENEMY_TYPES.NONAGON,  delay: 300 },
    { type: ENEMY_TYPES.OCTAGON,  delay: 800 },
    { type: ENEMY_TYPES.HEPTAGON, delay: 600 },
  ]},
];

// Pool enemy thường mở rộng dần theo milestone
const REGULAR_POOL_BY_MILESTONE = [
  [ENEMY_TYPES.SLOW, ENEMY_TYPES.FAST],
  [ENEMY_TYPES.SLOW, ENEMY_TYPES.FAST, ENEMY_TYPES.SHOOTER],
  [ENEMY_TYPES.SLOW, ENEMY_TYPES.FAST, ENEMY_TYPES.SHOOTER, ENEMY_TYPES.GIANT],
  [ENEMY_TYPES.SLOW, ENEMY_TYPES.FAST, ENEMY_TYPES.SHOOTER, ENEMY_TYPES.GIANT, ENEMY_TYPES.HEPTAGON],
  [ENEMY_TYPES.SLOW, ENEMY_TYPES.FAST, ENEMY_TYPES.SHOOTER, ENEMY_TYPES.GIANT, ENEMY_TYPES.HEPTAGON, ENEMY_TYPES.OCTAGON],
  [ENEMY_TYPES.SLOW, ENEMY_TYPES.FAST, ENEMY_TYPES.SHOOTER, ENEMY_TYPES.GIANT, ENEMY_TYPES.HEPTAGON, ENEMY_TYPES.OCTAGON, ENEMY_TYPES.NONAGON],
  [ENEMY_TYPES.SLOW, ENEMY_TYPES.FAST, ENEMY_TYPES.SHOOTER, ENEMY_TYPES.GIANT, ENEMY_TYPES.HEPTAGON, ENEMY_TYPES.OCTAGON, ENEMY_TYPES.NONAGON, ENEMY_TYPES.DECAGON],
];

export default class SpawnSystem {
  constructor(scene, player, enemyGroup) {
    this.scene      = scene;
    this.player     = player;
    this.enemyGroup = enemyGroup;

    this._spawnTimer   = 0;
    this._baseRate     = 1800;
    this._minRate      = 320;
    this._elapsed      = 0;
    this._waveSize     = 1;
    this._milestoneIdx = 0;
    this._regularMult  = 1.0;

    // Cờ chặn spawn thường trong thời gian boss wave đang spawn
    this._bossActive   = false;
    this._bossesRemaining = 0;

    this.scene.events.on('enemyKilled', this._onEnemyKilled, this);

    // Tập các type đã xuất hiện trong boss wave hiện tại (bị chặn khỏi spawn thường sau wave)
    this._blockedTypes = new Set();

    this._currentPool  = REGULAR_POOL_BY_MILESTONE[0];
  }

  update(delta) {
    this._elapsed    += delta;
    this._spawnTimer += delta;

    const rate = Math.max(this._minRate, this._baseRate - Math.floor(this._elapsed / 8000) * 55);
    this._waveSize = 1 + Math.floor(this._elapsed / 22000);

    // Chỉ spawn thường khi không có boss wave đang diễn ra
    if (!this._bossActive && this._spawnTimer >= rate) {
      this._spawnTimer = 0;
      this._spawnWave();
    }

    this._checkMilestone();
  }

  _checkMilestone() {
    if (this._milestoneIdx >= MILESTONES.length) return;
    const ms = MILESTONES[this._milestoneIdx];
    if (this._elapsed < ms.time) return;

    // Tiêu thụ milestone ngay để không trigger lại
    this._milestoneIdx++;

    // Cập nhật pool enemy thường cho giai đoạn mới
    this._currentPool = REGULAR_POOL_BY_MILESTONE[
      Math.min(this._milestoneIdx, REGULAR_POOL_BY_MILESTONE.length - 1)
    ];

    // Reset blocked types từ wave trước để wave mới có thể dùng lại
    this._blockedTypes = new Set();

    // Bật boss mode — chặn spawn thường
    this._bossActive = true;

    this.scene.events.emit('bossWaveStart', { label: ms.label, waveIndex: this._milestoneIdx });

    // Wave kết thúc sau tối đa 30s kể từ khi bắt đầu
    const WAVE_DURATION = 30000;

    // Tính tổng delay để biết khi nào toàn bộ boss đã được schedule xong
    let totalDelay = 500;

    ms.bossTypes.forEach(group => {
      // Lấy hard cap nếu là boss type, hoặc dùng count gốc cho slow/fast
      const isBossType = BOSS_HARD_CAP.hasOwnProperty(group.type);
      const spawnCount = isBossType ? BOSS_HARD_CAP[group.type] : (group.count ?? 0);

      if (spawnCount <= 0) return;

      // Nếu là boss type, đăng ký vào blocked set ngay (sẽ bị chặn sau wave)
      if (isBossType) {
        this._blockedTypes.add(group.type);
      }

      if (isBossType) this._bossesRemaining += spawnCount;

      for (let i = 0; i < spawnCount; i++) {
        this.scene.time.delayedCall(totalDelay + i * group.delay, () => {
          const pos = this._randomEdgePosition();
          this._spawnEnemy(pos.x, pos.y, group.type, 1, 1);
        });
      }

      totalDelay += spawnCount * group.delay + 200;
    });

    // Wave kết thúc khi toàn bộ boss (isBossType) bị tiêu diệt — xem _onEnemyKilled
  }

  _onEnemyKilled({ type } = {}) {
    if (!this._bossActive) return;
    // Chỉ đếm ngược khi là boss type
    const isBossType = BOSS_HARD_CAP.hasOwnProperty(type);
    if (!isBossType) return;

    this._bossesRemaining--;
    if (this._bossesRemaining > 0) return;

    // Tất cả boss đã chết → kết thúc wave
    this._baseRate = Math.max(this._minRate, this._baseRate - 200);
    this._spawnTimer = this._baseRate;
    this._regularMult *= 1.2;
    this._bossActive = false;

    this.scene.events.emit('bossWaveEnd', {
      waveIndex: this._milestoneIdx,
      bonusLevels: 1,
    });
  }

  // Tiêu diệt toàn bộ enemy đang active trên map (deactivate về pool, không destroy)
  _clearAllEnemies() {
    this.enemyGroup.getChildren().forEach(e => {
      if (e.active) {
        e.setActive(false);
        e.setVisible(false);
        if (e.body) e.body.reset(0, 0);
      }
    });
  }

  _spawnWave() {
    for (let i = 0; i < this._waveSize; i++) {
      const pos  = this._randomEdgePosition();
      const type = this._pickType();

      // type === null nghĩa là không có type hợp lệ nào (pool bị block hết)
      if (type === null) continue;

      const [hm, dm] = (type === ENEMY_TYPES.SLOW || type === ENEMY_TYPES.FAST)
        ? [this._regularMult, this._regularMult]
        : [1, 1];

      this._spawnEnemy(pos.x, pos.y, type, hm, dm);
    }
  }

  _pickType() {
    // Lọc pool hiện tại, bỏ các type đã bị chặn
    const availablePool = this._currentPool.filter(t => !this._blockedTypes.has(t));
    if (availablePool.length === 0) return null;

    const roll = Math.random();
    const t    = this._elapsed;
    const fastChance = t < 10000 ? 0 : Math.min(0.30, (t - 10000) / 60000);

    // Chỉ dùng SLOW/FAST nếu chúng không bị block
    const slowOk = availablePool.includes(ENEMY_TYPES.SLOW);
    const fastOk = availablePool.includes(ENEMY_TYPES.FAST);

    if (slowOk && roll < 0.35)                    return ENEMY_TYPES.SLOW;
    if (fastOk && roll < 0.35 + fastChance)        return ENEMY_TYPES.FAST;

    const advanced = availablePool.filter(
      t => t !== ENEMY_TYPES.SLOW && t !== ENEMY_TYPES.FAST
    );

    if (advanced.length > 0) {
      return advanced[Math.floor(Math.random() * advanced.length)];
    }

    // Fallback: lấy bất kỳ type nào còn available
    return availablePool[Math.floor(Math.random() * availablePool.length)];
  }

  _randomEdgePosition() {
    const margin = 90;
    const halfW  = this.scene.scale.width  / 2 + margin;
    const halfH  = this.scene.scale.height / 2 + margin;
    const cx = this.player.x, cy = this.player.y;
    const side = Phaser.Math.Between(0, 3);
    let x, y;
    switch (side) {
      case 0: x = cx + Phaser.Math.Between(-halfW, halfW); y = cy - halfH; break;
      case 1: x = cx + Phaser.Math.Between(-halfW, halfW); y = cy + halfH; break;
      case 2: x = cx - halfW; y = cy + Phaser.Math.Between(-halfH, halfH); break;
      case 3: x = cx + halfW; y = cy + Phaser.Math.Between(-halfH, halfH); break;
    }
    x = Phaser.Math.Clamp(x, 60, 4940);
    y = Phaser.Math.Clamp(y, 60, 4940);
    return { x, y };
  }

  _spawnEnemy(x, y, type, hpMult = 1, dmgMult = 1) {
    const dead = this.enemyGroup.getChildren().find(e => !e.active);
    if (dead) {
      dead.activate(x, y, type, hpMult, dmgMult);
    } else {
      const enemy = new Enemy(this.scene, x, y);
      this.scene.add.existing(enemy);
      this.scene.physics.add.existing(enemy);
      enemy.activate(x, y, type, hpMult, dmgMult);
      this.enemyGroup.add(enemy);
    }
  }
}