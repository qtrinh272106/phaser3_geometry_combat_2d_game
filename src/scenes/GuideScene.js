import Phaser from 'phaser';

const GUIDE_COUNT = 5; // phải khớp với số trong BootScene

export default class GuideScene extends Phaser.Scene {
  constructor() { super({ key: 'GuideScene' }); }

  init(data) {
    this._from = data?.from || 'MenuScene';
    this._page = 0;
  }

  create() {
    const { width: W, height: H } = this.scale;
    const cx = W / 2, cy = H / 2;

    // Đếm số slide thực sự đã load
    this._total = 0;
    for (let i = 1; i <= GUIDE_COUNT; i++) {
      if (this.textures.exists(`guide_${i}`)) this._total = i;
      else break;
    }
    if (this._total === 0) this._total = 1; // fallback

    // Dim overlay
    this.add.rectangle(cx, cy, W, H, 0x000000, 0.88).setDepth(0);

    // Panel background
    const PW = Math.min(W - 80, 900);
    const PH = Math.min(H - 120, 600);
    this.add.rectangle(cx, cy, PW, PH, 0x0a0a1a).setStrokeStyle(2, 0x4444aa).setDepth(1);

    // Title
    this.add.text(cx, cy - PH / 2 + 28, 'HOW TO PLAY', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(3);

    this.add.rectangle(cx, cy - PH / 2 + 50, PW - 40, 1, 0x333366).setDepth(3);

    // Slide image container
    const slideY  = cy - 20;
    const slideW  = PW - 80;
    const slideH  = PH - 140;

    this._slideImg = this.add.image(cx, slideY, `guide_1`)
      .setDepth(2)
      .setDisplaySize(slideW, slideH);
    // Fallback nếu ảnh không tồn tại
    if (!this.textures.exists('guide_1')) {
      this._slideImg.setVisible(false);
      this._placeholderTxt = this.add.text(cx, slideY,
        'Thêm ảnh vào\npublic/assets/ui/guide/guide_1.png', {
          fontSize: '16px', fontFamily: 'monospace', color: '#666688', align: 'center',
        }).setOrigin(0.5).setDepth(3);
    }

    // Page indicator
    this._pageTxt = this.add.text(cx, cy + PH / 2 - 48, `1 / ${this._total}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#8888cc',
    }).setOrigin(0.5).setDepth(3);

    // Nav buttons
    const navY = cy + PH / 2 - 28;

    this._prevBtn = this._navBtn(cx - 130, navY, '◀  PREV', 0x8888ff, () => this._go(-1));
    this._nextBtn = this._navBtn(cx + 130, navY, 'NEXT  ▶', 0x8888ff, () => this._go(+1));
    this._backBtn = this._navBtn(cx - 290, navY, '← BACK', 0x00ffcc, () => this.scene.start(this._from));

    // Keyboard nav
    this.input.keyboard.on('keydown-LEFT',  () => this._go(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this._go(+1));
    this.input.keyboard.on('keydown-ESC',   () => this.scene.start(this._from));

    this._refresh();
  }

  _go(dir) {
    const next = this._page + dir;
    if (next < 0 || next >= this._total) return;
    this._page = next;
    this._refresh();
  }

  _refresh() {
    const key = `guide_${this._page + 1}`;
    if (this.textures.exists(key)) {
      this._slideImg.setTexture(key).setVisible(true);
      if (this._placeholderTxt) { this._placeholderTxt.setVisible(false); }
    }
    this._pageTxt.setText(`${this._page + 1} / ${this._total}`);

    // Fade in
    this._slideImg.setAlpha(0);
    this.tweens.add({ targets: this._slideImg, alpha: 1, duration: 200, ease: 'Linear' });

    // Disable/enable nav arrows
    this._prevBtn.setAlpha(this._page === 0 ? 0.3 : 1);
    this._nextBtn.setAlpha(this._page >= this._total - 1 ? 0.3 : 1);
  }

  _navBtn(x, y, label, color, onClick) {
    const hex  = '#' + color.toString(16).padStart(6, '0');
    const rect = this.add.rectangle(x, y, 140, 36, 0x111133)
      .setStrokeStyle(1, color).setDepth(3).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '13px', fontFamily: 'monospace', color: hex,
    }).setOrigin(0.5).setDepth(4);
    rect.on('pointerover', () => rect.setAlpha(0.6));
    rect.on('pointerout',  () => rect.setAlpha(rect._disabled ? 0.3 : 1));
    rect.on('pointerdown', onClick);
    return rect;
  }
}