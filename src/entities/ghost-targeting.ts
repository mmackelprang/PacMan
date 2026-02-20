import { GhostName, GhostMode, Direction, DIRECTION_DELTA } from '../core/types.js';
import type { TilePosition } from '../core/types.js';
import { distanceSquared } from '../core/math.js';
import { Ghost } from './ghost.js';

/**
 * Compute the chase-mode target tile for a ghost.
 * Each ghost has a unique personality expressed through its targeting.
 */
export function getChaseTarget(
  ghost: Ghost,
  pacmanTile: TilePosition,
  pacmanDirection: Direction,
  blinky: Ghost,
): TilePosition {
  switch (ghost.name) {
    case GhostName.Blinky:
      return targetBlinky(pacmanTile);
    case GhostName.Pinky:
      return targetPinky(pacmanTile, pacmanDirection);
    case GhostName.Inky:
      return targetInky(pacmanTile, pacmanDirection, blinky);
    case GhostName.Clyde:
      return targetClyde(ghost, pacmanTile);
  }
}

/**
 * Get the effective target for a ghost based on its current mode.
 */
export function getEffectiveTarget(
  ghost: Ghost,
  pacmanTile: TilePosition,
  pacmanDirection: Direction,
  blinky: Ghost,
  isElroy: boolean,
): TilePosition {
  switch (ghost.mode) {
    case GhostMode.Chase:
      return getChaseTarget(ghost, pacmanTile, pacmanDirection, blinky);

    case GhostMode.Scatter:
      // Elroy Blinky ignores scatter and keeps chasing
      if (ghost.name === GhostName.Blinky && isElroy) {
        return targetBlinky(pacmanTile);
      }
      return ghost.scatterTarget;

    case GhostMode.Eaten:
      // Head back to ghost house entrance
      return { col: 13, row: 11 };

    default:
      // Frightened mode uses random movement (handled in Ghost.move)
      // InHouse/ExitingHouse don't need targeting
      return ghost.scatterTarget;
  }
}

// ─── Individual ghost targeting ───────────────────────

/**
 * BLINKY (red) — "Shadow"
 * Always targets Pac-Man's exact tile. The most direct pursuer.
 */
function targetBlinky(pacmanTile: TilePosition): TilePosition {
  return { ...pacmanTile };
}

/**
 * PINKY (pink) — "Speedy"
 * Targets 4 tiles ahead of Pac-Man's current direction.
 * NOTE: We use correct math here, NOT the original's overflow bug.
 */
function targetPinky(pacmanTile: TilePosition, pacmanDir: Direction): TilePosition {
  const delta = DIRECTION_DELTA[pacmanDir];
  return {
    col: pacmanTile.col + delta.x * 4,
    row: pacmanTile.row + delta.y * 4,
  };
}

/**
 * INKY (cyan) — "Bashful"
 * Complex targeting: draw a vector from Blinky's position to 2 tiles
 * ahead of Pac-Man, then double it. This makes Inky act as a flanker
 * that works in tandem with Blinky.
 */
function targetInky(
  pacmanTile: TilePosition,
  pacmanDir: Direction,
  blinky: Ghost,
): TilePosition {
  const delta = DIRECTION_DELTA[pacmanDir];
  // Intermediate point: 2 tiles ahead of Pac-Man
  const ahead = {
    col: pacmanTile.col + delta.x * 2,
    row: pacmanTile.row + delta.y * 2,
  };
  // Vector from Blinky to the intermediate point, doubled
  return {
    col: ahead.col + (ahead.col - blinky.tileCol),
    row: ahead.row + (ahead.row - blinky.tileRow),
  };
}

/**
 * CLYDE (orange) — "Pokey"
 * When more than 8 tiles from Pac-Man: targets Pac-Man directly (like Blinky).
 * When 8 tiles or fewer: retreats to his scatter corner.
 * This creates a "shy" approach-and-retreat behavior.
 */
function targetClyde(ghost: Ghost, pacmanTile: TilePosition): TilePosition {
  const dist = distanceSquared(
    { x: ghost.tileCol, y: ghost.tileRow },
    { x: pacmanTile.col, y: pacmanTile.row },
  );
  // 8 tiles = 64 squared
  if (dist > 64) {
    return { ...pacmanTile };
  }
  return ghost.scatterTarget;
}
