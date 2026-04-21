/**
 * ActZone — a named subzone inside an explorable act.
 *
 * Zones describe regions of an act scene (rooms, courtyards, alcoves) so
 * interactions and encounters can be authored against a place rather than
 * raw coordinates. Optional minimap data lets touch overlays render zone
 * pips without each scene reinventing its own minimap registry.
 */
export type ActZone = {
  id: string;
  label: string;
  x: number;
  y: number;
  radius?: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  /** Save flags that must all be true before the zone is enterable. */
  requiredFlags?: string[];
  /** Hint shown if the player tries to enter while gated. */
  blockedHint?: string;
  /** First-entry hint shown once on arrival. */
  entryHint?: string;
  /** Optional minimap node — consumed by touch overlays. */
  minimapNode?: {
    id: string;
    label: string;
    x: number;
    y: number;
  };
};

export function zoneUnlocked(
  flags: Record<string, boolean>,
  zone: ActZone,
): boolean {
  return !zone.requiredFlags || zone.requiredFlags.every((f) => !!flags[f]);
}

export function pointInZone(
  x: number,
  y: number,
  zone: ActZone,
): boolean {
  if (
    typeof zone.minX === "number" &&
    typeof zone.maxX === "number" &&
    typeof zone.minY === "number" &&
    typeof zone.maxY === "number"
  ) {
    return x >= zone.minX && x <= zone.maxX && y >= zone.minY && y <= zone.maxY;
  }
  const r = zone.radius ?? 24;
  const dx = x - zone.x;
  const dy = y - zone.y;
  return dx * dx + dy * dy <= r * r;
}
