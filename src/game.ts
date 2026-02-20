import { Renderer } from './rendering/renderer.js';
import { InputManager } from './core/input.js';
import { Maze } from './maze/maze.js';
import { StateMachine } from './states/state-machine.js';
import {
  CANVAS_WIDTH, TILE_SIZE,
  MAZE_OFFSET_ROW, MAZE_COLS, MAZE_ROWS,
  COLORS, RENDER_SCALE, FRAME_TIME,
  BASE_SPEED, SCORE_DOT, SCORE_ENERGIZER, SCORE_GHOST_BASE,
  SCORE_EXTRA_LIFE, FRUIT_DOT_THRESHOLDS, FRUIT_DISPLAY_TIME,
  FRUIT_NAMES,
} from './core/constants.js';
import {
  GameState, TileType, Direction, GhostMode, GhostName,
  DIRECTION_DELTA,
} from './core/types.js';
import { tileToPixel } from './core/math.js';
import { Ghost, createBlinky, createPinky, createInky, createClyde } from './entities/ghost.js';
import { getEffectiveTarget } from './entities/ghost-targeting.js';
import { ghostColor } from './rendering/colors.js';
import { getLevelConfig } from './systems/level.js';
import type { LevelConfig } from './systems/level.js';
import { SoundManager } from './systems/sound.js';

export class Game {
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly maze: Maze;
  readonly fsm: StateMachine<GameState, Game>;
  readonly sound: SoundManager;

  // Pac-Man state
  pacman = {
    tileCol: 14, tileRow: 23,
    px: 0, py: 0,
    direction: Direction.Left,
    nextDirection: Direction.Left,
    moving: true,
    mouthPhase: 0,
    mouthOpening: true,
    speed: 0.8,
  };

  // Ghosts
  ghosts: Ghost[] = [];
  private blinky!: Ghost;

  // Game state
  score = 0;
  highScore = parseInt(localStorage.getItem('pacman_highscore') ?? '0', 10);
  lives = 3;
  level = 1;
  dotsEaten = 0;
  private levelConfig!: LevelConfig;

  // Scatter/Chase timer
  private scatterChasePhase = 0;
  private scatterChaseTimer = 0;
  private isChaseMode = false;

  // Frightened timer
  private frightTimer = 0;
  private frightDuration = 0;
  private ghostsEatenThisFright = 0;

  // Ghost house release
  private globalDotCounter = 0;
  private useGlobalDotCounter = false;
  private personalDotCounter = 0;
  private inactivityTimer = 0;

  // Timing
  private lastTime = 0;
  private accumulator = 0;
  private animTimer = 0;
  private energizerPulse = 0;
  private readyTimer = 0;
  private deathTimer = 0;
  private levelCompleteTimer = 0;
  private extraLifeAwarded = false;

  // Score popups
  private scorePopups: { text: string; px: number; py: number; timer: number }[] = [];

  // Fruit
  private fruitActive = false;
  private fruitTimer = 0;
  private fruitSpawnIndex = 0; // tracks which threshold we're at (0 or 1)

  // Pause
  private paused = false;

