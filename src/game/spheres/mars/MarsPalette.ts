/**
 * Mars palette family — iron-red Arena tones.
 *
 * Base palette is the chapter signature; per-zone overrides shift one or
 * two tones so each room reads distinctly without abandoning the family.
 */
import type { ScenicPalette } from "../../visual/ScenicTypes";

export const MARS_BASE_PALETTE: ScenicPalette = {
  bg0: "#120608",
  bg1: "#231014",
  bg2: "#402028",
  floor0: "#2B1518",
  floor1: "#4A252A",
  wall0: "#3A1B20",
  wall1: "#6A3A42",
  trim0: "#7A4A38",
  trim1: "#D09068",
  accent0: "#D86060",
  accent1: "#F0C0A0",
};

export type MarsZoneKey =
  | "approach"
  | "stands"
  | "line_yard"
  | "infirmary"
  | "endurance"
  | "threshold"
  | "trial";

export const MARS_ZONE_PALETTES: Record<MarsZoneKey, ScenicPalette> = {
  approach: { ...MARS_BASE_PALETTE, bg2: "#4A242C" },
  stands: { ...MARS_BASE_PALETTE, wall1: "#73434C" },
  line_yard: { ...MARS_BASE_PALETTE, trim1: "#E0A080" },
  infirmary: {
    ...MARS_BASE_PALETTE,
    floor1: "#503038",
    accent0: "#C89090",
  },
  endurance: {
    ...MARS_BASE_PALETTE,
    bg1: "#1D0B10",
    accent0: "#B84848",
  },
  threshold: { ...MARS_BASE_PALETTE, accent1: "#FFD0B0" },
  trial: {
    ...MARS_BASE_PALETTE,
    bg0: "#0E0405",
    bg1: "#1A0A0E",
    accent0: "#E07070",
  },
};
