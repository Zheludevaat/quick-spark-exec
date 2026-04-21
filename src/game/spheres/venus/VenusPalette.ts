/**
 * Venus scenic palette — wraps the per-zone color identity baked into
 * `VenusArt`/`VenusTiles` so the shared scenic toolkit can refer to Venus
 * with the same vocabulary as Mercury and Mars.
 *
 * Venus has two visual *modes* per zone:
 *  - curated: opulent, flattering, mirror-bright (default first visit)
 *  - true: softened, less reflective, more honest (post-attune)
 *
 * `venusZoneSoftening()` already returns the softening level (0|1|2) per
 * zone. The painter passes that into `addVenusLightingOverlay(...)`. This
 * file just publishes the palette family so other systems (HUD, tray,
 * future overlays) can stay tonally coherent.
 */
import type { ScenicPalette } from "../../visual/ScenicTypes";
import type { VenusZoneId } from "./VenusData";

const VENUS_BASE: ScenicPalette = {
  bg0: "#1a0e1c",
  bg1: "#2a1828",
  bg2: "#3c2238",
  floor0: "#241420",
  floor1: "#3a2032",
  wall0: "#1c1018",
  wall1: "#321a2a",
  trim0: "#a06870",
  trim1: "#e8b0b8",
  accent0: "#f0c0d0",
  accent1: "#ffd8e0",
};

const ZONE_OVERRIDES: Partial<Record<VenusZoneId, Partial<ScenicPalette>>> = {
  atrium: { bg2: "#4a2a40", accent1: "#ffe0e8" },
  gallery: { wall1: "#3a2030", trim1: "#f0c0c8" },
  recognition_hall: { accent0: "#e8a8c0", accent1: "#ffd0e0" },
  reconstruction: { floor1: "#3c2236", accent0: "#d090a0" },
  lader: { bg1: "#2a1830", trim1: "#e0a8b8" },
  threshold: { accent1: "#ffe8d8", trim1: "#f0c0a8" },
};

export function venusZonePalette(zone: VenusZoneId): ScenicPalette {
  return { ...VENUS_BASE, ...(ZONE_OVERRIDES[zone] ?? {}) };
}

/** Tint shift toward "true" state as softening increases. */
export const VENUS_SOFTENING_TINTS = {
  0: { tint: 0xffd8e0, alpha: 0.0 }, // pure curated
  1: { tint: 0xc8a8b8, alpha: 0.05 }, // partial release
  2: { tint: 0x9888a0, alpha: 0.1 }, // true state
} as const;
