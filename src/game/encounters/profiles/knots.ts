import type { EncounterProfile } from "../EncounterProfile";

/**
 * Imaginal Realm knots — environmental "mini-bosses" the player meets in
 * the Pools / Field / Corridor regions. Subtitles each name what the knot
 * actually IS underneath the symbol, so first-meeting reads as recognition
 * rather than spectacle.
 */
export const KNOT_PROFILES: Record<
  "reflection" | "echo" | "glitter" | "lantern" | "crown",
  EncounterProfile
> = {
  reflection: {
    id: "knot_reflection",
    displayName: "REFLECTION",
    subtitle: "THE SELF THAT COPIES",
    category: "knot",
    palette: { primary: 0xa8c8e8, secondary: 0xdde6f5, glow: 0x88c0e8 },
    introStyle: "shimmer",
    sigilStyle: "mirror",
  },
  echo: {
    id: "knot_echo",
    displayName: "ECHO",
    subtitle: "THE LINE THAT ANSWERS",
    category: "knot",
    palette: { primary: 0xc8a8e8, secondary: 0xa8c8e8, glow: 0xc8a8e8 },
    introStyle: "pulse",
    sigilStyle: "ring",
  },
  glitter: {
    id: "knot_glitter",
    displayName: "GLITTER",
    subtitle: "THE PART THAT SHINES TOO HARD",
    category: "knot",
    palette: { primary: 0xffe098, secondary: 0xf0d060, glow: 0xffe098 },
    introStyle: "pulse",
    sigilStyle: "ember",
  },
  lantern: {
    id: "knot_lantern",
    displayName: "LANTERN",
    subtitle: "THE FALSE KINDNESS OF LIGHT",
    category: "knot",
    palette: { primary: 0xe8c890, secondary: 0xffe098, glow: 0xe8c890 },
    introStyle: "hush",
    sigilStyle: "ring",
  },
  crown: {
    id: "knot_crown",
    displayName: "CROWN",
    subtitle: "THE SELF ALREADY ARRANGED",
    category: "knot",
    palette: { primary: 0xd8a868, secondary: 0xffe098, glow: 0xd8a868 },
    introStyle: "seal",
    sigilStyle: "crown",
  },
};
