# Tech Fighter: Battle of the Bots

An offline 2D fighting game in the spirit of classic arcade fighters, starring chatbot mascots. The fighters are drawn in a smooth anime cel-shaded style: a code-drawn skeletal rig is rendered as clean vector art with ink outlines, hard hue-shifted shadows and rim light, then cached as screen-resolution bitmaps during a fight. All audio is synthesized at runtime, so there are no asset files and it needs no internet connection.

## Play

- **Easiest:** open `dist/TechFighter.html` (one self-contained file). Double-click it, play offline. Share it by sending that one file.
- **From source:** open `index.html` directly, or serve the folder (`npm run serve`, then visit http://127.0.0.1:8765).

Works in current Chrome, Edge, Firefox and Safari on desktop. Needs a keyboard or a gamepad.

Graphics default to Smooth Vector (HD). The older Pixel Art mode is still under Options → Graphics.

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move / jump / crouch | WASD or arrow keys | D-pad / left stick |
| Light Punch | U or Z | X / □ |
| Heavy Punch | I or X | Y / △ |
| Light Kick | J or C | A / ✕ |
| Heavy Kick | K or V | B / ○ |
| Easy Special | L, B, O or Shift | bumpers / triggers |
| Pause | Esc (or Enter) | Start |
| Fullscreen | F | |

**Special moves** (same inputs for every fighter; P = punch, K = kick):

- `↓ ↘ → + P`: projectile
- `→ ↓ ↘ + P`: invincible anti-air
- `↓ ↙ ← + K`: character-specific rush, teleport or command grab
- `↓↘→ ↓↘→ + P` with a full meter: **Super Art**

**Easy specials:** SP on its own = projectile. Forward + SP = anti-air. Back + SP = rush. Down + SP = Super. These do 85% damage.

**System:** hold away to block, and hold down-away to block lows. Forward/back + HP up close throws. Double-tap to dash. Light attacks chain into one another, normals cancel into specials, and specials cancel into Supers. The full move list is in the in-game **How to Play** screen and in the pause menu.

## Roster

Six fighters, one fighting-game archetype each, with their own body, stance, personality, frame data and CPU behaviour.

| Fighter | Archetype | Body & style |
|---|---|---|
| **Clawdius**: The Thoughtful Spark | Shoto / all-rounder | hooded mystic with an orange asterisk halo, glowing eyes in a dark hood, orange scarf, cream cloak, gold bead belt; open-palm karate, glowing document blasts |
| **Jipity**: The Know-It-All | Zoner / keep-away | fuzzy yellow plush triangle in round glasses and a bow tie, black limbs, white fists, yellow sneakers; long pokes, token streams, teleport |
| **Gemi**: The Twin Star | Rushdown / speedster | rainbow four-point star head with glowing eyes, white and gold gi, scarf and tabards; fast taekwondo kicks |
| **Grokium**: The Unfiltered | Brawler / mixups | street ninja with a glossy black ball head and orbit ring, white scarf, striped pants, high-tops; haymakers, big boot, overhead knee |
| **SeekDeep**: The Leviathan | Grappler / big body | blue whale karateka in a torn gi, purple belt and red gloves; heavy karate, whale spirit blast, Deep Dive Slam |
| **Musie**: The Cuddly Colossus | Unorthodox / big body | giant fluffy plush; paw bops and bum attacks |

## Modes

Arcade (a five-fight ladder, continues, endings), Versus CPU, and Training (dummy settings, hitbox view, combo damage readout). There are 4 CPU difficulty levels. The rounds, timer, volume, announcer voice, screen shake and input display are all adjustable. Settings and progress are saved in the browser.

## Development

```
npm test               # headless CPU-vs-CPU matches for every matchup + end-to-end menu/arcade flow
npm run test:balance   # larger balance sample (win rate per character)
npm run test:difficulty# novice-bot win rate against each CPU level
npm run build          # writes dist/TechFighter.html with every sprite frame pre-rendered
npm run test:realtime  # real-time playtest in real Chrome: real key events + frame timing (set TF_GPU=1)
npm run test:hardware  # frame pacing on emulated hardware tiers (TF_THROTTLE=4|6, TF_NOGPU=1, TF_VS=1)
```

Code layout (`js/`): `util` (constants, storage), `audio` (synth SFX, music, announcer), `input`, `rig` (skeletal poses and renderer), `characters` (roster art and data), `effects` (projectiles, particles), `fighter` (state machine, frame data, hit resolution), `ai` (CPU), `stages`, `ui` (HUD), `scenes` (menus, fight, arcade), and `main` (loop, adaptive resolution).

## Performance

**HD (default):** each distinct fighter frame is drawn once at screen resolution, tightly cropped and reused from an LRU bitmap cache (about 100 MB per fighter). The idle, walk, guard and hit loops bake in the background on the VS screen. Measured in Chrome with the GPU on, full 1080p, hard CPU-vs-CPU fight: 60 fps steady state (p95 frame 17 ms). The slower hardware tiers below have not been re-measured for HD yet.

**Pixel Art:** all sprite frames are pre-rendered at build time (`tools/bake.js`, Skia) and shipped inside the file as lossless WebP sheets, so the player's machine never rasterizes sprites. Measured in real Chrome, full 1080p, hard CPU-vs-CPU fight:

| Machine (emulated) | Steady state |
|---|---|
| Intel Iris Xe laptop (GPU) | 60 fps |
| 4x slower CPU | 54 fps |
| 6x slower CPU | 50 fps (game speed 100%) |

If a machine still can't keep up, the game lowers its display resolution automatically.

## Disclaimer

A non-commercial fan parody. The fighters are original caricatures inspired by popular AI assistants. Those names and brands belong to their owners. This project is not affiliated with or endorsed by any of them.

## License

Copyright (C) 2026 kun101

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License, version 3, as published by the Free Software Foundation. It is distributed WITHOUT ANY WARRANTY. See [LICENSE](LICENSE) for the full text.

The license covers this project's code and original artwork. It grants no rights to the third-party names and brands mentioned in the Disclaimer.
