import { MAZE_DATA } from './maze-data.js';
import { TileType, Direction, DIRECTION_DELTA } from '../core/types.js';
import { MAZE_COLS, MAZE_ROWS } from '../core/constants.js';
import type { TilePosition } from '../core/types.js';

export class Maze {
  /** Runtime tile state (dots get eaten, so we clone the original) */
  private tiles: TileType[][];
  private dotsRemaining = 0;

  constructor() {
    this.tiles = this.cloneData();
    this.dotsRemaining = this.countDots();
  }

  private cloneData(): TileType[][] {
    return MAZE_DATA.map(row => [...row]);
  }

  private countDots(): number {
    let count = 0;
    for (const row of this.tiles) {
      for (const tile of row) {
        if (tile === TileType.Dot || tile === TileType.Energizer) count++;
      }
    }
    return count;
  }

  /** Reset maze to full dots for a new level */
  reset(): void {
    this.tiles = this.cloneData();
    this.dotsRemaining = this.countDots();
  }

  /** Get tile type at a position. Out of bounds returns Wall. */
  getTile(col: number, row: number): TileType {
    if (row < 0 || row >= MAZE_ROWS || col < 0 || col >= MAZE_COLS) {
      return TileType.Wall;
    }
    return this.tiles[row][col];
  }

  /** Check if a tile is walkable by Pac-Man */
  isWalkable(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    return tile !== TileType.Wall && tile !== TileType.GhostHouse && tile !== TileType.GhostDoor;
  }

  /** Check if a tile is walkable by ghosts (includes ghost house + door) */
  isGhostWalkable(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    return tile !== TileType.Wall;
  }

  /** Check if tile is a tunnel tile */
  isTunnel(col: number, row: number): boolean {
    return this.getTile(col, row) === TileType.Tunnel;
  }

  /** Eat a dot/energizer at the given tile. Returns the tile type eaten, or null. */
  eatDot(col: number, row: number): TileType | null {
    const tile = this.getTile(col, row);
    if (tile === TileType.Dot || tile === TileType.Energizer) {
      this.tiles[row][col] = TileType.Path;
      this.dotsRemaining--;
      return tile;
    }
    return null;
  }

  /** How many dots + energizers remain */
  getDotsRemaining(): number {
    return this.dotsRemaining;
  }

  /** Check if all dots have been eaten */
  isCleared(): boolean {
    return this.dotsRemaining === 0;
  }

  /** Get the tile position after moving one step in a direction, with tunnel wrapping */
  getNextTile(pos: TilePosition, direction: Direction): TilePosition {
    const delta = DIRECTION_DELTA[direction];
    let col = pos.col + delta.x;
    let row = pos.row + delta.y;

    // Tunnel wrap
    if (col < 0) col = MAZE_COLS - 1;
    else if (col >= MAZE_COLS) col = 0;

    return { col, row };
  }

  /** Check if Pac-Man can move from a tile in a given direction */
  canMove(pos: TilePosition, direction: Direction): boolean {
    const next = this.getNextTile(pos, direction);
    return this.isWalkable(next.col, next.row);
  }

  /** Check if a ghost can move from a tile in a given direction */
  canGhostMove(pos: TilePosition, direction: Direction): boolean {
    const next = this.getNextTile(pos, direction);
    return this.isGhostWalkable(next.col, next.row);
  }

  /** Get the full tile grid (read-only access for rendering) */
  getTiles(): readonly TileType[][] {
    return this.tiles;
  }
}
