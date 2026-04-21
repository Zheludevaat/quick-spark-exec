/**
 * regionAftermath — strength of "the room remembers" per Imaginal region.
 *
 * Returns 0 (fresh), 1 (partial), or 2 (resolved). The scene's
 * `applyRegionMemory()` reads this to scale tone overlays and settled glow
 * radii, so revisits feel visibly different the more work the player has
 * done in that region.
 *
 * Counting rules per region:
 *  - Pools: knots cleared in pools + souls done in pools.
 *  - Field: seed echoes touched + souls done in field.
 *  - Corridor: total knots cleared + souls done in corridor.
 *
 * Thresholds are deliberately gentle so partial states are reachable on a
 * first pass, while resolved requires both sides of the work.
 */
import type { SaveSlot, ImaginalRegion } from "../../types";
import { SOULS } from "./souls";
import { isSoulDone } from "./soulRunner";

const KNOT_KINDS = ["reflection", "echo", "glitter", "lantern", "crown"] as const;

export function regionAftermathLevel(
  save: SaveSlot,
  region: ImaginalRegion,
): 0 | 1 | 2 {
  const soulDone = SOULS.filter(
    (s) => (s.region === region || s.region === "all") && isSoulDone(save, s.id),
  ).length;

  const knotDone = KNOT_KINDS.filter((k) => !!save.flags[`knot_${k}`]).length;

  if (region === "pools") {
    if (knotDone >= 2 && soulDone >= 3) return 2;
    if (knotDone >= 1 || soulDone >= 1) return 1;
    return 0;
  }

  if (region === "field") {
    const echoes = Object.keys(save.seedEchoes ?? {}).length;
    if (echoes >= 3 && soulDone >= 3) return 2;
    if (echoes >= 1 || soulDone >= 1) return 1;
    return 0;
  }

  // Corridor — the threshold-room. "Resolved" requires real plateau work.
  if (knotDone >= 4 && soulDone >= 3) return 2;
  if (knotDone >= 2 || soulDone >= 1) return 1;
  return 0;
}
