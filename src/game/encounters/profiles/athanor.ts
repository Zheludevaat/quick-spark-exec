/**
 * Athanor threshold profiles — the Vessel and the four operation doors.
 *
 * Each door's palette echoes its alchemical color; the vessel uses a
 * furnace-aura. Together they let the AthanorThresholdScene present
 * its core encounter-objects through the same shared system the rest
 * of the cast uses.
 */
import type { EncounterProfile } from "../EncounterProfile";

export const VESSEL_PROFILE: EncounterProfile = {
  id: "athanor_vessel",
  displayName: "VESSEL",
  subtitle: "THE GLASS THAT DOES NOT BREAK WHAT IT CHANGES",
  category: "threshold",
  palette: { primary: 0xc8a060, secondary: 0xe8c860, glow: 0x6a3010 },
  introStyle: "furnace",
  sigilStyle: "ring",
  soundCue: "confirm",
};

export type AthanorDoorKey = "nigredo" | "albedo" | "citrinitas" | "rubedo";

export const ATHANOR_DOOR_PROFILES: Record<AthanorDoorKey, EncounterProfile> = {
  nigredo: {
    id: "athanor_nigredo",
    displayName: "NIGREDO",
    subtitle: "PUTREFACTION",
    category: "threshold",
    palette: { primary: 0x3a3a48, secondary: 0x6a4020, glow: 0x202028 },
    introStyle: "seal",
    sigilStyle: "ring",
  },
  albedo: {
    id: "athanor_albedo",
    displayName: "ALBEDO",
    subtitle: "WASHING / FORGIVENESS",
    category: "threshold",
    palette: { primary: 0xe8e8f0, secondary: 0xc8d8e8, glow: 0xa8a8b8 },
    introStyle: "hush",
    sigilStyle: "ring",
  },
  citrinitas: {
    id: "athanor_citrinitas",
    displayName: "CITRINITAS",
    subtitle: "YELLOWING / MEANING",
    category: "threshold",
    palette: { primary: 0xe8c860, secondary: 0xffe098, glow: 0xe8c860 },
    introStyle: "pulse",
    sigilStyle: "ring",
  },
  rubedo: {
    id: "athanor_rubedo",
    displayName: "RUBEDO",
    subtitle: "REDDENING / SEALING",
    category: "threshold",
    palette: { primary: 0xd03838, secondary: 0xb84040, glow: 0x702020 },
    introStyle: "furnace",
    sigilStyle: "ring",
  },
};
