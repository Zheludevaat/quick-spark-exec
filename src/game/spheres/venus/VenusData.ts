/**
 * Venus chapter data — zone ids, labels, save flag keys, minimap nodes.
 *
 * The Eternal Biennale is six adjacent rooms threaded by the player's gaze:
 *  Atrium → Gallery → Recognition Hall → Reconstruction Studio
 *  Atrium → Ladder of Lovers
 *  Anywhere → Trial Threshold (gated by completion)
 */

export type VenusZoneId =
  | "atrium"
  | "gallery"
  | "recognition_hall"
  | "reconstruction"
  | "ladder"
  | "threshold";

export type VenusQuestId =
  | "curator"
  | "critic"
  | "beloved"
  | "audience_release"
  | "ladder";

export const VENUS_ZONE_LABEL: Record<VenusZoneId, string> = {
  atrium: "Atrium",
  gallery: "Curator's Gallery",
  recognition_hall: "Hall of Recognition",
  reconstruction: "Reconstruction Studio",
  ladder: "Ladder of Lovers",
  threshold: "Trial Threshold",
};

export const VENUS_FLAGS = {
  introSeen: "venus_seen_intro",
  curatorStarted: "venus_curator_started",
  curatorDone: "venus_curator_done",
  criticStarted: "venus_critic_started",
  criticDone: "venus_critic_done",
  belovedStarted: "venus_beloved_started",
  belovedDone: "venus_beloved_done",
  reconstructionSeen: "venus_reconstruction_seen",
  audienceReleased: "venus_audience_released",
  ladderStarted: "venus_ladder_started",
  ladderDone: "venus_ladder_done",
  trialThresholdSeen: "venus_trial_threshold_seen",
  etiquetteHeard: "venus_etiquette_heard",
  anniversaryHeard: "venus_anniversary_heard",
} as const;

export const VENUS_ZONE_ORDER: VenusZoneId[] = [
  "atrium",
  "gallery",
  "recognition_hall",
  "reconstruction",
  "ladder",
  "threshold",
];

export type VenusNode = {
  id: VenusZoneId;
  label: string;
  /** Normalized 0..1 minimap coordinates. */
  x: number;
  y: number;
};

export const VENUS_MINIMAP_NODES: VenusNode[] = [
  { id: "atrium", label: "Atrium", x: 0.18, y: 0.45 },
  { id: "gallery", label: "Gallery", x: 0.35, y: 0.28 },
  { id: "recognition_hall", label: "Recognition", x: 0.52, y: 0.45 },
  { id: "reconstruction", label: "Studio", x: 0.68, y: 0.28 },
  { id: "ladder", label: "Ladder", x: 0.76, y: 0.62 },
  { id: "threshold", label: "Threshold", x: 0.9, y: 0.45 },
];

/**
 * Adjacency graph — defines which zones connect to which.
 * Used by the plateau scene's transition hotspots and also by Soryn hints.
 */
export const VENUS_ZONE_LINKS: Record<VenusZoneId, VenusZoneId[]> = {
  atrium: ["gallery", "recognition_hall", "ladder", "threshold"],
  gallery: ["atrium", "recognition_hall"],
  recognition_hall: ["atrium", "gallery", "reconstruction"],
  reconstruction: ["recognition_hall", "threshold"],
  ladder: ["atrium", "threshold"],
  threshold: ["atrium", "reconstruction", "ladder"],
};