  constructor() {
    this.renderer = new Renderer();
    this.input = new InputManager();
    this.maze = new Maze();
    this.fsm = new StateMachine<GameState, Game>(this);
    this.sound = new SoundManager();

    this.input.setMuteCallback(() => this.sound.toggleMute());
    this.input.setPauseCallback(() => this.togglePause());

    this.initLevel();
    this.registerStates();
    this.fsm.transition(GameState.Menu);

    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private initLevel(): void {
    this.levelConfig = getLevelConfig(this.level);
    this.dotsEaten = 0;
    this.scatterChasePhase = 0;
    this.scatterChaseTimer = 0;
    this.isChaseMode = false;
    this.frightTimer = 0;
    this.personalDotCounter = 0;
    this.inactivityTimer = 0;
    this.fruitActive = false;
    this.fruitSpawnIndex = 0;

    // Reset Pac-Man
    this.pacman.tileCol = 14;
    this.pacman.tileRow = 23;
    const startPos = tileToPixel({ col: 14, row: 23 });
    this.pacman.px = startPos.x;
    this.pacman.py = startPos.y;
    this.pacman.direction = Direction.Left;
    this.pacman.nextDirection = Direction.Left;
    this.pacman.moving = true;
    this.pacman.speed = this.levelConfig.pacmanSpeed;

    // Create ghosts
    this.blinky = createBlinky();
    const pinky = createPinky();
    const inky = createInky();
    const clyde = createClyde();
    this.ghosts = [this.blinky, pinky, inky, clyde];
  }

  private resetAfterDeath(): void {
    // Keep dots, reset positions
    this.pacman.tileCol = 14;
    this.pacman.tileRow = 23;
    const startPos = tileToPixel({ col: 14, row: 23 });
    this.pacman.px = startPos.x;
    this.pacman.py = startPos.y;
    this.pacman.direction = Direction.Left;
    this.pacman.nextDirection = Direction.Left;
    this.pacman.moving = true;

    this.scatterChasePhase = 0;
    this.scatterChaseTimer = 0;
    this.isChaseMode = false;
    this.frightTimer = 0;
    this.useGlobalDotCounter = true;
    this.globalDotCounter = 0;
    this.inactivityTimer = 0;

    this.blinky = createBlinky();
    const pinky = createPinky();
    const inky = createInky();
    const clyde = createClyde();
    this.ghosts = [this.blinky, pinky, inky, clyde];
  }

  private registerStates(): void {
    this.fsm.register(GameState.Menu, {
      render: (g) => g.renderMenu(),
      update: (g) => {
        g.animTimer += FRAME_TIME;
        g.energizerPulse += FRAME_TIME * 0.005;
        if (g.input.isAnyKeyPressed()) {
          g.maze.reset();
          g.score = 0;
          g.lives = 3;
          g.level = 1;
          g.extraLifeAwarded = false;
          g.initLevel();
          g.readyTimer = 2000;
          g.fsm.transition(GameState.Ready);
        }
      },
    });

    this.fsm.register(GameState.Ready, {
      enter: (g) => { g.sound.playIntro(); },
      render: (g) => {
        g.renderMaze();
        g.renderGhosts();
        g.renderPacMan();
        g.renderHUD();
        g.renderer.drawText('READY!', CANVAS_WIDTH / 2,
          (17.5 + MAZE_OFFSET_ROW) * TILE_SIZE, COLORS.textReady, TILE_SIZE * 1.0);
        if (g.level > 1) {
          g.renderer.drawText(`LEVEL ${g.level}`, CANVAS_WIDTH / 2,
            (15 + MAZE_OFFSET_ROW) * TILE_SIZE, COLORS.text, TILE_SIZE * 0.7);
        }
      },
      update: (g, dt) => {
        g.readyTimer -= dt;
        g.energizerPulse += dt * 0.008;
        if (g.readyTimer <= 0) g.fsm.transition(GameState.Playing);
      },
    });

    this.fsm.register(GameState.Playing, {
      enter: (g) => { g.sound.startSiren(); },
      update: (g, dt) => g.updatePlaying(dt),
      render: (g) => g.renderPlaying(),
      exit: (g) => { g.sound.stopAllLoops(); },
    });

    this.fsm.register(GameState.Death, {
      render: (g) => {
        g.renderMaze();
        g.renderHUD();
        if (g.deathTimer < 500) {
          // Brief pause: show Pac-Man and ghosts frozen
          g.renderGhosts();
          g.renderPacMan();
        } else if (g.deathTimer < 2200) {
          // Death animation: mouth opens wide, then shrinks away
          const progress = Math.min(1, (g.deathTimer - 500) / 1500);
          g.renderer.drawPacManDeath(g.pacman.px, g.pacman.py, g.pacman.direction, progress);
        }
        // After 2200ms: nothing shown (brief pause before respawn)
      },
      update: (g, dt) => {
        g.deathTimer += dt;
        if (g.deathTimer > 2500) {
          g.lives--;
          if (g.lives <= 0) {
            g.fsm.transition(GameState.GameOver);
          } else {
            g.resetAfterDeath();
            g.readyTimer = 2000;
            g.fsm.transition(GameState.Ready);
          }
        }
      },
      enter: (g) => {
        g.deathTimer = 0;
        // Play death sound after the 500ms freeze
        setTimeout(() => g.sound.playDeath(), 500);
      },
    });

    this.fsm.register(GameState.LevelComplete, {
      render: (g) => {
        g.renderHUD();
        // Flash maze
        const flashOn = Math.floor(g.levelCompleteTimer / 250) % 2 === 0;
        if (flashOn) {
          g.renderMaze();
        } else {
          // Draw maze in white
          const saved = COLORS.mazeWall;
          (COLORS as Record<string, string>).mazeWall = '#FFFFFF';
          g.renderMaze();
          (COLORS as Record<string, string>).mazeWall = saved;
        }
      },
      update: (g, dt) => {
        g.levelCompleteTimer += dt;
        if (g.levelCompleteTimer > 2000) {
          g.level++;
          g.maze.reset();
          g.initLevel();
          g.readyTimer = 2000;
          g.fsm.transition(GameState.Ready);
        }
      },
      enter: (g) => { g.levelCompleteTimer = 0; },
    });

    this.fsm.register(GameState.GameOver, {
      render: (g) => {
        g.renderMaze();
        g.renderHUD();
        g.renderer.drawText('GAME  OVER', CANVAS_WIDTH / 2,
          (17.5 + MAZE_OFFSET_ROW) * TILE_SIZE, COLORS.textGameOver, TILE_SIZE * 1.0);
      },
      update: (g, dt) => {
        g.animTimer += dt;
        if (g.animTimer > 3000 && g.input.isAnyKeyPressed()) {
          g.animTimer = 0;
          g.fsm.transition(GameState.Menu);
        }
      },
      enter: (g) => {
        g.animTimer = 0;
        if (g.score > g.highScore) {
          g.highScore = g.score;
          localStorage.setItem('pacman_highscore', g.highScore.toString());
        }
      },
    });
  }

  private togglePause(): void {
    if (this.fsm.currentKey !== GameState.Playing) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.sound.stopAllLoops();
    } else {
      if (this.frightTimer > 0) {
        this.sound.startFrightened();
      } else {
        this.sound.startSiren();
      }
    }
  }

