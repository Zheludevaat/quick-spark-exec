import type { EncounterProfile } from "../EncounterProfile";

/**
 * The daimon comes in two presentations within Act 1:
 *   - threshold form: warm shimmer near the gate, "friend of the threshold"
 *   - daimon form:    cooler orbiting lattice once Rowan accepts the binding
 *
 * Same being, two visual languages. Player-facing name is SOPHENE per the
 * canonical brief; the file/export names retain "SORYN" for save-flag and
 * legacy-code compatibility.
 */

export const SORYN_THRESHOLD_PROFILE: EncounterProfile = {
  id: "soryn_threshold",
  displayName: "SOPHENE",
  subtitle: "FRIEND OF THE THRESHOLD",
  category: "companion",
  palette: { primary: 0xa8c8e8, secondary: 0xdde6f5, glow: 0x88c0e8 },
  introStyle: "shimmer",
  sigilStyle: "ring",
  soundCue: "confirm",
};

export const SORYN_DAIMON_PROFILE: EncounterProfile = {
  id: "soryn_daimon",
  displayName: "SOPHENE",
  subtitle: "DAIMON",
  category: "companion",
  palette: { primary: 0x88c0e8, secondary: 0xc8e0f8, glow: 0xa8c8e8 },
  introStyle: "orbit",
  sigilStyle: "lattice",
  soundCue: "resolve",
};
