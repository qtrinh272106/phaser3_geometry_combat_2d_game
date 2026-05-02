// ─────────────────────────────────────────────────────────────────────────────
// MusicManager — BGM (menu/game separate) + SFX pool + persistent settings
// ─────────────────────────────────────────────────────────────────────────────

const SFX_CONFIG = {
  shoot:    { src: '/sfx/shoot.mp3',    volume: 0.35, maxPool: 6 },
  laser:    { src: '/sfx/laser.mp3',    volume: 0.70, maxPool: 1 },
  levelup:  { src: '/sfx/levelup.mp3',  volume: 0.80, maxPool: 1 },
  gameover: { src: '/sfx/gameover.mp3', volume: 0.90, maxPool: 1 },
};

const MENU_TRACKS = [
  { name: '🎵', src: '/music/menu.mp3' },
];

const GAME_TRACKS = [
  { name: '🎵', src: '/music/game.mp3' },
  // { name: '🎶 Bài 2', src: '/music/bai2.mp3' },
];

// Load settings từ localStorage
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('gc_settings') || '{}');
    return {
      bgmOn:     s.bgmOn     !== false,
      sfxOn:     s.sfxOn     !== false,
      bgmVolume: s.bgmVolume ?? 0.5,
      sfxVolume: s.sfxVolume ?? 0.8,
    };
  } catch { return { bgmOn: true, sfxOn: true, bgmVolume: 0.5, sfxVolume: 0.8 }; }
}

function saveSettings(s) {
  try { localStorage.setItem('gc_settings', JSON.stringify(s)); } catch {}
}

export default class MusicManager {
  constructor() {
    const cfg = loadSettings();
    this._bgmOn     = cfg.bgmOn;
    this._sfxOn     = cfg.sfxOn;
    this._bgmVolume = cfg.bgmVolume;
    this._sfxVolume = cfg.sfxVolume;

    this._audio   = null;
    this._context = 'menu'; // 'menu' | 'game'
    this._index   = 0;

    this._sfxPools = {};
    this._sfxReady = false;

    // Preload SFX sau gesture đầu tiên
    this._onGesture = () => {
      this._preloadSfx();
      document.removeEventListener('click',   this._onGesture);
      document.removeEventListener('keydown', this._onGesture);
    };
    document.addEventListener('click',   this._onGesture);
    document.addEventListener('keydown', this._onGesture);
  }

  // ── Context switching ─────────────────────────────────────────────────
  playMenu() {
    this._context = 'menu';
    this._index   = 0;
    if (this._bgmOn) this._load(MENU_TRACKS[0].src);
  }

  playGame() {
    this._context = 'game';
    this._index   = 0;
    if (this._bgmOn) this._load(GAME_TRACKS[0].src);
  }

  // ── BGM internals ─────────────────────────────────────────────────────
  _tracks()  { return this._context === 'menu' ? MENU_TRACKS : GAME_TRACKS; }

  _load(src) {
    if (this._audio) { this._audio.pause(); this._audio = null; }
    if (!src) return;
    const a = new Audio(src);
    a.volume = this._bgmVolume;
    a.loop   = true;
    a.play().catch(() => {});
    this._audio = a;
  }

  stop()  { if (this._audio) { this._audio.pause(); this._audio = null; } }

  next() {
    const tracks = this._tracks();
    this._index  = (this._index + 1) % tracks.length;
    if (this._bgmOn) this._load(tracks[this._index].src);
    return this.currentName();
  }

  prev() {
    const tracks = this._tracks();
    this._index  = (this._index - 1 + tracks.length) % tracks.length;
    if (this._bgmOn) this._load(tracks[this._index].src);
    return this.currentName();
  }

  // ── BGM settings ──────────────────────────────────────────────────────
  setBgmOn(val) {
    this._bgmOn = val;
    if (val) {
      const src = this._tracks()[this._index]?.src;
      this._load(src);
    } else {
      this.stop();
    }
    this._save();
  }

  setBgmVolume(v) {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    if (this._audio) this._audio.volume = this._bgmVolume;
    this._save();
  }

  volumeUp()   { this.setBgmVolume(parseFloat((this._bgmVolume + 0.1).toFixed(1))); return this.getVolume(); }
  volumeDown() { this.setBgmVolume(parseFloat((this._bgmVolume - 0.1).toFixed(1))); return this.getVolume(); }

  // ── SFX ───────────────────────────────────────────────────────────────
  _preloadSfx() {
    Object.entries(SFX_CONFIG).forEach(([key, cfg]) => {
      this._sfxPools[key] = Array.from({ length: cfg.maxPool }, () => {
        const a = new Audio(cfg.src);
        a.volume  = cfg.volume * this._sfxVolume;
        a.preload = 'auto';
        return a;
      });
    });
    this._sfxReady = true;
  }

  _getPooled(key) {
    const pool = this._sfxPools[key];
    if (!pool) return null;
    const free = pool.find(a => a.paused || a.ended);
    if (free) return free;
    if (pool.length < SFX_CONFIG[key].maxPool) {
      const clone = new Audio(SFX_CONFIG[key].src);
      clone.volume = SFX_CONFIG[key].volume * this._sfxVolume;
      pool.push(clone);
      return clone;
    }
    pool[0].currentTime = 0;
    return pool[0];
  }

  playSfx(key) {
    if (!this._sfxReady || !this._sfxOn) return;
    const a = this._getPooled(key);
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  setSfxOn(val) {
    this._sfxOn = val;
    this._save();
  }

  setSfxVolume(v) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    Object.entries(SFX_CONFIG).forEach(([key, cfg]) => {
      (this._sfxPools[key] || []).forEach(a => { a.volume = cfg.volume * this._sfxVolume; });
    });
    this._save();
  }

  // ── Persist ───────────────────────────────────────────────────────────
  _save() {
    saveSettings({
      bgmOn: this._bgmOn, sfxOn: this._sfxOn,
      bgmVolume: this._bgmVolume, sfxVolume: this._sfxVolume,
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────
  isBgmOn()     { return this._bgmOn; }
  isSfxOn()     { return this._sfxOn; }
  isPlaying()   { return this._audio && !this._audio.paused; }
  currentName() { return this._tracks()[this._index]?.name ?? '—'; }
  getVolume()   { return Math.round(this._bgmVolume * 100); }
  getSfxVolume(){ return Math.round(this._sfxVolume * 100); }
  getBgmVolume(){ return this._bgmVolume; }

  // backward compat
  play() { if (this._bgmOn) this._load(this._tracks()[this._index]?.src); }
  init() {}
  setVolume(v) { this.setBgmVolume(v); }
}