  private loop = (now: number): void => {
    const dt = Math.min(now - this.lastTime, 100);
    this.lastTime = now;

    if (!this.paused) {
      this.accumulator += dt;
      while (this.accumulator >= FRAME_TIME) {
        this.fsm.update(FRAME_TIME);
        this.accumulator -= FRAME_TIME;
      }
    }

    this.renderer.clear();
    this.fsm.render();

    if (this.paused) {
      this.renderer.drawText('PAUSED', CANVAS_WIDTH / 2,
        (17.5 + MAZE_OFFSET_ROW) * TILE_SIZE, COLORS.textReady, TILE_SIZE * 1.2);
    }

    requestAnimationFrame(this.loop);
  };

  // ─── Playing state ───────────────────────────────────

  private updatePlaying(dt: number): void {
    this.animTimer += dt;
    this.energizerPulse += dt * 0.008;

    // Input
    const buffered = this.input.getBufferedDirection();
    if (buffered !== null) this.pacman.nextDirection = buffered;

    // Update Pac-Man speed based on mode
    const cfg = this.levelConfig;
    if (this.frightTimer > 0) {
      this.pacman.speed = cfg.pacmanFrightSpeed;
    } else {
      this.pacman.speed = cfg.pacmanSpeed;
    }

    this.movePacMan(dt);
    this.updateScatterChaseTimer(dt);
    this.updateFrightenedTimer(dt);
    this.updateGhosts(dt);
    this.updateGhostRelease(dt);
    this.checkCollisions();
    this.updateScorePopups(dt);
    this.updateFruit(dt);

    // Extra life
    if (!this.extraLifeAwarded && this.score >= SCORE_EXTRA_LIFE) {
      this.lives++;
      this.extraLifeAwarded = true;
      this.sound.playExtraLife();
    }

    // Level complete
    if (this.maze.isCleared()) {
      this.fsm.transition(GameState.LevelComplete);
    }
  }

