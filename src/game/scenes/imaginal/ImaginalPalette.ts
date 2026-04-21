/**
 * Imaginal scenic palette — documents the per-region color identity that
 * `ImaginalRealmScene` and `applyRegionMemory()` already use, but exposed
 * through the shared scenic-toolkit vocabulary so future passes can reuse
 * it without re-deriving constants.
 *
 * Three regions, three palettes:
 *  - pools: cool reflecting blues, lunar silvers
 *  - field: warm dusk gold, glittering amber
 *  - corridor: muted indigo, low-light gold of arrival
 *
 * The aftermath tone overlays in `applyRegionMemory()` lift toward
 * `accent0/accent1` as work resolves, which is why those values match the
 * existing tween colors (0x88c0e8, 0xffe098, 0xc8a060).
 */
import type { ScenicPalette } from "../../visual/ScenicTypes";
import type { ImaginalRegion } from "../../types";

export const IMAGINAL_POOLS_PALETTE: ScenicPalette = {
  bg0: "#0a1428",
  bg1: "#142848",
  bg2: "#1e3858",
  floor0: "#1a2840",
  floor1: "#2a4060",
  wall0: "#0e1a30",
  wall1: "#243a58",
  trim0: "#4a6890",
  trim1: "#88c0e8",
  accent0: "#88c0e8",
  accent1: "#a8c8e8",
};

export const IMAGINAL_FIELD_PALETTE: ScenicPalette = {
  bg0: "#1a1830",
  bg1: "#2a2440",
  bg2: "#3a3050",
  floor0: "#241e38",
  floor1: "#3a3050",
  wall0: "#181428",
  wall1: "#2c2440",
  trim0: "#a08858",
  trim1: "#ffe098",
  accent0: "#ffe098",
  accent1: "#f0c878",
};

export const IMAGINAL_CORRIDOR_PALETTE: ScenicPalette = {
  bg0: "#080a14",
  bg1: "#10131c",
  bg2: "#1a1c28",
  floor0: "#0e1018",
  floor1: "#181a24",
  wall0: "#06080e",
  wall1: "#14161e",
  trim0: "#604830",
  trim1: "#c8a060",
  accent0: "#c8a060",
  accent1: "#e8c890",
};

export const IMAGINAL_PALETTES: Record<ImaginalRegion, ScenicPalette> = {
  pools: IMAGINAL_POOLS_PALETTE,
  field: IMAGINAL_FIELD_PALETTE,
  corridor: IMAGINAL_CORRIDOR_PALETTE,
};

/** Memory-state tint families consumed by aftermath overlays. */
export const IMAGINAL_MEMORY_TINTS = {
  pools: { partial: 0x88c0e8, resolved: 0xa8c8e8 },
  field: { partial: 0xffe098, resolved: 0xf0c878 },
  corridor: { partial: 0x10131c, resolved: 0xc8a060 },
} as const;
