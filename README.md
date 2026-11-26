[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Kamprett92/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Kamprett92/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Skyline Courier

Built for the [make.fun best-flight-game bounty](https://make.fun/bounty/best-flight-game-20261126-0057) ($500 in USDC).

A low-poly 3D flight game that runs entirely from static files — no build
step, no network requests. Built with Three.js (vendored under
`game/vendor/three.min.js`) and plain ES modules.

## The game

You fly a mail plane across a wild island. Three sorties, picked on the
title screen:

1. **Ring Run** — thread all six glowing sky rings in order, fast and clean.
2. **Runway Return** — take off, circle the island, and put her down gently
   on the strip.
3. **Beacon Dash** — collect eight beacons before the 150-second clock runs out.

Flying rewards throttle and turn discipline: below the stall speed the wing
gives up and the plane sinks, fuel drains with throttle (empty tanks mean a
glide), and hard hits on terrain or a ditch in the sea damage the plane.
100% damage is a write-off.

## Controls

- **↑ / W** pitch up, **↓ / S** pitch down
- **← → / A D** bank and turn
- **Shift** throttle up, **Ctrl** throttle down, **Space** air brake
- **Mouse wheel** trims the throttle in small steps (handy on final approach)
- **P** pause, **R** restart, **1 2 3** pick a mission, **M** mute

## Screenshots

The game renders a deterministic frame from the URL, so screenshots are
reproducible: `?shot=start` shows the title screen with the plane on the
runway, `?shot=play` a mid-flight chase view with a ring ahead and the HUD
lit, and `?shot=end` the mission-complete screen. Add `&seed=N` to fix the
island; the same URL always renders the same frame.

## How to play

Serve `game/` with any static server (the included `serve.ts` works:
`node serve.ts`, then open http://localhost:8080) and fly with the
keyboard. The HUD shows altitude, airspeed, heading with a compass strip,
throttle, fuel, damage, score and the mission objective.

## Layout

- `game/index.html` — the page, HUD and overlays
- `game/src/config.js` — all tuning numbers and the mission list
- `game/src/random.js` — seeded PRNG and value noise (deterministic world)
- `game/src/world.js` — island terrain, sea, sky, runway, rings, beacons
- `game/src/aircraft.js` — the low-poly plane, built from primitives
- `game/src/input.js` — keyboard and mouse state
- `game/src/physics.js` — the flight model, stall, fuel, damage, landings
- `game/src/missions.js` — the three sorties, scoring and objectives
- `game/src/hud.js` — the cockpit instruments (DOM overlay)
- `game/src/audio.js` — WebAudio engine hum, chimes and thuds (no files)
- `game/src/main.js` — renderer, chase camera, state machine, game loop
- `game/vendor/three.min.js` — Three.js r160, vendored
- `screenshots/` — renders of the game itself (first by name is the cover)

## Hand-in

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes
`/output/dossier.json` with the vendored make.fun library.
