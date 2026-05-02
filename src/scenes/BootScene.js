import Phaser from 'phaser';

function neonCircle(g, cx, cy, r, color, layers = 5) {
  for (let i = layers; i >= 0; i--) {
    const alpha = i === 0 ? 1 : (0.08 + (layers - i) * 0.02);
    g.fillStyle(color, alpha);
    g.fillCircle(cx, cy, r + i * 3.5);
  }
}

function neonPoly(g, cx, cy, r, n, color, layers = 5, rot = 0) {
  for (let l = layers; l >= 0; l--) {
    const alpha = l === 0 ? 0.95 : (0.06 + (layers - l) * 0.025);
    const R = r + l * 3;
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + rot;
      return new Phaser.Geom.Point(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    });
    g.fillStyle(color, alpha);
    g.fillPoints(pts, true);
  }
}

function neonRect(g, cx, cy, w, h, color, layers = 5) {
  for (let l = layers; l >= 0; l--) {
    const alpha = l === 0 ? 0.95 : (0.06 + (layers - l) * 0.025);
    const p = l * 3;
    g.fillStyle(color, alpha);
    g.fillRect(cx - w/2 - p, cy - h/2 - p, w + p*2, h + p*2);
  }
}

function neonTri(g, x1, y1, x2, y2, x3, y3, color, layers = 4) {
  const cx = (x1+x2+x3)/3, cy = (y1+y2+y3)/3;
  for (let l = layers; l >= 0; l--) {
    const alpha = l === 0 ? 0.95 : (0.07 + (layers-l)*0.03);
    const f = 1 + l * 0.12;
    const pts = [
      new Phaser.Geom.Point(cx+(x1-cx)*f, cy+(y1-cy)*f),
      new Phaser.Geom.Point(cx+(x2-cx)*f, cy+(y2-cy)*f),
      new Phaser.Geom.Point(cx+(x3-cx)*f, cy+(y3-cy)*f),
    ];
    g.fillStyle(color, alpha);
    g.fillPoints(pts, true);
  }
}

