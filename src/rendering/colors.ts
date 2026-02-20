import { GhostName } from '../core/types.js';
import { COLORS } from '../core/constants.js';

/** Get the body color for a ghost by name */
export function ghostColor(name: GhostName): string {
  switch (name) {
    case GhostName.Blinky: return COLORS.blinky;
    case GhostName.Pinky:  return COLORS.pinky;
    case GhostName.Inky:   return COLORS.inky;
    case GhostName.Clyde:  return COLORS.clyde;
  }
}
