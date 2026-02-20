import { Direction } from './types.js';

/**
 * Captures keyboard input and maps it to game directions.
 * Supports arrow keys and WASD.
 * Buffers the most recent direction request for pre-turning.
 */
export class InputManager {
  private currentDirection: Direction | null = null;
  private bufferedDirection: Direction | null = null;
  private keys = new Set<string>();
  private anyKeyFlag = false; // set on keydown, cleared after consumption
  private onPause: (() => void) | null = null;
  private onMute: (() => void) | null = null;

  // Touch tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    this.anyKeyFlag = true;

    const dir = this.keyToDirection(e.code);
    if (dir !== null) {
      e.preventDefault();
      this.bufferedDirection = dir;
      this.currentDirection = dir;
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      this.onPause?.();
    }
    if (e.code === 'KeyM') {
      this.onMute?.();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private keyToDirection(code: string): Direction | null {
    switch (code) {
      case 'ArrowUp':    case 'KeyW': return Direction.Up;
      case 'ArrowDown':  case 'KeyS': return Direction.Down;
      case 'ArrowLeft':  case 'KeyA': return Direction.Left;
      case 'ArrowRight': case 'KeyD': return Direction.Right;
      default: return null;
    }
  }

  /** Get the most recently buffered direction (for pre-turning) */
  getBufferedDirection(): Direction | null {
    return this.bufferedDirection;
  }

  /** Consume the buffered direction (call when the turn is executed) */
  consumeBuffer(): void {
    this.bufferedDirection = null;
  }

  /** Get the current held direction */
  getCurrentDirection(): Direction | null {
    return this.currentDirection;
  }

  /** Check if any key was pressed since last check (for "press to start") */
  isAnyKeyPressed(): boolean {
    if (this.anyKeyFlag) {
      this.anyKeyFlag = false;
      return true;
    }
    return false;
  }

  /** Check if a specific key is pressed */
  isKeyPressed(code: string): boolean {
    return this.keys.has(code);
  }

  /** Register pause callback */
  setPauseCallback(cb: () => void): void {
    this.onPause = cb;
  }

  /** Register mute callback */
  setMuteCallback(cb: () => void): void {
    this.onMute = cb;
  }

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.touchStartTime = Date.now();
    this.anyKeyFlag = true;
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    const elapsed = Date.now() - this.touchStartTime;

    const minSwipe = 20; // pixels
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < minSwipe && absDy < minSwipe && elapsed < 300) {
      // Short tap in place — toggle pause
      this.onPause?.();
      return;
    }

    let dir: Direction | null = null;
    if (absDx > absDy) {
      dir = dx > 0 ? Direction.Right : Direction.Left;
    } else {
      dir = dy > 0 ? Direction.Down : Direction.Up;
    }

    if (dir !== null) {
      this.bufferedDirection = dir;
      this.currentDirection = dir;
    }
  };

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchend', this.handleTouchEnd);
  }
}
