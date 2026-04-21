/**
 * Declarative description of a major figure or encounter-object's
 * presentation language. Visuals only — never holds progression logic.
 *
 * Scenes consume profiles via `createEncounterPresentation`, which spins up
 * a matching aura + nameplate + first-time intro card. The point is that
 * Soryn, the four Guardians, every Knot, every Soul, every Athanor door,
 * and every governor share one tiny vocabulary of arrival, identity, and
 * post-encounter memory — instead of each scene inventing its own.
 */

export type EncounterCategory =
  | "companion"
  | "guardian"
  | "knot"
  | "soul"
  | "threshold"
  | "governor";

/** Aura behaviour during the figure's resting / present state. */
export type EncounterIntroStyle =
  | "shimmer"
  | "pulse"
  | "orbit"
  | "seal"
  | "hush"
  | "furnace";

/** Sigil hint — currently advisory; reserved for future per-figure sigils. */
export type EncounterSigilStyle =
  | "ring"
  | "lattice"
  | "tri_orbit"
  | "crown"
  | "mirror"
  | "ember";

export type EncounterPalette = {
  /** Main figure tint — used for stroke / motes. */
  primary: number;
  /** Secondary tint — used for accent layer. */
  secondary: number;
  /** Soft halo color — used for the outer ring. */
  glow: number;
};

export type EncounterProfile = {
  /** Stable id for save flags (`encounter_seen_${id}`). */
  id: string;
  /** Display name shown on the nameplate / intro card (e.g. "SORYN"). */
  displayName: string;
  /** One short identity line — never a sentence, never a quip. */
  subtitle?: string;
  category: EncounterCategory;
  palette: EncounterPalette;
  introStyle: EncounterIntroStyle;
  sigilStyle: EncounterSigilStyle;
  /** Optional sfx key to play once on first reveal. */
  soundCue?: string;
};
