# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # TypeScript compile + Vite bundle to /dist
npm run preview      # Preview production build locally
```

There are no tests or linting configured.

## Architecture

This is a complete Pac-Man arcade clone built with **TypeScript + HTML5 Canvas 2D**. Zero external runtime dependencies — all graphics are drawn procedurally via Canvas, all sounds synthesized via Web Audio API. No sprite sheets or audio files.

### Entry Flow

`index.html` → `src/main.ts` → `Game` constructor (game.ts) → FSM starts at `Menu` state → `requestAnimationFrame` loop.

### Core Game Loop (game.ts)

The game uses a **fixed-timestep accumulator** pattern: physics update at locked 60 FPS (`FRAME_TIME = 16.67ms`) while rendering runs at display refresh rate. The `Game` class (~833 lines) is the central orchestrator — it owns Pac-Man state, ghost instances, maze state, scoring, timers, and all gameplay logic.

### State Machine (states/state-machine.ts)

Generic FSM with `enter`/`update`/`render`/`exit` callbacks. Game states: `Menu` → `Ready` → `Playing` → `Death`/`LevelComplete`/`GameOver`. All state handlers are registered inline in `game.ts`.

### Key Modules

| Directory | Purpose |
|-----------|---------|
| `src/core/` | Constants (tile sizes, speeds, colors, scoring), enums (Direction, GameState, GhostMode, GhostName), input handling (keyboard + touch swipe), math utilities |
| `src/entities/` | `Ghost` class (movement, animation, mode transitions) and `ghost-targeting.ts` (per-personality chase AI) |
| `src/maze/` | `maze-data.ts` has the 28×31 tile grid (W/P/D/E/H/G/T codes), `maze.ts` manages walkability and dot state |
| `src/rendering/` | `renderer.ts` (~641 lines) draws everything: maze walls via edge-merging, entities, HUD, text. Renders at 3× internal resolution (`RENDER_SCALE=3`, 672×864 canvas) CSS-scaled to viewport |
| `src/systems/` | `level.ts` defines per-level configs (speeds, fright duration, scatter/chase timing, fruit), `sound.ts` synthesizes all audio via Web Audio API oscillators |

### Ghost AI

Four ghosts with distinct targeting strategies (ghost-targeting.ts):
- **Blinky** — targets Pac-Man's tile directly; speeds up as Cruise Elroy when few dots remain
- **Pinky** — targets 4 tiles ahead of Pac-Man
- **Inky** — flanking vector doubled from Blinky's position to 2-ahead-of-Pac-Man
- **Clyde** — chases when >8 tiles away, retreats to corner when ≤8

Ghosts cycle through **scatter/chase phases** with level-specific timing arrays. Frightened mode triggers random movement. Ghost house release uses personal dot counters (first life) and a global dot counter (after death).

### Pac-Man State

Pac-Man is a plain object in `Game`, not a class. Movement uses **input buffering** — the next direction is queued and applied when Pac-Man reaches tile center, enabling smooth pre-turning.

## TypeScript Conventions

- **Strict mode** with `noUnusedLocals` and `noUnusedParameters` enabled
- Zero use of `any` — all types explicit
- ES2022 target with ESNext modules (bundler resolution)
- All imports use `.js` extensions for ESM compatibility
