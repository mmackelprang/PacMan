import { TileType } from '../core/types.js';

const W = TileType.Wall;
const P = TileType.Path;
const D = TileType.Dot;
const E = TileType.Energizer;
const H = TileType.GhostHouse;
const G = TileType.GhostDoor;
const T = TileType.Tunnel;

/**
 * The classic Pac-Man maze layout: 28 columns x 31 rows.
 * Row 0 is the top of the playable maze.
 * The full screen has 3 rows above (score) and 2 rows below (lives/fruit).
 */
export const MAZE_DATA: TileType[][] = [
  // Row 0
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1
  [W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 2
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 3
  [W,E,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,E,W],
  // Row 4
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 5
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 6
  [W,D,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,D,W],
  // Row 7
  [W,D,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,D,W],
  // Row 8
  [W,D,D,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,D,D,W],
  // Row 9
  [W,W,W,W,W,W,D,W,W,W,W,W,P,W,W,P,W,W,W,W,W,D,W,W,W,W,W,W],
  // Row 10
  [W,W,W,W,W,W,D,W,W,W,W,W,P,W,W,P,W,W,W,W,W,D,W,W,W,W,W,W],
  // Row 11
  [W,W,W,W,W,W,D,W,W,P,P,P,P,P,P,P,P,P,P,W,W,D,W,W,W,W,W,W],
  // Row 12
  [W,W,W,W,W,W,D,W,W,P,W,W,W,G,G,W,W,W,P,W,W,D,W,W,W,W,W,W],
  // Row 13
  [W,W,W,W,W,W,D,W,W,P,W,H,H,H,H,H,H,W,P,W,W,D,W,W,W,W,W,W],
  // Row 14: tunnel row
  [T,T,T,T,T,P,D,P,P,P,W,H,H,H,H,H,H,W,P,P,P,D,P,T,T,T,T,T],
  // Row 15
  [W,W,W,W,W,W,D,W,W,P,W,H,H,H,H,H,H,W,P,W,W,D,W,W,W,W,W,W],
  // Row 16
  [W,W,W,W,W,W,D,W,W,P,W,W,W,W,W,W,W,W,P,W,W,D,W,W,W,W,W,W],
  // Row 17
  [W,W,W,W,W,W,D,W,W,P,P,P,P,P,P,P,P,P,P,W,W,D,W,W,W,W,W,W],
  // Row 18
  [W,W,W,W,W,W,D,W,W,P,W,W,W,W,W,W,W,W,P,W,W,D,W,W,W,W,W,W],
  // Row 19
  [W,W,W,W,W,W,D,W,W,P,W,W,W,W,W,W,W,W,P,W,W,D,W,W,W,W,W,W],
  // Row 20
  [W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 21
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 22
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 23
  [W,E,D,D,W,W,D,D,D,D,D,D,D,P,P,D,D,D,D,D,D,D,W,W,D,D,E,W],
  // Row 24
  [W,W,W,D,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,D,W,W,W],
  // Row 25
  [W,W,W,D,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,D,W,W,W],
  // Row 26
  [W,D,D,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,D,D,W],
  // Row 27
  [W,D,W,W,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,W,W,D,W],
  // Row 28
  [W,D,W,W,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,W,W,D,W],
  // Row 29
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 30
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];
