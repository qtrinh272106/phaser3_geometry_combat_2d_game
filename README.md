# Geometry Combat — Phaser 3 + Vite

A 2D bullet-heaven survivor game built with Phaser 3, Vite, and ES6 modules.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Controls

| Key | Action |
|-----|--------|
| W A S D | Move |
| Auto | Shoots nearest enemy |
| J (hold + aim) | Charge Hyper Laser |
| J (release) | Fire Hyper Laser |
| ESC | Pause |

## Project Structure

```
src/
├── main.js
├── objects/
│   ├── Player.js            # Player sprite, stats, movement, animation
│   └── Enemy.js             # 8 enemy types with per-type personality animations
├── scenes/
│   ├── BootScene.js         # Texture generation & asset preloading
│   ├── MenuScene.js         # Main menu with image buttons
│   ├── GameScene.js         # Core game loop, UI, aura, wave system
│   ├── PauseScene.js        # Pause overlay with stats
│   ├── GuideScene.js        # Slideshow how-to-play
│   ├── SettingsScene.js     # BGM / SFX toggle & volume controls
│   └── LeaderboardScene.js  # Top scores (localStorage)
└── systems/
    ├── CombatSystem.js      # Colliders, hit detection, particles (Bullet inlined)
    ├── SpawnSystem.js       # Enemy spawning, wave scaling, heart drops
    ├── PlayerSystem.js      # LevelSystem + OrbSystem + SkillSystem (laser)
    └── MusicManager.js      # BGM (menu/game separate) + SFX pool
```

## Assets

```
public/
├── assets/
│   ├── map.png              # Tiled map background
│   ├── bg_menu.png          # Menu scene background
│   └── ui/
│       ├── btn_start.png    + btn_start_hover.png
│       ├── btn_guide.png    + btn_guide_hover.png
│       ├── btn_rank.png     + btn_rank_hover.png
│       ├── btn_settings.png + btn_settings_hover.png
│       └── guide/
│           ├── guide_1.png  # Guide slides (up to 5 by default)
│           └── guide_N.png
├── music/
│   ├── menu.mp3             # Menu BGM
│   └── dotoc2.mp3           # In-game BGM
└── sfx/
    ├── shoot.mp3
    ├── laser.mp3
    ├── levelup.mp3
    └── gameover.mp3
```

## Enemy Types

| Shape | Type | Behaviour |
|-------|------|-----------|
| Square | Slow | High HP tank, heavy hit reaction |
| Triangle | Fast | Speed rush, wind-stretch animation |
| Pentagon | Shooter | Charges & fires projectiles, rotates |
| Hexagon | Giant | Large, heavy tremor aura |
| Heptagon | Shield | Toggles damage shield, flickers on activation |
| Octagon | Healer | Regenerates HP, glows green + shows `+` on heal |
| Nonagon | Ghost | Alpha flicker stealth, purple tint |
| Decagon | Boss | Ominous red glow, heavy tremor, fires giant bullets |

All enemies have: breathing animation (randomised phase), velocity stretch/lean, and hit squash-stretch reactions.

## Upgrades

| Upgrade | Effect |
|---------|--------|
| Power Up | +15 Damage, bullets scale larger |
| Rapid Fire | Fire rate −90 ms |
| Swift Feet | +35 Move Speed |
| Fortify | +30 Max HP, heals 30 |
| Multi-Shot | +1 bullet per shot (max 8) |
| Split | +1 orbiting orb that auto-shoots |
| Death Aura | Pulsing ring damages nearby enemies |
| Hyper Laser | One-shot beam (J key), 10s cooldown |

## Audio

Settings are saved to `localStorage` and persist across sessions. BGM switches automatically between menu and game tracks. SFX uses a pooled Audio system to support concurrent playback (e.g. rapid shooting).

## Build

```bash
npm run build
```

Output goes to `dist/`.