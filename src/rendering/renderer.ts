import {
  CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE,
  MAZE_OFFSET_ROW, MAZE_COLS, MAZE_ROWS,
  RENDER_SCALE, COLORS,
  NATIVE_WIDTH, NATIVE_HEIGHT,
} from '../core/constants.js';
import { Direction, TileType } from '../core/types.js';
import type { Vector2 } from '../core/types.js';

/** A horizontal or vertical line segment for wall outline merging */
interface LineSeg {
  x1: number; y1: number;
  x2: number; y2: number;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.style.display = 'block';

    document.body.appendChild(this.canvas);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = (): void => {
    const aspect = NATIVE_WIDTH / NATIVE_HEIGHT;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    let w: number, h: number;
    if (winW / winH > aspect) { h = winH; w = h * aspect; }
    else { w = winW; h = w / aspect; }
    this.canvas.style.width = `${Math.floor(w)}px`;
    this.canvas.style.height = `${Math.floor(h)}px`;
  };

  clear(): void {
    this.ctx.fillStyle = COLORS.black;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  tileToRender(col: number, row: number): Vector2 {
    return { x: col * TILE_SIZE, y: (row + MAZE_OFFSET_ROW) * TILE_SIZE };
  }

  tileCenterRender(col: number, row: number): Vector2 {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: (row + MAZE_OFFSET_ROW) * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  // ─── Maze wall helpers ──────────────────────────────

  /**
   * For wall outline rendering, a tile is "wall-like" if it's a Wall
   * or GhostHouse interior. Out-of-bounds is NOT wall-like so the
   * outer maze border gets drawn.
   */
  private isWallLike(tiles: readonly TileType[][], col: number, row: number): boolean {
    if (col < 0 || col >= MAZE_COLS || row < 0 || row >= MAZE_ROWS) return false;
    const t = tiles[row][col];
    return t === TileType.Wall || t === TileType.GhostHouse || t === TileType.GhostDoor;
  }

  // ─── Maze rendering ─────────────────────────────────

  drawMaze(tiles: readonly TileType[][], energizerPulse: number): void {
    this.drawWallOutlines(tiles);
    this.drawGhostHouseOutline(tiles);
    this.drawDotsAndEnergizers(tiles, energizerPulse);
  }

  /**
   * Collect all wall-boundary edges, merge adjacent horizontal/vertical
   * segments into continuous lines, then stroke them in one pass.
   * This eliminates visible per-tile joints.
   */
  private drawWallOutlines(tiles: readonly TileType[][]): void {
    const ctx = this.ctx;
    const lineW = Math.max(2, RENDER_SCALE * 0.85);
    const inset = lineW / 2 + 0.5; // slight inset from tile edge

    // Collect raw segments
    const hSegs: LineSeg[] = []; // horizontal
    const vSegs: LineSeg[] = []; // vertical

    for (let row = 0; row < MAZE_ROWS; row++) {
      for (let col = 0; col < MAZE_COLS; col++) {
        const t = tiles[row][col];
        if (t !== TileType.Wall) continue;

        const pos = this.tileToRender(col, row);
        const x = pos.x;
        const y = pos.y;
        const s = TILE_SIZE;

        // Top edge: wall, non-wall-like above
        if (!this.isWallLike(tiles, col, row - 1)) {
          hSegs.push({ x1: x, y1: y + inset, x2: x + s, y2: y + inset });
        }
        // Bottom edge
        if (!this.isWallLike(tiles, col, row + 1)) {
          hSegs.push({ x1: x, y1: y + s - inset, x2: x + s, y2: y + s - inset });
        }
        // Left edge
        if (!this.isWallLike(tiles, col - 1, row)) {
          vSegs.push({ x1: x + inset, y1: y, x2: x + inset, y2: y + s });
        }
        // Right edge
        if (!this.isWallLike(tiles, col + 1, row)) {
          vSegs.push({ x1: x + s - inset, y1: y, x2: x + s - inset, y2: y + s });
        }
      }
    }

    // Merge adjacent horizontal segments (same y, touching x)
    const mergedH = this.mergeHorizontal(hSegs);
    // Merge adjacent vertical segments (same x, touching y)
    const mergedV = this.mergeVertical(vSegs);

    // Draw all merged segments
    ctx.strokeStyle = COLORS.mazeWall;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (const seg of mergedH) {
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
    }
    for (const seg of mergedV) {
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
    }
    ctx.stroke();

    // Draw rounded corners where a horizontal and vertical outline meet
    this.drawWallCorners(tiles, lineW, inset);
  }

  /** Merge collinear horizontal segments (same y, adjacent or overlapping x) */
  private mergeHorizontal(segs: LineSeg[]): LineSeg[] {
    if (segs.length === 0) return [];
    // Group by y
    const byY = new Map<number, LineSeg[]>();
    for (const s of segs) {
      const key = Math.round(s.y1 * 100);
      if (!byY.has(key)) byY.set(key, []);
      byY.get(key)!.push(s);
    }
    const result: LineSeg[] = [];
    for (const group of byY.values()) {
      group.sort((a, b) => a.x1 - b.x1);
      let cur = { ...group[0] };
      for (let i = 1; i < group.length; i++) {
        const next = group[i];
        if (Math.abs(next.x1 - cur.x2) < 1) {
          cur.x2 = next.x2; // extend
        } else {
          result.push(cur);
          cur = { ...next };
        }
      }
      result.push(cur);
    }
    return result;
  }

  /** Merge collinear vertical segments (same x, adjacent or overlapping y) */
  private mergeVertical(segs: LineSeg[]): LineSeg[] {
    if (segs.length === 0) return [];
    const byX = new Map<number, LineSeg[]>();
    for (const s of segs) {
      const key = Math.round(s.x1 * 100);
      if (!byX.has(key)) byX.set(key, []);
      byX.get(key)!.push(s);
    }
    const result: LineSeg[] = [];
    for (const group of byX.values()) {
      group.sort((a, b) => a.y1 - b.y1);
      let cur = { ...group[0] };
      for (let i = 1; i < group.length; i++) {
        const next = group[i];
        if (Math.abs(next.y1 - cur.y2) < 1) {
          cur.y2 = next.y2;
        } else {
          result.push(cur);
          cur = { ...next };
        }
      }
      result.push(cur);
    }
    return result;
  }

  /**
   * Draw rounded corners at concave wall bends.
   * A concave corner exists where a wall tile has non-wall-like tiles
   * on two perpendicular sides AND the diagonal between them is also non-wall-like.
   */
  private drawWallCorners(tiles: readonly TileType[][], lineW: number, inset: number): void {
    const ctx = this.ctx;
    const r = inset;

    ctx.strokeStyle = COLORS.mazeWall;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';

    for (let row = 0; row < MAZE_ROWS; row++) {
      for (let col = 0; col < MAZE_COLS; col++) {
        if (tiles[row][col] !== TileType.Wall) continue;

        const pos = this.tileToRender(col, row);
        const x = pos.x;
        const y = pos.y;
        const s = TILE_SIZE;

        const wallUp = this.isWallLike(tiles, col, row - 1);
        const wallDown = this.isWallLike(tiles, col, row + 1);
        const wallLeft = this.isWallLike(tiles, col - 1, row);
        const wallRight = this.isWallLike(tiles, col + 1, row);

        // Concave top-left: open above AND open left
        if (!wallUp && !wallLeft) {
          ctx.beginPath();
          ctx.arc(x + inset, y + inset, r, Math.PI, Math.PI * 1.5);
          ctx.stroke();
        }
        // Concave top-right
        if (!wallUp && !wallRight) {
          ctx.beginPath();
          ctx.arc(x + s - inset, y + inset, r, -Math.PI / 2, 0);
          ctx.stroke();
        }
        // Concave bottom-left
        if (!wallDown && !wallLeft) {
          ctx.beginPath();
          ctx.arc(x + inset, y + s - inset, r, Math.PI / 2, Math.PI);
          ctx.stroke();
        }
        // Concave bottom-right
        if (!wallDown && !wallRight) {
          ctx.beginPath();
          ctx.arc(x + s - inset, y + s - inset, r, 0, Math.PI / 2);
          ctx.stroke();
        }

        // Convex corners: wall on two perpendicular sides + open diagonal.
        // Connect the two line endpoints with a small arc.
        if (wallUp && wallLeft && !this.isWallLike(tiles, col - 1, row - 1)) {
          ctx.beginPath();
          ctx.arc(x + inset, y + inset, inset * 2, Math.PI, Math.PI * 1.5);
          ctx.stroke();
        }
        if (wallUp && wallRight && !this.isWallLike(tiles, col + 1, row - 1)) {
          ctx.beginPath();
          ctx.arc(x + s - inset, y + inset, inset * 2, -Math.PI / 2, 0);
          ctx.stroke();
        }
        if (wallDown && wallLeft && !this.isWallLike(tiles, col - 1, row + 1)) {
          ctx.beginPath();
          ctx.arc(x + inset, y + s - inset, inset * 2, Math.PI / 2, Math.PI);
          ctx.stroke();
        }
        if (wallDown && wallRight && !this.isWallLike(tiles, col + 1, row + 1)) {
          ctx.beginPath();
          ctx.arc(x + s - inset, y + s - inset, inset * 2, 0, Math.PI / 2);
          ctx.stroke();
        }
      }
    }
  }

  /** Draw the ghost house as a clean rectangle with a door gap */
  private drawGhostHouseOutline(tiles: readonly TileType[][]): void {
    const ctx = this.ctx;
    const lineW = Math.max(2, RENDER_SCALE * 0.85);

    // Find ghost house bounds
    let minCol = MAZE_COLS, maxCol = 0, minRow = MAZE_ROWS, maxRow = 0;
    for (let row = 0; row < MAZE_ROWS; row++) {
      for (let col = 0; col < MAZE_COLS; col++) {
        if (tiles[row][col] === TileType.GhostHouse) {
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
        }
      }
    }
    if (minCol > maxCol) return;

    const tl = this.tileToRender(minCol, minRow);
    const w = (maxCol - minCol + 1) * TILE_SIZE;
    const h = (maxRow - minRow + 1) * TILE_SIZE;
    const pad = lineW; // small padding outside the tiles
    const r = TILE_SIZE * 0.25;

    const bx = tl.x - pad;
    const by = tl.y - pad;
    const bw = w + pad * 2;
    const bh = h + pad * 2;

    // Door gap: center ~2 tiles wide
    const doorW = TILE_SIZE * 2;
    const doorLeft = bx + (bw - doorW) / 2;
    const doorRight = doorLeft + doorW;

    ctx.strokeStyle = COLORS.mazeWall;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw box with door gap on top
    ctx.beginPath();
    // Start just right of door, go clockwise
    ctx.moveTo(doorRight, by);
    // Top-right corner
    ctx.lineTo(bx + bw - r, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
    // Right side
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
    // Bottom
    ctx.lineTo(bx + r, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
    // Left side
    ctx.lineTo(bx, by + r);
    ctx.arcTo(bx, by, bx + r, by, r);
    // Top-left up to door
    ctx.lineTo(doorLeft, by);
    ctx.stroke();

    // Draw the door
    ctx.strokeStyle = COLORS.ghostDoor;
    ctx.lineWidth = lineW * 2;
    ctx.beginPath();
    ctx.moveTo(doorLeft + 1, by);
    ctx.lineTo(doorRight - 1, by);
    ctx.stroke();
  }

  /** Draw dots and energizers */
  private drawDotsAndEnergizers(tiles: readonly TileType[][], energizerPulse: number): void {
    for (let row = 0; row < MAZE_ROWS; row++) {
      for (let col = 0; col < MAZE_COLS; col++) {
        const tile = tiles[row][col];
        if (tile === TileType.Dot) {
          this.drawDot(col, row);
        } else if (tile === TileType.Energizer) {
          this.drawEnergizer(col, row, energizerPulse);
        }
      }
    }
  }

  drawDot(col: number, row: number): void {
    const c = this.tileCenterRender(col, row);
    const radius = Math.max(1.5, RENDER_SCALE * 0.7);
    this.ctx.fillStyle = COLORS.dot;
    this.ctx.beginPath();
    this.ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawEnergizer(col: number, row: number, pulse: number): void {
    const c = this.tileCenterRender(col, row);
    const baseRadius = TILE_SIZE * 0.3;
    const radius = baseRadius * (0.8 + 0.2 * Math.sin(pulse));
    this.ctx.fillStyle = COLORS.dot;
    this.ctx.beginPath();
    this.ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // ─── Entity rendering ───────────────────────────────

  drawPacMan(px: number, py: number, direction: Direction, mouthAngle: number): void {
    const radius = TILE_SIZE * 0.45;
    const mouth = mouthAngle * Math.PI / 4;

    let baseAngle: number;
    switch (direction) {
      case Direction.Right: baseAngle = 0; break;
      case Direction.Down:  baseAngle = Math.PI / 2; break;
      case Direction.Left:  baseAngle = Math.PI; break;
      case Direction.Up:    baseAngle = -Math.PI / 2; break;
    }

    this.ctx.fillStyle = COLORS.pacman;
    this.ctx.beginPath();
    if (mouth > 0.01) {
      this.ctx.moveTo(px, py);
      this.ctx.arc(px, py, radius, baseAngle + mouth, baseAngle + Math.PI * 2 - mouth);
      this.ctx.closePath();
    } else {
      this.ctx.arc(px, py, radius, 0, Math.PI * 2);
    }
    this.ctx.fill();
  }

  /**
   * Death animation: Pac-Man mouth opens to full circle, then body shrinks upward.
   * progress: 0 = alive, 0→0.5 = mouth opens to full, 0.5→1.0 = body shrinks away
   */
  drawPacManDeath(px: number, py: number, direction: Direction, progress: number): void {
    const radius = TILE_SIZE * 0.45;

    if (progress <= 0.5) {
      // Phase 1: mouth opens wide (from current mouth to full 360)
      const t = progress / 0.5; // 0→1
      const mouth = t * Math.PI; // from 0 to π (full open)

      let baseAngle: number;
      switch (direction) {
        case Direction.Right: baseAngle = 0; break;
        case Direction.Down:  baseAngle = Math.PI / 2; break;
        case Direction.Left:  baseAngle = Math.PI; break;
        case Direction.Up:    baseAngle = -Math.PI / 2; break;
      }

      this.ctx.fillStyle = COLORS.pacman;
      this.ctx.beginPath();
      if (mouth < Math.PI - 0.01) {
        this.ctx.moveTo(px, py);
        this.ctx.arc(px, py, radius, baseAngle + mouth, baseAngle + Math.PI * 2 - mouth);
        this.ctx.closePath();
      }
      // When mouth ≈ π, nothing visible
      this.ctx.fill();
    } else {
      // Phase 2: shrink upward as a thin sliver
      const t = (progress - 0.5) / 0.5; // 0→1
      const sliceAngle = (1 - t) * Math.PI * 2;
      if (sliceAngle > 0.02) {
        const startAngle = -Math.PI / 2 - sliceAngle / 2;
        this.ctx.fillStyle = COLORS.pacman;
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.arc(px, py, radius * (1 - t * 0.3), startAngle, startAngle + sliceAngle);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
  }

  drawGhost(px: number, py: number, bodyColor: string, wobbleFrame: number, eyeDirection: Direction): void {
    this.drawGhostBody(px, py, bodyColor, wobbleFrame);
    const h = TILE_SIZE * 0.95;
    const top = py - h / 2;
    this.drawGhostEyes(px, top + h * 0.4, eyeDirection);
  }

  /** Draw just the ghost body (dome + wavy skirt) without eyes */
  private drawGhostBody(px: number, py: number, bodyColor: string, wobbleFrame: number): void {
    const w = TILE_SIZE * 0.9;
    const h = TILE_SIZE * 0.95;
    const left = px - w / 2;
    const top = py - h / 2;
    const bottom = top + h;

    this.ctx.fillStyle = bodyColor;
    this.ctx.beginPath();
    this.ctx.moveTo(left, bottom);
    this.ctx.lineTo(left, top + h * 0.4);
    this.ctx.arc(px, top + h * 0.4, w / 2, Math.PI, 0, false);
    this.ctx.lineTo(left + w, bottom);

    const bumps = 3;
    const bumpW = w / bumps;
    const bumpH = h * 0.12 * (wobbleFrame === 0 ? 1 : -0.6);
    for (let i = 0; i < bumps; i++) {
      const bx = left + w - i * bumpW;
      this.ctx.quadraticCurveTo(bx - bumpW * 0.5, bottom + bumpH, bx - bumpW, bottom);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawGhostEyes(px: number, py: number, direction: Direction): void {
    const eyeSpacing = TILE_SIZE * 0.18;
    const eyeRadius = TILE_SIZE * 0.13;
    const pupilRadius = TILE_SIZE * 0.07;
    let dx = 0, dy = 0;
    const offset = TILE_SIZE * 0.05;
    switch (direction) {
      case Direction.Up:    dy = -offset; break;
      case Direction.Down:  dy = offset; break;
      case Direction.Left:  dx = -offset; break;
      case Direction.Right: dx = offset; break;
    }
    for (const side of [-1, 1]) {
      const ex = px + side * eyeSpacing;
      this.ctx.fillStyle = COLORS.ghostEyes;
      this.ctx.beginPath();
      this.ctx.arc(ex, py, eyeRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = COLORS.ghostPupils;
      this.ctx.beginPath();
      this.ctx.arc(ex + dx, py + dy, pupilRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawFrightenedGhost(px: number, py: number, flash: boolean, wobbleFrame: number): void {
    const color = flash ? COLORS.frightenedFlash : COLORS.frightened;
    this.drawGhostBody(px, py, color, wobbleFrame);

    // Frightened eyes: small dots (not normal eyes)
    const h = TILE_SIZE * 0.95;
    const eyeY = py - h * 0.1;
    const eyeSpacing = TILE_SIZE * 0.15;
    const eyeR = TILE_SIZE * 0.06;
    const eyeColor = flash ? '#FF0000' : COLORS.dot;
    this.ctx.fillStyle = eyeColor;
    for (const side of [-1, 1]) {
      this.ctx.beginPath();
      this.ctx.arc(px + side * eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Wavy mouth
    const mouthY = py + TILE_SIZE * 0.1;
    const mouthW = TILE_SIZE * 0.4;
    this.ctx.strokeStyle = eyeColor;
    this.ctx.lineWidth = RENDER_SCALE * 0.7;
    this.ctx.beginPath();
    const segments = 4;
    const segW = mouthW / segments;
    const startX = px - mouthW / 2;
    this.ctx.moveTo(startX, mouthY);
    for (let i = 0; i < segments; i++) {
      const midY = mouthY + (i % 2 === 0 ? -RENDER_SCALE : RENDER_SCALE);
      this.ctx.lineTo(startX + (i + 0.5) * segW, midY);
      this.ctx.lineTo(startX + (i + 1) * segW, mouthY);
    }
    this.ctx.stroke();
  }

  drawEatenGhost(px: number, py: number, direction: Direction): void {
    this.drawGhostEyes(px, py, direction);
  }

  // ─── Fruit ─────────────────────────────────────────

  drawFruit(col: number, row: number, symbol: string): void {
    const c = this.tileCenterRender(col, row);
    const r = TILE_SIZE * 0.4;
    const ctx = this.ctx;

    switch (symbol) {
      case 'cherry':
        // Two red circles with green stems
        ctx.fillStyle = '#FF0000';
        ctx.beginPath(); ctx.arc(c.x - r * 0.3, c.y + r * 0.2, r * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(c.x + r * 0.3, c.y + r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#00FF00'; ctx.lineWidth = RENDER_SCALE * 0.5;
        ctx.beginPath(); ctx.moveTo(c.x - r * 0.3, c.y - r * 0.1); ctx.quadraticCurveTo(c.x, c.y - r, c.x + r * 0.3, c.y); ctx.stroke();
        break;
      case 'strawberry':
        ctx.fillStyle = '#FF0000';
        ctx.beginPath(); ctx.moveTo(c.x, c.y - r * 0.5); ctx.lineTo(c.x + r * 0.5, c.y + r * 0.1); ctx.lineTo(c.x, c.y + r * 0.7); ctx.lineTo(c.x - r * 0.5, c.y + r * 0.1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#00FF00';
        ctx.beginPath(); ctx.arc(c.x, c.y - r * 0.5, r * 0.25, 0, Math.PI * 2); ctx.fill();
        break;
      case 'orange':
        ctx.fillStyle = '#FFA500';
        ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(c.x - RENDER_SCALE * 0.5, c.y - r * 0.7, RENDER_SCALE, r * 0.3);
        break;
      case 'apple':
        ctx.fillStyle = '#FF0000';
        ctx.beginPath(); ctx.arc(c.x, c.y + r * 0.1, r * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(c.x - RENDER_SCALE * 0.5, c.y - r * 0.6, RENDER_SCALE, r * 0.3);
        break;
      case 'melon':
        ctx.fillStyle = '#00FF00';
        ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#006600';
        ctx.lineWidth = RENDER_SCALE * 0.4; ctx.strokeStyle = '#006600';
        ctx.beginPath(); ctx.moveTo(c.x - r * 0.4, c.y); ctx.lineTo(c.x + r * 0.4, c.y); ctx.stroke();
        break;
      case 'galaxian':
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath(); ctx.moveTo(c.x, c.y - r * 0.6); ctx.lineTo(c.x + r * 0.5, c.y + r * 0.4); ctx.lineTo(c.x, c.y + r * 0.1); ctx.lineTo(c.x - r * 0.5, c.y + r * 0.4); ctx.closePath(); ctx.fill();
        break;
      case 'bell':
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath(); ctx.arc(c.x, c.y - r * 0.1, r * 0.45, Math.PI, 0); ctx.lineTo(c.x + r * 0.55, c.y + r * 0.4); ctx.lineTo(c.x - r * 0.55, c.y + r * 0.4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(c.x, c.y + r * 0.5, r * 0.15, 0, Math.PI * 2); ctx.fill();
        break;
      case 'key':
        ctx.fillStyle = '#00FFFF';
        ctx.beginPath(); ctx.arc(c.x, c.y - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(c.x - RENDER_SCALE * 0.5, c.y - r * 0.1, RENDER_SCALE, r * 0.8);
        ctx.fillRect(c.x, c.y + r * 0.2, r * 0.3, RENDER_SCALE);
        ctx.fillRect(c.x, c.y + r * 0.4, r * 0.2, RENDER_SCALE);
        break;
      default:
        // Fallback: simple colored circle
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ─── Text / HUD ─────────────────────────────────────

  drawText(text: string, x: number, y: number, color: string, size: number = TILE_SIZE): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${size}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  drawTextLeft(text: string, x: number, y: number, color: string, size: number = TILE_SIZE): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${size}px monospace`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  drawScorePopup(text: string, px: number, py: number): void {
    this.drawText(text, px, py, '#00FFFF', TILE_SIZE * 0.7);
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize);
  }
}
