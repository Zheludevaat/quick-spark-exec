/**
 * Sun Sphere — static data: zones, minimap layout, navigation graph, flag keys.
 *
 * Kept separate from scene logic so trial/plateau/UI/art modules can share
 * the same canonical zone identifiers.
 */

export type SunZoneId =
  | "vestibule"
  | "testimony"
  | "archive"
  | "mirrors"
  | "warmth"
  | "threshold";

export const SUN_ZONE_LABEL: Record<SunZoneId, string> = {
  vestibule: "Vestibule of Praise",
  testimony: "Hall of Testimony",
  archive: "Archive of Revisions",
  mirrors: "Chamber of Mirrors",
  warmth: "Gallery of Warmth",
  threshold: "Trial Threshold",
};

/** Canonical save-flag keys for Sun progression. */
export const SUN_FLAGS = {
  introSeen: "sun_intro_seen",
  biographerDone: "sun_biographer_done",
  betrayedDone: "sun_betrayed_done",
  accompliceDone: "sun_accomplice_done",
  opLightDone: "sun_op_light_done",
  opMarginDone: "sun_op_margin_done",
  opTestimonyDone: "sun_op_testimony_done",
  opDimDone: "sun_op_dim_done",
  crackingQuestionDone: "sun_cracking_done",
  thresholdSeen: "sun_threshold_seen",
  remainChosen: "sun_remain_chosen",
} as const;

/** Normalised 0..1 minimap layout published to the React shell. */
export const SUN_MINIMAP_NODES: ReadonlyArray<{
  id: SunZoneId;
  label: string;
  x: number;
  y: number;
}> = [
  { id: "vestibule", label: "Vestibule", x: 0.15, y: 0.48 },
  { id: "testimony", label: "Testimony", x: 0.34, y: 0.30 },
  { id: "archive", label: "Archive", x: 0.50, y: 0.48 },
  { id: "mirrors", label: "Mirrors", x: 0.66, y: 0.30 },
  { id: "warmth", label: "Warmth", x: 0.78, y: 0.62 },
  { id: "threshold", label: "Threshold", x: 0.90, y: 0.48 },
] as const;

/** Adjacency graph — only zones listed here are reachable from a given zone. */
export const SUN_ZONE_LINKS: Record<SunZoneId, SunZoneId[]> = {
  vestibule: ["testimony", "archive"],
  testimony: ["vestibule", "archive", "mirrors"],
  archive: ["vestibule", "testimony", "warmth"],
  mirrors: ["testimony", "threshold"],
  warmth: ["archive", "threshold"],
  threshold: ["mirrors", "warmth"],
};
