import {
  Direction, GhostMode, GhostName,
  DIRECTION_DELTA, DIRECTION_PRIORITY, OPPOSITE_DIRECTION,
} from '../core/types.js';
import type { TilePosition } from '../core/types.js';
import { TILE_SIZE, MAZE_OFFSET_ROW, MAZE_COLS, BASE_SPEED, RENDER_SCALE } from '../core/constants.js';
import { distanceSquared } from '../core/math.js';
import { Maze } from '../maze/maze.js';

/** Tiles where ghosts cannot turn upward (above/below ghost house) */
const NO_UP_TILES: Set<string> = new Set([
  '12,11', '15,11', '12,23', '15,23',
]);

function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

export class Ghost {
  readonly name: GhostName;

  // Position (in render-pixel coords, same coordinate space as Pac-Man)
  px: number;
  py: number;
  tileCol: number;
  tileRow: number;

  // Movement
  direction: Direction = Direction.Left;
  nextDirection: Direction = Direction.Left;

  // State
  mode: GhostMode = GhostMode.InHouse;
  previousMode: GhostMode = GhostMode.Scatter; // mode to return to after fright

  // Speed (fraction of base speed, set by game each frame)
  speed = 0.75;

  // Animation
  wobbleFrame = 0;
  private wobbleTimer = 0;

  // Scatter target (corner of the maze)
  scatterTarget: TilePosition;

  // Ghost house position (for returning when eaten)
  homeCol: number;
  homeRow: number;

  // Frightened flash state
  frightFlashing = false;

  constructor(name: GhostName, startCol: number, startRow: number, scatterTarget: TilePosition) {
    this.name = name;
    this.homeCol = startCol;
    this.homeRow = startRow;
    this.tileCol = startCol;
    this.tileRow = startRow;
    this.scatterTarget = scatterTarget;

    // Convert tile to render pixels
    this.px = startCol * TILE_SIZE + TILE_SIZE / 2;
    this.py = (startRow + MAZE_OFFSET_ROW) * TILE_SIZE + TILE_SIZE / 2;
  }

  /** Reset ghost to starting position and state */
  reset(): void {
    this.tileCol = this.homeCol;
    this.tileRow = this.homeRow;
    this.px = this.homeCol * TILE_SIZE + TILE_SIZE / 2;
    this.py = (this.homeRow + MAZE_OFFSET_ROW) * TILE_SIZE + TILE_SIZE / 2;
    this.direction = Direction.Left;
    this.nextDirection = Direction.Left;
    this.mode = this.name === GhostName.Blinky ? GhostMode.Scatter : GhostMode.InHouse;
    this.previousMode = GhostMode.Scatter;
    this.frightFlashing = false;
  }

  /** Update animation wobble */
  updateAnimation(dt: number): void {
    this.wobbleTimer += dt;
    if (this.wobbleTimer > 100) {
      this.wobbleTimer -= 100;
      this.wobbleFrame = this.wobbleFrame === 0 ? 1 : 0;
    }
  }

  /**
   * Move the ghost one frame.
   * Movement is tile-based: at each tile center, pick the direction
   * that minimizes distance to the target tile (greedy, not pathfinding).
   */
  move(dt: number, maze: Maze, targetTile: TilePosition): void {
    if (this.mode === GhostMode.InHouse) {
      this.bounceInHouse(dt);
      return;
    }

    const speed = this.speed * BASE_SPEED * RENDER_SCALE * (dt / 1000);
    const delta = DIRECTION_DELTA[this.direction];

    // Move
    let newX = this.px + delta.x * speed;
    let newY = this.py + delta.y * speed;

    // Tunnel wrapping
    const leftEdge = -TILE_SIZE;
    const rightEdge = MAZE_COLS * TILE_SIZE + TILE_SIZE;
    if (newX < leftEdge) newX = rightEdge;
    else if (newX > rightEdge) newX = leftEdge;

    // Update tile position from pixel position (always keep in sync)
    this.updateTileFromPixels(newX, newY);

    // Get the center of the tile we're currently in
    const tileCenter = this.getTileCenter();

    // Check if we crossed the center of our current tile
    const crossedCenter = this.hasCrossedCenter(this.px, this.py, newX, newY, tileCenter);

    if (crossedCenter) {
      // Snap to center, then decide next direction
      this.px = tileCenter.x;
      this.py = tileCenter.y;

      // Choose next direction at this intersection
      if (this.mode === GhostMode.Frightened) {
        this.direction = this.chooseFrightenedDirection(maze);
      } else {
        this.direction = this.chooseDirection(maze, targetTile);
      }

      // Continue moving with remaining speed
      const newDelta = DIRECTION_DELTA[this.direction];
      const nextTile = maze.getNextTile({ col: this.tileCol, row: this.tileRow }, this.direction);
      if (maze.isGhostWalkable(nextTile.col, nextTile.row)) {
        this.px += newDelta.x * speed * 0.5;
        this.py += newDelta.y * speed * 0.5;
      }
    } else {
      this.px = newX;
      this.py = newY;
    }
  }

  /** Sync tileCol/tileRow from pixel position */
  private updateTileFromPixels(px: number, py: number): void {
    let col = Math.floor(px / TILE_SIZE);
    const row = Math.floor(py / TILE_SIZE) - MAZE_OFFSET_ROW;
    // Tunnel wrap
    if (col < 0) col = MAZE_COLS - 1;
    else if (col >= MAZE_COLS) col = 0;
    this.tileCol = col;
    this.tileRow = row;
  }

