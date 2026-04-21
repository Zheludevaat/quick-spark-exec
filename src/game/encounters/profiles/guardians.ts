import type { EncounterProfile } from "../EncounterProfile";

/**
 * The four elemental Guardians of the Silver Threshold. Recognition rite,
 * not combat. Subtitles name what each guardian receives from Rowan rather
 * than what they "are" in the abstract — that distinction matters for the
 * scene's reception language.
 */
export const GUARDIAN_PROFILES: Record<"air" | "fire" | "water" | "earth", EncounterProfile> = {
  air: {
    id: "guardian_air",
    displayName: "AIR",
    subtitle: "THE HELD BREATH",
    category: "guardian",
    palette: { primary: 0xdde6f5, secondary: 0xa8c8e8, glow: 0xdde6f5 },
    introStyle: "orbit",
    sigilStyle: "tri_orbit",
  },
  fire: {
    id: "guardian_fire",
    displayName: "FIRE",
    subtitle: "THE SPENT COURAGE",
    category: "guardian",
    palette: { primary: 0xf08868, secondary: 0xe8a060, glow: 0xf08868 },
    introStyle: "pulse",
    sigilStyle: "ember",
  },
  water: {
    id: "guardian_water",
    displayName: "WATER",
    subtitle: "THE UNDRUNK OFFERING",
    category: "guardian",
    palette: { primary: 0x88c0f0, secondary: 0xa8d8f8, glow: 0x88c0f0 },
    introStyle: "shimmer",
    sigilStyle: "mirror",
  },
  earth: {
    id: "guardian_earth",
    displayName: "EARTH",
    subtitle: "THE CARRIED WEIGHT",
    category: "guardian",
    palette: { primary: 0xa8c890, secondary: 0xc8d8a8, glow: 0xa8c890 },
    introStyle: "seal",
    sigilStyle: "ring",
  },
};