  // ─── Scatter / Chase timer ──────────────────────────

  private updateScatterChaseTimer(dt: number): void {
    if (this.frightTimer > 0) return; // timer paused during fright

    const times = this.levelConfig.scatterChaseTimes;
    this.scatterChaseTimer += dt / 1000;

    if (this.scatterChasePhase < times.length) {
      if (this.scatterChaseTimer >= times[this.scatterChasePhase]) {
        this.scatterChaseTimer = 0;
        this.scatterChasePhase++;
        this.isChaseMode = this.scatterChasePhase % 2 === 1;

        // Force all ghosts to reverse on mode switch
        for (const ghost of this.ghosts) {
          if (ghost.mode === GhostMode.Scatter || ghost.mode === GhostMode.Chase) {
            ghost.mode = this.isChaseMode ? GhostMode.Chase : GhostMode.Scatter;
            ghost.reverseDirection();
          }
        }
      }
    } else {
      // Permanent chase
      this.isChaseMode = true;
    }
  }

  // ─── Frightened timer ───────────────────────────────

  private updateFrightenedTimer(dt: number): void {
    if (this.frightTimer <= 0) return;

    this.frightTimer -= dt / 1000;

    // Flash warning near the end
    const flashStart = this.frightDuration * 0.3;
    if (this.frightTimer < flashStart) {
      const flashRate = 150; // ms per flash toggle
      const flashing = Math.floor((this.frightTimer * 1000) / flashRate) % 2 === 0;
      for (const ghost of this.ghosts) {
        if (ghost.mode === GhostMode.Frightened) ghost.frightFlashing = flashing;
      }
    }

    if (this.frightTimer <= 0) {
      this.frightTimer = 0;
      for (const ghost of this.ghosts) {
        ghost.exitFrightened();
      }
      this.sound.stopFrightened();
      this.sound.startSiren();
    }
  }

  triggerFrightened(): void {
    const duration = this.levelConfig.frightTime;
    if (duration <= 0) {
      // No fright, but ghosts still reverse
      for (const ghost of this.ghosts) {
        if (ghost.mode === GhostMode.Scatter || ghost.mode === GhostMode.Chase) {
          ghost.reverseDirection();
        }
      }
      return;
    }

    this.frightTimer = duration;
    this.frightDuration = duration;
    this.ghostsEatenThisFright = 0;

    for (const ghost of this.ghosts) {
      ghost.enterFrightened();
    }

    this.sound.stopSiren();
    this.sound.startFrightened();
    this.sound.playPowerPellet();
  }

  // ─── Ghost movement & AI ────────────────────────────