  /** Get the render-pixel center of the current tile */
  private getTileCenter(): { x: number; y: number } {
    return {
      x: this.tileCol * TILE_SIZE + TILE_SIZE / 2,
      y: (this.tileRow + MAZE_OFFSET_ROW) * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  /** Check if movement from old to new position crosses the tile center */
  private hasCrossedCenter(
    oldX: number, oldY: number, newX: number, newY: number,
    center: { x: number; y: number },
  ): boolean {
    const dx = DIRECTION_DELTA[this.direction].x;
    const dy = DIRECTION_DELTA[this.direction].y;

    if (dx !== 0) {
      const crossX = (dx > 0) ? (oldX <= center.x && newX >= center.x) : (oldX >= center.x && newX <= center.x);
      return crossX || Math.abs(newX - center.x) < 1;
    }
    if (dy !== 0) {
      const crossY = (dy > 0) ? (oldY <= center.y && newY >= center.y) : (oldY >= center.y && newY <= center.y);
      return crossY || Math.abs(newY - center.y) < 1;
    }
    return false;
  }

  /**
   * Choose direction at an intersection using the standard ghost AI:
   * - Cannot reverse (except on mode change)
   * - Pick the direction whose next tile is closest to the target
   * - Tie-break: Up > Left > Down > Right
   * - Respect no-upward-turn tiles
   */
  chooseDirection(maze: Maze, target: TilePosition): Direction {
    const pos = { col: this.tileCol, row: this.tileRow };
    const reverse = OPPOSITE_DIRECTION[this.direction];
    const noUp = NO_UP_TILES.has(tileKey(pos.col, pos.row));

    let bestDir = this.direction;
    let bestDist = Infinity;

    for (const dir of DIRECTION_PRIORITY) {
      // Cannot reverse
      if (dir === reverse) continue;
      // No upward turn at restricted tiles
      if (dir === Direction.Up && noUp) continue;

      const next = maze.getNextTile(pos, dir);
      if (!maze.isGhostWalkable(next.col, next.row)) continue;

      // Euclidean distance squared to target
      const dist = distanceSquared(
        { x: next.col, y: next.row },
        { x: target.col, y: target.row },
      );

      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  /** Frightened mode: choose a random valid direction (no reverse) */
  private chooseFrightenedDirection(maze: Maze): Direction {
    const pos = { col: this.tileCol, row: this.tileRow };
    const reverse = OPPOSITE_DIRECTION[this.direction];
    const noUp = NO_UP_TILES.has(tileKey(pos.col, pos.row));
    const options: Direction[] = [];

    for (const dir of DIRECTION_PRIORITY) {
      if (dir === reverse) continue;
      if (dir === Direction.Up && noUp) continue;
      const next = maze.getNextTile(pos, dir);
      if (maze.isGhostWalkable(next.col, next.row)) {
        options.push(dir);
      }
    }

    if (options.length === 0) return this.direction;
    return options[Math.floor(Math.random() * options.length)];
  }

  /** Bob up and down inside the ghost house */
  private bounceInHouse(dt: number): void {
    this.wobbleTimer += dt;
    const center = this.getTileCenter();
    const amplitude = TILE_SIZE * 0.3;
    this.py = center.y + Math.sin(this.wobbleTimer * 0.005) * amplitude;
  }

  /** Force reverse direction (called on scatter<->chase transitions) */
  reverseDirection(): void {
    this.direction = OPPOSITE_DIRECTION[this.direction];
  }

  /** Enter frightened mode */
  enterFrightened(): void {
    if (this.mode === GhostMode.InHouse || this.mode === GhostMode.ExitingHouse) return;
    if (this.mode !== GhostMode.Eaten) {
      this.previousMode = this.mode;
      this.mode = GhostMode.Frightened;
      this.frightFlashing = false;
      this.reverseDirection();
    }
  }

  /** Exit frightened mode, return to previous mode */
  exitFrightened(): void {
    if (this.mode === GhostMode.Frightened) {
      this.mode = this.previousMode;
      this.frightFlashing = false;
    }
  }

  /** Ghost was eaten — become eyes */
  becomeEaten(): void {
    this.mode = GhostMode.Eaten;
    this.frightFlashing = false;
  }

  /** Start exiting the ghost house */
  startExiting(): void {
    this.mode = GhostMode.ExitingHouse;
    // Move to the door position
    this.tileCol = 13;
    this.tileRow = 11;
    this.px = 13 * TILE_SIZE + TILE_SIZE / 2;
    this.py = (11 + MAZE_OFFSET_ROW) * TILE_SIZE + TILE_SIZE / 2;
    this.direction = Direction.Left;
    this.mode = GhostMode.Scatter; // immediately enter scatter
  }

  /** Check if ghost has reached the ghost house entrance (for eaten state) */
  isAtHome(): boolean {
    // Ghost house entrance area: cols 11-16, rows 11-15
    return this.tileCol >= 11 && this.tileCol <= 16 &&
           this.tileRow >= 11 && this.tileRow <= 15;
  }
}

// ─── Ghost factory functions ────────────────────────

export function createBlinky(): Ghost {
  const g = new Ghost(GhostName.Blinky, 13, 11, { col: 25, row: -3 });
  g.direction = Direction.Left;
  g.mode = GhostMode.Scatter;
  return g;
}

export function createPinky(): Ghost {
  const g = new Ghost(GhostName.Pinky, 13, 14, { col: 2, row: -3 });
  g.direction = Direction.Down;
  g.mode = GhostMode.InHouse;
  return g;
}

export function createInky(): Ghost {
  const g = new Ghost(GhostName.Inky, 11, 14, { col: 27, row: 34 });
  g.direction = Direction.Up;
  g.mode = GhostMode.InHouse;
  return g;
}

export function createClyde(): Ghost {
  const g = new Ghost(GhostName.Clyde, 15, 14, { col: 0, row: 34 });
  g.direction = Direction.Up;
  g.mode = GhostMode.InHouse;
  return g;
}
