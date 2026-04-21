/**
 * Venus zone state helpers — wraps save.flags as the persistent store for
 * the Eternal Biennale's local progress (current zone, quest gates).
 */
import type { SaveSlot } from "../../types";
import { VENUS_FLAGS, type VenusZoneId } from "./VenusData";

const ZONE_FLAG_KEY = "venus_zone_current";

/** A small set of valid zone ids (string-typed for storage). */
const VALID_ZONES = new Set<string>([
  "atrium",
  "gallery",
  "recognition_hall",
  "reconstruction",
  "ladder",
  "threshold",
]);

/**
 * Read the player's current Venus zone. We piggy-back on save.flags using
 * a string-coerced field (avoids breaking SaveSlot schema).
 */
export function getVenusZone(save: SaveSlot): VenusZoneId {
  const raw = (save.flags as unknown as Record<string, unknown>)[ZONE_FLAG_KEY];
  if (typeof raw === "string" && VALID_ZONES.has(raw)) {
    return raw as VenusZoneId;
  }
  return "atrium";
}

export function setVenusZone(save: SaveSlot, zone: VenusZoneId): void {
  // Cast: we deliberately store a string under a "boolean-typed" map key.
  (save.flags as unknown as Record<string, unknown>)[ZONE_FLAG_KEY] = zone;
}

export function isVenusFlag(save: SaveSlot, key: keyof typeof VENUS_FLAGS): boolean {
  return !!save.flags[VENUS_FLAGS[key]];
}

export function markVenusFlag(save: SaveSlot, key: keyof typeof VENUS_FLAGS): void {
  save.flags[VENUS_FLAGS[key]] = true;
}

/** All five core questlines/puzzles complete → Kypria can be faced. */
export function venusCrackingReady(save: SaveSlot): boolean {
  return (
    !!save.flags[VENUS_FLAGS.curatorDone] &&
    !!save.flags[VENUS_FLAGS.criticDone] &&
    !!save.flags[VENUS_FLAGS.belovedDone] &&
    !!save.flags[VENUS_FLAGS.audienceReleased] &&
    !!save.flags[VENUS_FLAGS.ladderDone]
  );
}

export function venusProgressCount(save: SaveSlot): { done: number; total: number } {
  const keys: (keyof typeof VENUS_FLAGS)[] = [
    "curatorDone",
    "criticDone",
    "belovedDone",
    "audienceReleased",
    "ladderDone",
  ];
  const done = keys.filter((k) => isVenusFlag(save, k)).length;
  return { done, total: keys.length };
}
