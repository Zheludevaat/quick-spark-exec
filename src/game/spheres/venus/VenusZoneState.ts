/**
 * Venus zone state helpers — typed SaveSlot field with legacy flag fallback
 * for older saves that stored the zone id under save.flags.venus_zone_current.
 */
import type { SaveSlot } from "../../types";
import { VENUS_FLAGS, type VenusZoneId } from "./VenusData";

const LEGACY_ZONE_FLAG_KEY = "venus_zone_current";

const VALID_ZONES = new Set<string>([
  "atrium",
  "gallery",
  "recognition_hall",
  "reconstruction",
  "ladder",
  "threshold",
]);

export function getVenusZone(save: SaveSlot): VenusZoneId {
  if (typeof save.venusZone === "string" && VALID_ZONES.has(save.venusZone)) {
    return save.venusZone as VenusZoneId;
  }

  // Legacy fallback for older saves that stored the zone in flags.
  const legacy = (save.flags as unknown as Record<string, unknown>)[LEGACY_ZONE_FLAG_KEY];
  if (typeof legacy === "string" && VALID_ZONES.has(legacy)) {
    return legacy as VenusZoneId;
  }

  return "atrium";
}

export function setVenusZone(save: SaveSlot, zone: VenusZoneId): void {
  save.venusZone = zone;
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
