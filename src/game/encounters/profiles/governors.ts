/**
 * Governor profiles — Hermaia (Mercury), Kypria (Venus), Areon (Mars).
 *
 * Used to give each governor a coherent presentation language across
 * their plateau and trial scenes: an austere first sting, a per-phase
 * intro card during trials, and a post-pass memory mark.
 */
import type { EncounterProfile } from "../EncounterProfile";

export const HERMAIA_PROFILE: EncounterProfile = {
  id: "governor_hermaia",
  displayName: "HERMAIA",
  subtitle: "GOVERNOR OF MERCURY",
  category: "governor",
  palette: { primary: 0xa8c8e8, secondary: 0xdde6f5, glow: 0x88c0e8 },
  introStyle: "seal",
  sigilStyle: "lattice",
  soundCue: "resolve",
};

export const KYPRIA_PROFILE: EncounterProfile = {
  id: "governor_kypria",
  displayName: "KYPRIA",
  subtitle: "GOVERNOR OF VENUS",
  category: "governor",
  palette: { primary: 0xe89bb8, secondary: 0xc87898, glow: 0xe8c0d0 },
  introStyle: "shimmer",
  sigilStyle: "mirror",
  soundCue: "resolve",
};

export const AREON_PROFILE: EncounterProfile = {
  id: "governor_areon",
  displayName: "AREON",
  subtitle: "GOVERNOR OF MARS",
  category: "governor",
  palette: { primary: 0xb84040, secondary: 0xd86868, glow: 0x702020 },
  introStyle: "pulse",
  sigilStyle: "ring",
  soundCue: "resolve",
};

/** Per-phase Areon subtitles, used by MarsTrial round headers. */
export const AREON_PHASE_SUBTITLES = ["THE BLOW", "THE LINE", "THE STANCE"] as const;
