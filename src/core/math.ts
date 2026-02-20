import { TILE_SIZE, MAZE_OFFSET_ROW } from './constants.js';
import type { TilePosition, Vector2 } from './types.js';

/** Euclidean distance squared (avoids sqrt for comparisons) */
export function distanceSquared(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Euclidean distance */
export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt(distanceSquared(a, b));
}

/** Convert tile position to pixel center (in render coordinates) */
export function tileToPixel(tile: TilePosition): Vector2 {
  return {
    x: (tile.col + 0.5) * TILE_SIZE,
    y: (tile.row + MAZE_OFFSET_ROW + 0.5) * TILE_SIZE,
  };
}

/** Convert pixel position to tile (floor to grid) */
export function pixelToTile(pixel: Vector2): TilePosition {
  return {
    col: Math.floor(pixel.x / TILE_SIZE),
    row: Math.floor(pixel.y / TILE_SIZE) - MAZE_OFFSET_ROW,
  };
}

/** Snap a pixel position to the center of the nearest tile */
export function snapToTileCenter(pixel: Vector2): Vector2 {
  const tile = pixelToTile(pixel);
  return tileToPixel(tile);
}

/** Linearly interpolate between two values */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
