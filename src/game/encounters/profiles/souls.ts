import type { EncounterProfile } from "../EncounterProfile";

/**
 * Imaginal souls. Keyed by SoulId so callers can look up a profile cheaply
 * during region load.
 *
 * The four explicit examples in the brief (Cartographer, Weeping Twin,
 * Walking Saint, Stonechild) are authored verbatim. The remaining nine
 * souls receive subtitles derived from their existing in-scene hooks so
 * they all gain first-meeting identity without waiting for a follow-up
 * authoring pass.
 *
 * Auras lean on the existing soul archetype palette to stay consistent
 * with their sprite language. Categories are uniformly "soul".
 */
export const SOUL_PROFILES: Record<string, EncounterProfile> = {
  cartographer: {
    id: "soul_cartographer",
    displayName: "CARTOGRAPHER",
    subtitle: "MAPS WHAT IS NO LONGER THERE",
    category: "soul",
    palette: { primary: 0xa8c8e8, secondary: 0xdde6f5, glow: 0x88c0e8 },
    introStyle: "hush",
    sigilStyle: "ring",
  },
  weeping_twin: {
    id: "soul_weeping_twin",
    displayName: "WEEPING TWIN",
    subtitle: "GRIEF ADDRESSED TO A REFLECTION",
    category: "soul",
    palette: { primary: 0x88c0f0, secondary: 0xa8d8f8, glow: 0x88c0f0 },
    introStyle: "shimmer",
    sigilStyle: "mirror",
  },
  drowned_poet: {
    id: "soul_drowned_poet",
    displayName: "ONE WHO SANG",
    subtitle: "A HALF-LINE NOBODY FINISHED",
    category: "soul",
    palette: { primary: 0x6890c8, secondary: 0xa8c8e8, glow: 0x305078 },
    introStyle: "hush",
    sigilStyle: "ring",
  },
  mirror_philosopher: {
    id: "soul_mirror_philosopher",
    displayName: "ONE BY THE WATER",
    subtitle: "INSISTS THE POOL IS THE TRUER WORLD",
    category: "soul",
    palette: { primary: 0xa8c8e8, secondary: 0xdde6f5, glow: 0x6890c8 },
    introStyle: "shimmer",
    sigilStyle: "mirror",
  },
  collector: {
    id: "soul_collector",
    displayName: "COLLECTOR",
    subtitle: "EYES TOO BRIGHT FOR ANY ONE JAR",
    category: "soul",
    palette: { primary: 0xffe098, secondary: 0xf0d060, glow: 0xc88868 },
    introStyle: "pulse",
    sigilStyle: "ember",
  },
  sleeper: {
    id: "soul_sleeper",
    displayName: "SLEEPER",
    subtitle: "WILL NOT BE RECALLED",
    category: "soul",
    palette: { primary: 0x586878, secondary: 0x788898, glow: 0x384858 },
    introStyle: "hush",
    sigilStyle: "ring",
  },
  walking_saint: {
    id: "soul_walking_saint",
    displayName: "ONE WHO REFUSES",
    subtitle: "HOLINESS THROUGH REFUSAL",
    category: "soul",
    palette: { primary: 0xe8e8f0, secondary: 0xc8d8e8, glow: 0xe8e8f0 },
    introStyle: "hush",
    sigilStyle: "ring",
  },
  composer: {
    id: "soul_composer",
    displayName: "ONE WHO LISTENS",
    subtitle: "DEAF TO THE TUNE STILL HERE",
    category: "soul",
    palette: { primary: 0xc8a8e8, secondary: 0xa8c8e8, glow: 0xc8a8e8 },
    introStyle: "shimmer",
    sigilStyle: "ring",
  },
  crowned_one: {
    id: "soul_crowned_one",
    displayName: "CROWNED ONE",
    subtitle: "ALREADY COMPOSED, FAINTLY SMUG",
    category: "soul",
    palette: { primary: 0xd8a868, secondary: 0xffe098, glow: 0xd8a868 },
    introStyle: "seal",
    sigilStyle: "crown",
  },
  stonechild: {
    id: "soul_stonechild",
    displayName: "STONECHILD",
    subtitle: "FORGOT HIS NAME POLITELY",
    category: "soul",
    palette: { primary: 0xc8c8d0, secondary: 0xa8a8b8, glow: 0xd8d8e0 },
    introStyle: "hush",
    sigilStyle: "seal",
  },
  lantern_mathematician: {
    id: "soul_lantern_mathematician",
    displayName: "ONE COUNTING",
    subtitle: "INFINITIES BY LAMPLIGHT",
    category: "soul",
    palette: { primary: 0xe8c890, secondary: 0xffe098, glow: 0xe8c890 },
    introStyle: "pulse",
    sigilStyle: "ember",
  },
  weighed_heart: {
    id: "soul_weighed_heart",
    displayName: "ONE WHO CARRIED A FEATHER",
    subtitle: "TRYING TO REMEMBER WHAT TO WEIGH",
    category: "soul",
    palette: { primary: 0xe8e8f0, secondary: 0xc8d8e8, glow: 0xa8c8e8 },
    introStyle: "shimmer",
    sigilStyle: "ring",
  },
  lampkeeper_echo: {
    id: "soul_echo",
    displayName: "ECHO",
    subtitle: "A FAINT VERSION OF SOMEONE",
    category: "soul",
    palette: { primary: 0xa8c8e8, secondary: 0xc8d8e8, glow: 0xa8c8e8 },
    introStyle: "hush",
    sigilStyle: "ring",
  },
};
