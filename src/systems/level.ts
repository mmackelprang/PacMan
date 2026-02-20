/** Per-level configuration: speeds (% of max), timings, thresholds */
export interface LevelConfig {
  // Pac-Man speeds (fraction of base speed, e.g. 0.80 = 80%)
  pacmanSpeed: number;
  pacmanDotsSpeed: number;     // while eating dots
  pacmanFrightSpeed: number;
  pacmanFrightDotsSpeed: number;

  // Ghost speeds
  ghostSpeed: number;
  ghostTunnelSpeed: number;
  ghostFrightSpeed: number;

  // Frightened mode
  frightTime: number;      // seconds (0 = ghosts don't turn blue)
  frightFlashes: number;   // number of blue/white flashes before revert

  // Cruise Elroy thresholds (Blinky speed-up)
  elroy1DotsLeft: number;
  elroy1Speed: number;
  elroy2DotsLeft: number;
  elroy2Speed: number;

  // Scatter/Chase phase durations (seconds). 7 entries alternate: scatter, chase, scatter, chase, scatter, chase, scatter
  // After the last scatter, chase is permanent.
  scatterChaseTimes: number[];

  // Ghost house dot release limits (personal counters)
  pinkyDotLimit: number;
  inkyDotLimit: number;
  clydeDotLimit: number;

  // Fruit
  fruitSymbol: string;
  fruitScore: number;
}

/** Build level config for a given level number (1-based) */
export function getLevelConfig(level: number): LevelConfig {
  // Scatter/chase timings
  let scatterChaseTimes: number[];
  if (level === 1) {
    scatterChaseTimes = [7, 20, 7, 20, 5, 20, 5]; // last scatter = 5s, then permanent chase
  } else if (level <= 4) {
    scatterChaseTimes = [7, 20, 7, 20, 5, 1033, 1 / 60];
  } else {
    scatterChaseTimes = [5, 20, 5, 20, 5, 1037, 1 / 60];
  }

  // Fruit
  const fruitTable: [string, number][] = [
    ['cherry', 100], ['strawberry', 300], ['orange', 500], ['orange', 500],
    ['apple', 700], ['apple', 700], ['melon', 1000], ['melon', 1000],
    ['galaxian', 2000], ['galaxian', 2000], ['bell', 3000], ['bell', 3000],
    ['key', 5000],
  ];
  const fruitIdx = Math.min(level - 1, fruitTable.length - 1);
  const [fruitSymbol, fruitScore] = fruitTable[fruitIdx];

  // Ghost house release limits
  let pinkyDotLimit = 0;
  let inkyDotLimit = 0;
  let clydeDotLimit = 0;
  if (level === 1) {
    inkyDotLimit = 30;
    clydeDotLimit = 60;
  } else if (level === 2) {
    clydeDotLimit = 50;
  }

  if (level === 1) {
    return {
      pacmanSpeed: 0.80, pacmanDotsSpeed: 0.71,
      pacmanFrightSpeed: 0.90, pacmanFrightDotsSpeed: 0.79,
      ghostSpeed: 0.75, ghostTunnelSpeed: 0.40, ghostFrightSpeed: 0.50,
      frightTime: 6, frightFlashes: 5,
      elroy1DotsLeft: 20, elroy1Speed: 0.80,
      elroy2DotsLeft: 10, elroy2Speed: 0.85,
      scatterChaseTimes,
      pinkyDotLimit, inkyDotLimit, clydeDotLimit,
      fruitSymbol, fruitScore,
    };
  } else if (level <= 4) {
    return {
      pacmanSpeed: 0.90, pacmanDotsSpeed: 0.79,
      pacmanFrightSpeed: 0.95, pacmanFrightDotsSpeed: 0.83,
      ghostSpeed: 0.85, ghostTunnelSpeed: 0.45, ghostFrightSpeed: 0.55,
      frightTime: level === 2 ? 5 : level === 3 ? 4 : 3,
      frightFlashes: 5,
      elroy1DotsLeft: level === 2 ? 30 : 40,
      elroy1Speed: 0.90,
      elroy2DotsLeft: level === 2 ? 15 : 20,
      elroy2Speed: 0.95,
      scatterChaseTimes,
      pinkyDotLimit, inkyDotLimit, clydeDotLimit,
      fruitSymbol, fruitScore,
    };
  } else if (level <= 20) {
    // Fright times for levels 5-20 (irregular pattern)
    const frightTimes: Record<number, number> = {
      5: 2, 6: 5, 7: 2, 8: 2, 9: 1, 10: 5,
      11: 2, 12: 1, 13: 1, 14: 3, 15: 1, 16: 1,
      17: 0, 18: 1, 19: 0, 20: 0,
    };
    const frightFlashMap: Record<number, number> = {
      5: 5, 6: 5, 7: 5, 8: 5, 9: 3, 10: 5,
      11: 5, 12: 3, 13: 3, 14: 5, 15: 3, 16: 3,
      17: 0, 18: 3, 19: 0, 20: 0,
    };

    // Elroy thresholds increase with level
    let e1dots = 40, e2dots = 20;
    if (level >= 9) { e1dots = 60; e2dots = 30; }
    if (level >= 12) { e1dots = 80; e2dots = 40; }
    if (level >= 15) { e1dots = 100; e2dots = 50; }
    if (level >= 19) { e1dots = 120; e2dots = 60; }

    return {
      pacmanSpeed: 1.00, pacmanDotsSpeed: 0.87,
      pacmanFrightSpeed: 1.00, pacmanFrightDotsSpeed: 0.87,
      ghostSpeed: 0.95, ghostTunnelSpeed: 0.50, ghostFrightSpeed: 0.60,
      frightTime: frightTimes[level] ?? 0,
      frightFlashes: frightFlashMap[level] ?? 0,
      elroy1DotsLeft: e1dots, elroy1Speed: 1.00,
      elroy2DotsLeft: e2dots, elroy2Speed: 1.05,
      scatterChaseTimes,
      pinkyDotLimit, inkyDotLimit, clydeDotLimit,
      fruitSymbol, fruitScore,
    };
  } else {
    // Level 21+: Pac-Man slows down, no fright
    return {
      pacmanSpeed: 0.90, pacmanDotsSpeed: 0.79,
      pacmanFrightSpeed: 0.90, pacmanFrightDotsSpeed: 0.79,
      ghostSpeed: 0.95, ghostTunnelSpeed: 0.50, ghostFrightSpeed: 0.60,
      frightTime: 0, frightFlashes: 0,
      elroy1DotsLeft: 120, elroy1Speed: 1.00,
      elroy2DotsLeft: 60, elroy2Speed: 1.05,
      scatterChaseTimes,
      pinkyDotLimit: 0, inkyDotLimit: 0, clydeDotLimit: 0,
      fruitSymbol, fruitScore,
    };
  }
}
