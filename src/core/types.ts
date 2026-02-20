/** Cardinal directions for movement */
export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

/** Opposite direction lookup */
export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  [Direction.Up]: Direction.Down,
  [Direction.Down]: Direction.Up,
  [Direction.Left]: Direction.Right,
  [Direction.Right]: Direction.Left,
};

/** Direction to delta vector mapping */
export const DIRECTION_DELTA: Record<Direction, Vector2> = {
  [Direction.Up]: { x: 0, y: -1 },
  [Direction.Down]: { x: 0, y: 1 },
  [Direction.Left]: { x: -1, y: 0 },
  [Direction.Right]: { x: 1, y: 0 },
};

/** Ghost AI tie-breaking priority (highest first) */
export const DIRECTION_PRIORITY: Direction[] = [
  Direction.Up,
  Direction.Left,
  Direction.Down,
  Direction.Right,
];

/** Simple 2D vector / point */
export interface Vector2 {
  x: number;
  y: number;
}

/** Tile coordinate (integer grid position) */
export interface TilePosition {
  col: number;
  row: number;
}

/** What occupies a maze tile */
export enum TileType {
  Wall = 0,
  Path = 1,
  Dot = 2,
  Energizer = 3,
  GhostHouse = 4,
  GhostDoor = 5,
  Tunnel = 6,
}

/** Game-level states */
export enum GameState {
  Loading = 'loading',
  Menu = 'menu',
  Ready = 'ready',
  Playing = 'playing',
  Death = 'death',
  LevelComplete = 'levelComplete',
  GameOver = 'gameOver',
  Paused = 'paused',
}

/** Ghost behavior modes */
export enum GhostMode {
  InHouse = 'inHouse',
  ExitingHouse = 'exitingHouse',
  Scatter = 'scatter',
  Chase = 'chase',
  Frightened = 'frightened',
  Eaten = 'eaten',
}

/** Ghost identity */
export enum GhostName {
  Blinky = 'blinky',
  Pinky = 'pinky',
  Inky = 'inky',
  Clyde = 'clyde',
}
