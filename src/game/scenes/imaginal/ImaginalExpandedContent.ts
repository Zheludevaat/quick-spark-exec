/**
 * ImaginalExpandedContent — declarative manifest for the Act 2 expansion.
 *
 * The new souls themselves are registered in `souls.ts` so the existing
 * `soulsForRegion(...)` query picks them up automatically; this file lists
 * them for documentation/inspection and exposes the hidden late-knot
 * definition the scene reads when placing the corridor's "veil" knot.
 *
 * The veil knot reuses the crown mechanic (WITNESS / refuse to feed) but
 * with its own copy and a stricter unlock — it appears only after three
 * other knots have been quieted, so it reads as a late, optional rite.
 */
import type { SoulId } from "./souls";
import type { KnotKind } from "./knots";

export const EXPANSION_SOUL_IDS: SoulId[] = [
  "drifting_bride",
  "veiled_mourner",
  "hoarder_of_dawns",
  "paper_sovereign",
];

export type HiddenKnotDef = {
  /** Mechanic to dispatch into — reuses an existing knot kind. */
  kind: KnotKind;
  region: "pools" | "field" | "corridor";
  x: number;
  y: number;
  /** All flags must be set before the knot becomes visible/interactable. */
  hiddenUntilFlags: string[];
  /** Save flag set when cleared. Defaults to `knot_${kind}` if omitted. */
  clearFlag?: string;
  /** Optional override label for the hint line. */
  taglineOverride?: string;
};

/**
 * Hidden late knot — "the veil". Appears in the corridor after the player
 * has quieted any three of the five named knots. Mechanically a crown
 * encounter, philosophically the same gesture turned inward: refuse to
 * feed the *idea* of self-arrangement, not just the crown itself.
 */
export const HIDDEN_LATE_KNOTS: HiddenKnotDef[] = [
  {
    kind: "crown",
    region: "corridor",
    x: 80,
    y: 60,
    hiddenUntilFlags: [],
    clearFlag: "knot_veil",
    taglineOverride: "THE VEIL THAT FLATTERS YOU.",
  },
];

/**
 * Returns true once the hidden late knot in the corridor should appear:
 * three of the five primary knots quieted.
 */
export function veilKnotUnlocked(flags: Record<string, boolean>): boolean {
  const cleared = ["reflection", "echo", "glitter", "lantern", "crown"].filter(
    (k) => !!flags[`knot_${k}`],
  ).length;
  return cleared >= 3;
}
