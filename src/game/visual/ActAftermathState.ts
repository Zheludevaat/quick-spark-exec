/**
 * Aftermath state classifier — turns save flags into a small enum acts can
 * use to pick a tone overlay or memory ring intensity.
 *
 * Pattern: pass partialFlags (any-of) and resolvedFlags (all-of). Returns:
 *  - "fresh"     no progress
 *  - "partial"   at least one partial flag present
 *  - "resolved"  every resolved flag present (overrides partial)
 */
import type { SaveSlot } from "../types";

export type ActMemoryState = "fresh" | "partial" | "resolved";

export function actMemoryState(
  save: SaveSlot,
  partialFlags: string[],
  resolvedFlags: string[],
): ActMemoryState {
  const partial = partialFlags.some((f) => !!save.flags[f]);
  const resolved =
    resolvedFlags.length > 0 && resolvedFlags.every((f) => !!save.flags[f]);
  if (resolved) return "resolved";
  if (partial) return "partial";
  return "fresh";
}