export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    this.load.image('tile',     '/assets/map.png');
    this.load.image('bg_menu',  '/assets/bg_menu.png');
    this.load.image('bg_panel', '/assets/bg_panel.png');

    // Menu buttons — normal + hover
    ['start', 'rank', 'guide', 'settings'].forEach(name => {
      this.load.image(`btn_${name}`,       `/assets/ui/btn_${name}.png`);
      this.load.image(`btn_${name}_hover`, `/assets/ui/btn_${name}_hover.png`);
    });

    // Guide slides — load đến khi không còn file
    const GUIDE_COUNT = 5; // đổi số này nếu có nhiều/ít hơn
    for (let i = 1; i <= GUIDE_COUNT; i++) {
      this.load.image(`guide_${i}`, `/assets/ui/guide/guide_${i}.png`);
    }
  }

  create() {
    const mk = (fn, w, h, key) => {
      const g = this.make.graphics({ add: false });
      fn(g); g.generateTexture(key, w, h); g.destroy();
    };

    // Player — simple teal circle
    mk(g => {
      g.fillStyle(0xffffe0); g.fillCircle(16, 16, 14);
      g.fillStyle(0xffe4b5); g.fillCircle(16, 16, 8);
      g.fillStyle(0xffffe0); g.fillCircle(16, 16, 4);
    }, 32, 32, 'player');

    // Bullet — simple yellow circle
    mk(g => {
      g.fillStyle(0xffdd00); g.fillCircle(5, 5, 5);
    }, 10, 10, 'bullet');

    // Enemy slow — red square
    mk(g => {
      neonRect(g, 20, 20, 28, 28, 0xff2222, 5);
      neonRect(g, 20, 20, 16, 16, 0xff6666, 3);
      g.fillStyle(0xffffff, 0.6); g.fillRect(17, 17, 6, 6);
    }, 40, 40, 'enemy_slow');

    // Enemy fast — orange triangle
    mk(g => {
      neonTri(g, 20, 2, 2, 34, 38, 34, 0xff8800, 5);
      neonTri(g, 20, 8, 8, 30, 32, 30, 0xffaa44, 3);
      g.fillStyle(0xffffff, 0.5); g.fillTriangle(20, 12, 14, 26, 26, 26);
    }, 40, 36, 'enemy_fast');

    // Enemy shooter — purple pentagon (no neon)
    mk(g => {
      const pts5 = (r) => Array.from({length:5},(_,i)=>new Phaser.Geom.Point(24+Math.cos(i/5*Math.PI*2-Math.PI/2)*r, 24+Math.sin(i/5*Math.PI*2-Math.PI/2)*r));
      g.fillStyle(0xaa44ff, 1); g.fillPoints(pts5(18), true);
      g.fillStyle(0xcc88ff, 1); g.fillPoints(pts5(10), true);
      g.fillStyle(0xffffff, 0.7); g.fillCircle(24, 24, 3);
    }, 48, 48, 'enemy_shooter');

    // Enemy shooter bullet — small purple pentagon (no neon)
    mk(g => {
      const pts5 = (r) => Array.from({length:5},(_,i)=>new Phaser.Geom.Point(10+Math.cos(i/5*Math.PI*2-Math.PI/2)*r, 10+Math.sin(i/5*Math.PI*2-Math.PI/2)*r));
      g.fillStyle(0xcc44ff, 1); g.fillPoints(pts5(8), true);
      g.fillStyle(0xee88ff, 1); g.fillPoints(pts5(4), true);
    }, 20, 20, 'bullet_shooter');

    // Enemy giant — dark red hexagon (no neon)
    mk(g => {
      const pts6 = (r) => Array.from({length:6},(_,i)=>new Phaser.Geom.Point(64+Math.cos(i/6*Math.PI*2)*r, 64+Math.sin(i/6*Math.PI*2)*r));
      g.fillStyle(0xcc1111, 1); g.fillPoints(pts6(56), true);
      g.fillStyle(0xff3333, 1); g.fillPoints(pts6(36), true);
      g.fillStyle(0xff8888, 1); g.fillPoints(pts6(18),  true);
      g.fillStyle(0xffffff, 0.5); g.fillCircle(64, 64, 4);
    }, 128, 128, 'enemy_giant');

    // Heptagon — dark blue (7, no neon)
    mk(g => {
      const pts7 = (r) => Array.from({length:7},(_,i)=>new Phaser.Geom.Point(32+Math.cos(i/7*Math.PI*2)*r, 32+Math.sin(i/7*Math.PI*2)*r));
      g.fillStyle(0x1155ee, 1); g.fillPoints(pts7(26), true);
      g.fillStyle(0x4488ff, 1); g.fillPoints(pts7(15), true);
      g.fillStyle(0xffffff, 0.6); g.fillCircle(32, 32, 4);
    }, 64, 64, 'enemy_heptagon');

    // Shield aura texture
    mk(g => {
      g.fillStyle(0x4488ff, 0.15); g.fillCircle(36, 36, 34);
      g.lineStyle(3, 0x88ccff, 0.9); g.strokeCircle(36, 36, 32);
      g.lineStyle(1, 0xaaddff, 0.5); g.strokeCircle(36, 36, 28);
    }, 72, 72, 'shield_aura');

    // Octagon — yellow (8, no neon)
    mk(g => {
      const pts8 = (r) => Array.from({length:8},(_,i)=>new Phaser.Geom.Point(48+Math.cos(i/8*Math.PI*2+Math.PI/8)*r, 48+Math.sin(i/8*Math.PI*2+Math.PI/8)*r));
      g.fillStyle(0xffcc00, 1); g.fillPoints(pts8(42), true);
      g.fillStyle(0xffee44, 1); g.fillPoints(pts8(26), true);
      g.fillStyle(0xffffa0, 1); g.fillPoints(pts8(12), true);
      g.fillStyle(0xffffff, 0.7); g.fillCircle(48, 48, 5);
    }, 96, 96, 'enemy_octagon');

    // Nonagon — light gray (9, no neon)
    mk(g => {
      const pts9 = (r) => Array.from({length:9},(_,i)=>new Phaser.Geom.Point(24+Math.cos(i/9*Math.PI*2)*r, 24+Math.sin(i/9*Math.PI*2)*r));
      g.fillStyle(0x999999, 1); g.fillPoints(pts9(20), true);
      g.fillStyle(0xcccccc, 1); g.fillPoints(pts9(12), true);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(24, 24, 3);
    }, 48, 48, 'enemy_nonagon');

    // Decagon — white boss (10, no neon)
    mk(g => {
      const pts10 = (r) => Array.from({length:10},(_,i)=>new Phaser.Geom.Point(32+Math.cos(i/10*Math.PI*2)*r, 32+Math.sin(i/10*Math.PI*2)*r));
      g.fillStyle(0xddddff, 1); g.fillPoints(pts10(28), true);
      g.fillStyle(0xeeeeff, 1); g.fillPoints(pts10(17), true);
      g.fillStyle(0xffffff, 1); g.fillPoints(pts10(8),  true);
      g.fillStyle(0xffffff, 1); g.fillCircle(32, 32, 4);
    }, 64, 64, 'enemy_decagon');

    // Giant bullet (decagon)
    mk(g => {
      neonCircle(g, 20, 20, 14, 0xffffff, 5);
      neonCircle(g, 20, 20, 8,  0xeeeeff, 3);
      g.fillStyle(0xffffff, 1); g.fillCircle(20, 20, 4);
    }, 40, 40, 'bullet_giant');



    // Particle
    mk(g => {
      g.fillStyle(0xffffff, 0.9); g.fillCircle(4, 4, 4);
    }, 8, 8, 'particle');

    // Heart — simple pink
    mk(g => {
      g.fillStyle(0xff2255);
      g.fillCircle(8, 7, 7); g.fillCircle(18, 7, 7);
      g.fillTriangle(1, 10, 25, 10, 13, 24);
      g.fillStyle(0xff88aa, 0.7); g.fillCircle(7, 5, 3);
    }, 26, 24, 'heart');

    document.fonts.load('16px AvegaenceCiel').then(() => {
      this.scene.start('MenuScene');
    });
  }
}