  private updateGhosts(dt: number): void {
    const cfg = this.levelConfig;
    const pacTile = { col: this.pacman.tileCol, row: this.pacman.tileRow };
    const dotsLeft = this.maze.getDotsRemaining();

    for (const ghost of this.ghosts) {
      ghost.updateAnimation(dt);

      // Set speed based on mode and location
      if (ghost.mode === GhostMode.Eaten) {
        ghost.speed = 1.5; // fast return to house
      } else if (ghost.mode === GhostMode.Frightened) {
        ghost.speed = cfg.ghostFrightSpeed;
      } else if (this.maze.isTunnel(ghost.tileCol, ghost.tileRow)) {
        ghost.speed = cfg.ghostTunnelSpeed;
      } else if (ghost.name === GhostName.Blinky && dotsLeft <= cfg.elroy2DotsLeft) {
        ghost.speed = cfg.elroy2Speed;
      } else if (ghost.name === GhostName.Blinky && dotsLeft <= cfg.elroy1DotsLeft) {
        ghost.speed = cfg.elroy1Speed;
      } else {
        ghost.speed = cfg.ghostSpeed;
      }

      const isElroy = ghost.name === GhostName.Blinky &&
        dotsLeft <= cfg.elroy1DotsLeft;

      const target = getEffectiveTarget(
        ghost, pacTile, this.pacman.direction, this.blinky, isElroy,
      );

      ghost.move(dt, this.maze, target);

      // Eaten ghost reaching home → regenerate
      if (ghost.mode === GhostMode.Eaten && ghost.isAtHome()) {
        ghost.mode = this.isChaseMode ? GhostMode.Chase : GhostMode.Scatter;
      }
    }

    // Manage retreat sound: stop when no ghosts are eaten
    const anyEaten = this.ghosts.some(g => g.mode === GhostMode.Eaten);
    if (!anyEaten) {
      this.sound.stopRetreat();
    }
  }

  // ─── Ghost house release ────────────────────────────

  private updateGhostRelease(dt: number): void {
    this.inactivityTimer += dt / 1000;

    const cfg = this.levelConfig;
    const inactivityLimit = this.level <= 4 ? 4 : 3;

    // Force release on inactivity
    if (this.inactivityTimer >= inactivityLimit) {
      this.inactivityTimer = 0;
      this.releaseNextGhost();
      return;
    }

    if (this.useGlobalDotCounter) {
      // Global counter release (after death)
      const pinky = this.ghosts.find(g => g.name === GhostName.Pinky);
      const inky = this.ghosts.find(g => g.name === GhostName.Inky);
      const clyde = this.ghosts.find(g => g.name === GhostName.Clyde);

      if (pinky?.mode === GhostMode.InHouse && this.globalDotCounter >= 7) {
        pinky.startExiting();
      } else if (inky?.mode === GhostMode.InHouse && this.globalDotCounter >= 17) {
        inky.startExiting();
      } else if (clyde?.mode === GhostMode.InHouse && this.globalDotCounter >= 32) {
        clyde.startExiting();
        this.useGlobalDotCounter = false; // revert to personal counters
      }
    } else {
      // Personal counter release
      const pinky = this.ghosts.find(g => g.name === GhostName.Pinky);
      const inky = this.ghosts.find(g => g.name === GhostName.Inky);
      const clyde = this.ghosts.find(g => g.name === GhostName.Clyde);

      if (pinky?.mode === GhostMode.InHouse && this.personalDotCounter >= cfg.pinkyDotLimit) {
        pinky.startExiting();
      }
      if (inky?.mode === GhostMode.InHouse && this.personalDotCounter >= cfg.inkyDotLimit) {
        inky.startExiting();
      }
      if (clyde?.mode === GhostMode.InHouse && this.personalDotCounter >= cfg.clydeDotLimit) {
        clyde.startExiting();
      }
    }
  }

  private releaseNextGhost(): void {
    for (const ghost of this.ghosts) {
      if (ghost.mode === GhostMode.InHouse) {
        ghost.startExiting();
        return;
      }
    }
  }

  // ─── Collision detection ────────────────────────────

