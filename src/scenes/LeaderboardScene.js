/**
 * LeaderboardScene.js  — phiên bản sửa lỗi
 */

import Phaser from 'phaser';

const STORAGE_KEY = 'survivor_leaderboard';
const MAX_ENTRIES = 10;

export function loadScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScore(name, timeMs, kills, level) {
  const scores = loadScores();
  scores.push({
    name: (name || 'Anonymous').trim().slice(0, 16),
    time: timeMs,
    kills,
    level,
    date: new Date().toLocaleDateString('vi-VN'),
  });
  scores.sort((a, b) => b.time - a.time);
  const top = scores.slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(top));
  return top;
}

export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  init(data) {
    this._highlight = data?.highlight ?? null;
  }

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const cx = W / 2;

    this.add.rectangle(cx, H / 2, W, H, 0x0a0a1a);

    const g = this.add.graphics();
    g.lineStyle(2, 0x00ffcc, 0.25);
    g.strokeRect(20, 20, W - 40, H - 40);

    this.add.text(cx, 55, '🏆  RANK', {
      fontSize: '35px', fontFamily: 'monospace',
      color: '#ffcc00', stroke: '#443300', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 93, 'Top 10 — longest survival time!', {
      fontSize: '13px', fontFamily: 'monospace', color: '#fea942',
    }).setOrigin(0.5);

    const tableW = 700;
    const tableX = cx - tableW / 2;
    const col = [
      tableX + 10,
      tableX + 90,
      tableX + tableW - 10,
    ];

    ['#', 'Name', 'Time'].forEach((h, i) => {
      const origin = i === 2 ? 1 : 0;
      this.add.text(col[i], 128, h, {
        fontSize: '20px', fontFamily: 'monospace', color: '#f6f6fa',
      }).setOrigin(origin, 0.5);
    });

    const lg = this.add.graphics();
    lg.lineStyle(1, 0x333355);
    lg.lineBetween(tableX, 145, tableX + tableW, 145);

    const scores = loadScores();

    if (scores.length === 0) {
      this.add.text(cx, H / 2 - 20, '....\nPlay to set a record! 🎮', {
        fontSize: '24px', fontFamily: 'monospace',
        color: '#444466', align: 'center',
      }).setOrigin(0.5);
    } else {
      scores.forEach((entry, i) => {
        const y         = 175 + i * 50;
        const isNew     = i === this._highlight;
        const rankColor = i === 0 ? '#ffcc00' : i === 1 ? '#bbbbbb' : i === 2 ? '#cc7722' : '#666688';
        const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

        if (isNew) {
          this.add.rectangle(cx, y, tableW, 44, 0x112211).setStrokeStyle(1, 0x00ffcc);
          this.add.text(tableX + tableW + 8, y, '◀ NEW', {
            fontSize: '14px', fontFamily: 'monospace', color: '#00ffcc',
          }).setOrigin(0, 0.5);
        }

        const rowLine = this.add.graphics();
        rowLine.lineStyle(1, 0x1a1a2e);
        rowLine.lineBetween(tableX, y + 25, tableX + tableW, y + 25);

        this.add.text(col[0], y, rankLabel, {
          fontSize: '28px', fontFamily: 'monospace', color: rankColor,
        }).setOrigin(0, 0.5);

        this.add.text(col[1], y, entry.name, {
          fontSize: '28px', fontFamily: 'monospace',
          color: isNew ? '#00ffcc' : '#dddddd',
        }).setOrigin(0, 0.5);

        this.add.text(col[2], y, formatTime(entry.time), {
          fontSize: '30px', fontFamily: 'monospace', color: '#88ffcc',
        }).setOrigin(1, 0.5);
      });
    }

    const btnY = H - 58;

    const menuBtn = this.add.text(cx - 100, btnY, '[ MENU ]', {
      fontSize: '22px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#aaaaaa'));

    const playBtn = this.add.text(cx + 100, btnY, '[ PLAY AGAIN ]', {
      fontSize: '22px', fontFamily: 'monospace', color: '#00ffcc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    playBtn.on('pointerdown', () => this.scene.start('GameScene'));
    playBtn.on('pointerover', () => playBtn.setColor('#ffffff'));
    playBtn.on('pointerout',  () => playBtn.setColor('#00ffcc'));

    this.add.text(W - 20, H - 16, 'xoá tất cả', {
      fontSize: '11px', fontFamily: 'monospace', color: '#2a2a44',
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { localStorage.removeItem(STORAGE_KEY); this.scene.restart(); })
      .on('pointerover', function () { this.setColor('#ff4444'); })
      .on('pointerout',  function () { this.setColor('#2a2a44'); });
  }
}
