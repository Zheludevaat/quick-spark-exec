/**
 * Hermetic Puzzle Framework — types.
 *
 * One unified puzzle language, themed by sphere principle:
 *   Moon = reflection, Mercury = naming, Venus = harmony,
 *   Sun = standing, Mars = disciplined force,
 *   Jupiter = measure, Saturn = release.
 *
 * Every node is a ritual object. No arbitrary switches.
 */

export type PuzzleVerb =
  | "witness"
  | "transmute"
  | "name"
  | "attune"
  | "stand"
  | "weigh"
  | "release";

export type PuzzleTheme =
  | "lunar_reflection"
  | "mercurial_naming"
  | "venusian_harmony"
  | "solar_truth"
  | "martial_trial"
  | "jovial_measure"
  | "saturnine_release";

export type PuzzleNodeKind =
  | "gate"
  | "seal"
  | "mirror"
  | "beam"
  | "stele"
  | "plate"
  | "brazier"
  | "scale"
  | "resonator"
  | "witness_circle"
  | "name_glyph"
  | "release_altar";

export type PuzzleNodeDef = {
  id: string;
  kind: PuzzleNodeKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
  state?: string | number | boolean;
  links?: string[];
  requires?: string[];
  data?: Record<string, string | number | boolean>;
};

export type PuzzleRoomDef = {
  id: string;
  theme: PuzzleTheme;
  verbs: PuzzleVerb[];
  persistent: boolean;
  nodes: PuzzleNodeDef[];
  /** Override flag set on save when the room is solved. */
  onSolveFlag?: string;
  /** Optional node-state snapshot written on solve (e.g. lock open visuals). */
  onSolveSetState?: Record<string, string | number | boolean>;
  /** Title rendered above the chamber. */
  title?: string;
  /** Short prose shown on entry, one line each. */
  intro?: string[];
  /** Short prose shown on solve. */
  solveLines?: string[];
};

export type PuzzleRuntimeState = {
  solved: boolean;
  nodeState: Record<string, string | number | boolean>;
};
