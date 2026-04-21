/**
 * ActMemory — read-only helpers for computing per-act "memory state".
 *
 * Acts pass in two flag groups:
 *   - partialFlags: any one of these means the act has been touched
 *   - resolvedFlags: all of these mean the act is fully resolved
 *
 * Adopters can use the resulting `fresh | partial | resolved` state to
 * pick overlay tones, dialog variants, or whether to surface revisit
 * encounters. This keeps the world-memory rule consistent across acts
 * without bloating each scene with bespoke counting code.
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
    resolvedFlags.length > 0 &&
    resolvedFlags.every((f) => !!save.flags[f]);
  if (resolved) return "resolved";
  if (partial) return "partial";
  return "fresh";
}

export function setFlag(save: SaveSlot, flag: string) {
  save.flags[flag] = true;
}

export function hasFlags(save: SaveSlot, flags: string[]): boolean {
  return flags.every((f) => !!save.flags[f]);
}

export function anyFlag(save: SaveSlot, flags: string[]): boolean {
  return flags.some((f) => !!save.flags[f]);
}

export function countFlags(save: SaveSlot, flags: string[]): number {
  return flags.reduce((n, f) => (save.flags[f] ? n + 1 : n), 0);
}
