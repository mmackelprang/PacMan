/** Original Pac-Man screen dimensions */
export const NATIVE_COLS = 28;
export const NATIVE_ROWS = 36;
export const NATIVE_TILE = 8;
export const NATIVE_WIDTH = NATIVE_COLS * NATIVE_TILE;   // 224
export const NATIVE_HEIGHT = NATIVE_ROWS * NATIVE_TILE;  // 288

/**
 * Internal render scale multiplier.
 * We render at this multiple of native resolution for smooth edges,
 * then let CSS scale to fit the viewport with anti-aliasing.
 */
export const RENDER_SCALE = 3;
export const TILE_SIZE = NATIVE_TILE * RENDER_SCALE;      // 24
export const CANVAS_WIDTH = NATIVE_WIDTH * RENDER_SCALE;   // 672
export const CANVAS_HEIGHT = NATIVE_HEIGHT * RENDER_SCALE; // 864

/** Maze playable area (rows 3-33 of the 36-row screen) */
export const MAZE_COLS = 28;
export const MAZE_ROWS = 31;
export const MAZE_OFFSET_ROW = 3; // maze starts at row 3 of the full screen

/** Sprite size in render pixels */
export const SPRITE_SIZE = 16 * RENDER_SCALE; // 48

/** Target frame rate */
export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS; // ~16.67ms

/** Scoring */
export const SCORE_DOT = 10;
export const SCORE_ENERGIZER = 50;
export const SCORE_GHOST_BASE = 200; // doubles each ghost: 200, 400, 800, 1600
export const SCORE_EXTRA_LIFE = 10_000;

/** Fruit values by level index (0-based). Level 12+ = key (5000) */
export const FRUIT_SCORES = [100, 300, 500, 500, 700, 700, 1000, 1000, 2000, 2000, 3000, 3000, 5000];

/** Fruit names matching the scores above */
export const FRUIT_NAMES = [
  'cherry', 'strawberry', 'orange', 'orange',
  'apple', 'apple', 'melon', 'melon',
  'galaxian', 'galaxian', 'bell', 'bell', 'key',
];

/** Dots eaten before fruit appears */
export const FRUIT_DOT_THRESHOLDS = [70, 170];

/** Fruit display time in seconds */
export const FRUIT_DISPLAY_TIME = 10;

/** Dots per level */
export const TOTAL_DOTS = 240;
export const TOTAL_ENERGIZERS = 4;
export const TOTAL_EDIBLES = TOTAL_DOTS + TOTAL_ENERGIZERS;

/** Movement pause frames when eating */
export const DOT_PAUSE_FRAMES = 1;
export const ENERGIZER_PAUSE_FRAMES = 3;

/** Ghost house release: dots needed per ghost after death (global counter) */
export const GLOBAL_DOT_RELEASE = { pinky: 7, inky: 17, clyde: 32 };

/** Inactivity timer to force ghost release (seconds) */
export const INACTIVITY_RELEASE_EARLY = 4; // levels 1-4
export const INACTIVITY_RELEASE_LATE = 3;  // levels 5+

/** Base max speed in pixels per second at native resolution (100% speed) */
export const BASE_SPEED = 75.76;

/** Colors — approximate original Pac-Man palette */
export const COLORS = {
  black: '#000000',
  mazeWall: '#2121DE',
  mazeWallLight: '#4242FF',
  dot: '#FFB897',
  pacman: '#FFFF00',
  blinky: '#FF0000',
  pinky: '#FFB8FF',
  inky: '#00FFFF',
  clyde: '#FFB852',
  frightened: '#2121FF',
  frightenedFlash: '#FFFFFF',
  ghostEyes: '#FFFFFF',
  ghostPupils: '#2121FF',
  ghostDoor: '#FFB897',
  text: '#FFFFFF',
  textReady: '#FFFF00',
  textGameOver: '#FF0000',
  scoreText: '#FFFFFF',
};