  private checkCollisions(): void {
    const pac = this.pacman;

    for (const ghost of this.ghosts) {
      if (ghost.mode === GhostMode.InHouse || ghost.mode === GhostMode.ExitingHouse) continue;

      // Same tile = collision
      if (ghost.tileCol === pac.tileCol && ghost.tileRow === pac.tileRow) {
        if (ghost.mode === GhostMode.Frightened) {
          // Eat the ghost!
          ghost.becomeEaten();
          this.ghostsEatenThisFright++;
          const points = SCORE_GHOST_BASE * Math.pow(2, this.ghostsEatenThisFright - 1);
          this.score += points;
          this.scorePopups.push({
            text: points.toString(), px: ghost.px, py: ghost.py, timer: 1000,
          });
          this.sound.playGhostEaten();
          this.sound.startRetreat();
        } else if (ghost.mode !== GhostMode.Eaten) {
          // Pac-Man dies
          this.sound.stopAllLoops();
          this.fsm.transition(GameState.Death);
          return;
        }
      }
    }
  }

  // ─── Score popups ───────────────────────────────────

  private updateScorePopups(dt: number): void {
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].timer -= dt;
      if (this.scorePopups[i].timer <= 0) this.scorePopups.splice(i, 1);
    }
  }

  // ─── Fruit ─────────────────────────────────────────

  private checkFruitSpawn(): void {
    if (this.fruitSpawnIndex < FRUIT_DOT_THRESHOLDS.length &&
        this.dotsEaten >= FRUIT_DOT_THRESHOLDS[this.fruitSpawnIndex]) {
      this.fruitActive = true;
      this.fruitTimer = FRUIT_DISPLAY_TIME;
      this.fruitSpawnIndex++;
    }
  }

  private updateFruit(dt: number): void {
    if (!this.fruitActive) return;
    this.fruitTimer -= dt / 1000;
    if (this.fruitTimer <= 0) {
      this.fruitActive = false;
    }
  }

  // ─── Pac-Man movement ───────────────────────────────

  private movePacMan(dt: number): void {
    const speed = this.pacman.speed * BASE_SPEED * RENDER_SCALE * (dt / 1000);
    const pac = this.pacman;
    const tileCenter = tileToPixel({ col: pac.tileCol, row: pac.tileRow });

    // Try turning
    if (pac.nextDirection !== pac.direction) {
      if (this.maze.canMove({ col: pac.tileCol, row: pac.tileRow }, pac.nextDirection)) {
        const distToCenter = Math.abs(pac.px - tileCenter.x) + Math.abs(pac.py - tileCenter.y);
        if (distToCenter < TILE_SIZE * 0.5) {
          pac.direction = pac.nextDirection;
          this.input.consumeBuffer();
          if (pac.direction === Direction.Up || pac.direction === Direction.Down) pac.px = tileCenter.x;
          else pac.py = tileCenter.y;
        }
      }
    }

    const delta = DIRECTION_DELTA[pac.direction];
    let newX = pac.px + delta.x * speed;
    let newY = pac.py + delta.y * speed;

    // Tunnel wrapping
    if (newX < -TILE_SIZE) newX = MAZE_COLS * TILE_SIZE + TILE_SIZE;
    else if (newX > MAZE_COLS * TILE_SIZE + TILE_SIZE) newX = -TILE_SIZE;

    const aheadCol = pac.tileCol + delta.x;
    const aheadRow = pac.tileRow + delta.y;
    let wrappedAheadCol = aheadCol;
    if (wrappedAheadCol < 0) wrappedAheadCol = MAZE_COLS - 1;
    else if (wrappedAheadCol >= MAZE_COLS) wrappedAheadCol = 0;

    const pastCenter = (
      (delta.x > 0 && newX > tileCenter.x + TILE_SIZE * 0.5) ||
      (delta.x < 0 && newX < tileCenter.x - TILE_SIZE * 0.5) ||
      (delta.y > 0 && newY > tileCenter.y + TILE_SIZE * 0.5) ||
      (delta.y < 0 && newY < tileCenter.y - TILE_SIZE * 0.5)
    );

    if (pastCenter) {
      if (this.maze.isWalkable(wrappedAheadCol, aheadRow)) {
        pac.px = newX;
        pac.py = newY;
        const tCol = Math.floor(pac.px / TILE_SIZE);
        const tRow = Math.floor(pac.py / TILE_SIZE) - MAZE_OFFSET_ROW;
        if (tCol >= 0 && tCol < MAZE_COLS && tRow >= 0 && tRow < MAZE_ROWS) {
          pac.tileCol = tCol;
          pac.tileRow = tRow;
        } else if (tCol < 0 || tCol >= MAZE_COLS) {
          pac.tileCol = ((tCol % MAZE_COLS) + MAZE_COLS) % MAZE_COLS;
          pac.tileRow = tRow;
        }
      } else {
        pac.px = tileCenter.x;
        pac.py = tileCenter.y;
        pac.moving = false;
      }
    } else {
      pac.px = newX;
      pac.py = newY;
      pac.moving = true;
    }

    // Eat dots
    const eaten = this.maze.eatDot(pac.tileCol, pac.tileRow);
    if (eaten === TileType.Dot) {
      this.score += SCORE_DOT;
      this.dotsEaten++;
      this.personalDotCounter++;
      this.globalDotCounter++;
      this.inactivityTimer = 0;
      this.sound.playWaka();
      this.checkFruitSpawn();
    } else if (eaten === TileType.Energizer) {
      this.score += SCORE_ENERGIZER;
      this.dotsEaten++;
      this.personalDotCounter++;
      this.globalDotCounter++;
      this.inactivityTimer = 0;
      this.triggerFrightened();
      this.checkFruitSpawn();
    }

    // Eat fruit (fruit position: col 14, row 17 — below ghost house)
    if (this.fruitActive && pac.tileCol === 14 && pac.tileRow === 17) {
      this.fruitActive = false;
      const points = this.levelConfig.fruitScore;
      this.score += points;
      const pos = tileToPixel({ col: 14, row: 17 });
      this.scorePopups.push({ text: points.toString(), px: pos.x, py: pos.y, timer: 2000 });
      this.sound.playFruitEaten();
    }

    // Animate mouth
    if (pac.moving) {
      const mouthSpeed = 0.12;
      if (pac.mouthOpening) {
        pac.mouthPhase += mouthSpeed;
        if (pac.mouthPhase >= 1) { pac.mouthPhase = 1; pac.mouthOpening = false; }
      } else {
        pac.mouthPhase -= mouthSpeed;
        if (pac.mouthPhase <= 0) { pac.mouthPhase = 0; pac.mouthOpening = true; }
      }
    }
  }

  // ─── Rendering ──────────────────────────────────────

  private renderMaze(): void {
    this.renderer.drawMaze(this.maze.getTiles(), this.energizerPulse);
  }

  private renderPacMan(): void {
    this.renderer.drawPacMan(
      this.pacman.px, this.pacman.py, this.pacman.direction, this.pacman.mouthPhase,
    );
  }

  private renderGhosts(): void {
    for (const ghost of this.ghosts) {
      if (ghost.mode === GhostMode.Frightened) {
        this.renderer.drawFrightenedGhost(ghost.px, ghost.py, ghost.frightFlashing, ghost.wobbleFrame);
      } else if (ghost.mode === GhostMode.Eaten) {
        this.renderer.drawEatenGhost(ghost.px, ghost.py, ghost.direction);
      } else if (ghost.mode !== GhostMode.InHouse) {
        this.renderer.drawGhost(ghost.px, ghost.py, ghostColor(ghost.name), ghost.wobbleFrame, ghost.direction);
      } else {
        // Ghost in house: still draw, just inside the pen
        this.renderer.drawGhost(ghost.px, ghost.py, ghostColor(ghost.name), ghost.wobbleFrame, ghost.direction);
      }
    }
  }

  private renderScorePopups(): void {
    for (const popup of this.scorePopups) {
      this.renderer.drawScorePopup(popup.text, popup.px, popup.py);
    }
  }

  private renderHUD(): void {
    const r = this.renderer;
    r.drawTextLeft('1UP', TILE_SIZE * 3, TILE_SIZE * 0.5, '#FFFFFF', TILE_SIZE * 0.8);
    r.drawTextLeft(this.score.toString().padStart(7, ' '), TILE_SIZE * 1, TILE_SIZE * 1.7, '#FFFFFF', TILE_SIZE * 0.9);
    r.drawText('HIGH SCORE', CANVAS_WIDTH / 2, TILE_SIZE * 0.5, '#FFFFFF', TILE_SIZE * 0.8);
    r.drawText(this.highScore.toString(), CANVAS_WIDTH / 2, TILE_SIZE * 1.7, '#FFFFFF', TILE_SIZE * 0.9);

    // Lives (bottom-left)
    for (let i = 0; i < this.lives - 1; i++) {
      const lx = (2 + i * 2) * TILE_SIZE + TILE_SIZE / 2;
      const ly = (MAZE_ROWS + MAZE_OFFSET_ROW + 0.5) * TILE_SIZE;
      r.drawPacMan(lx, ly, Direction.Left, 0.6);
    }

    // Fruit indicator (bottom-right) — show current level's fruit
    const fruitIdx = Math.min(this.level - 1, FRUIT_NAMES.length - 1);
    const fruitName = FRUIT_NAMES[fruitIdx];
    r.drawFruit(MAZE_COLS - 2, MAZE_ROWS, fruitName);

    // Mute indicator (top-right)
    if (this.sound.isMuted()) {
      r.drawTextLeft('MUTE', CANVAS_WIDTH - TILE_SIZE * 4, TILE_SIZE * 0.5, '#FF4444', TILE_SIZE * 0.6);
    }
  }

  private renderFruit(): void {
    if (this.fruitActive) {
      this.renderer.drawFruit(14, 17, this.levelConfig.fruitSymbol);
    }
  }

  private renderPlaying(): void {
    this.renderMaze();
    this.renderFruit();
    this.renderGhosts();
    this.renderPacMan();
    this.renderScorePopups();
    this.renderHUD();
  }

  private renderMenu(): void {
    const r = this.renderer;
    const cx = CANVAS_WIDTH / 2;

    r.drawText('PAC-MAN', cx, TILE_SIZE * 6, COLORS.pacman, TILE_SIZE * 2.5);

    const introGhosts = [
      { name: '-SHADOW', nick: '"BLINKY"', color: COLORS.blinky },
      { name: '-SPEEDY', nick: '"PINKY"', color: COLORS.pinky },
      { name: '-BASHFUL', nick: '"INKY"', color: COLORS.inky },
      { name: '-POKEY', nick: '"CLYDE"', color: COLORS.clyde },
    ];

    introGhosts.forEach((g, i) => {
      const y = TILE_SIZE * (11 + i * 2.5);
      r.drawGhost(TILE_SIZE * 4, y, g.color, 0, Direction.Right);
      r.drawTextLeft(g.name, TILE_SIZE * 6, y - TILE_SIZE * 0.3, g.color, TILE_SIZE * 0.75);
      r.drawTextLeft(g.nick, TILE_SIZE * 6, y + TILE_SIZE * 0.5, g.color, TILE_SIZE * 0.75);
    });

    const bottomY = TILE_SIZE * 23;
    r.drawDot(10, 20.5 - MAZE_OFFSET_ROW);
    r.drawTextLeft('10 PTS', TILE_SIZE * 12, bottomY, COLORS.text, TILE_SIZE * 0.7);
    r.drawEnergizer(10, 22 - MAZE_OFFSET_ROW, this.energizerPulse);
    r.drawTextLeft('50 PTS', TILE_SIZE * 12, bottomY + TILE_SIZE * 1.5, COLORS.text, TILE_SIZE * 0.7);

    if (Math.floor(this.animTimer / 500) % 2 === 0) {
      r.drawText('PRESS ANY KEY TO START', cx, TILE_SIZE * 30, COLORS.dot, TILE_SIZE * 0.7);
    }
  }
}
