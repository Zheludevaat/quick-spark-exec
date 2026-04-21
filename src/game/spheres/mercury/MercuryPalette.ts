/**
 * Mercury palette system. Centralizes the act's color discipline: a
 * single base palette of indigo void, slate stone, chalk light, and
 * antique brass, plus per-zone variants that shift only one or two
 * channels so the act feels varied yet coherent.
 */

export type MercuryPalette = {
  bg0: string;
  bg1: string;
  bg2: string;
  stone0: string;
  stone1: string;
  stone2: string;
  chalk0: string;
  chalk1: string;
  brass0: string;
  brass1: string;
  brass2: string;
  accent0: string;
};

export const MERCURY_BASE_PALETTE: MercuryPalette = {
  bg0: "#0A1022",
  bg1: "#162344",
  bg2: "#2A416E",
  stone0: "#25314F",
  stone1: "#54698A",
  stone2: "#D8E1F0",
  chalk0: "#8AC4E8",
  chalk1: "#F2F7FF",
  brass0: "#6A4D2E",
  brass1: "#B4884E",
  brass2: "#E8C98A",
  accent0: "#B7F0FF",
};

export type MercuryZoneKey =
  | "plateau"
  | "ascent"
  | "defender"
  | "pedant"
  | "casuist"
  | "cracking"
  | "trial"
  | "hermaia";

export const MERCURY_ZONE_PALETTES: Record<MercuryZoneKey, MercuryPalette> = {
  plateau: { ...MERCURY_BASE_PALETTE, bg2: "#37568A" },
  ascent: { ...MERCURY_BASE_PALETTE, stone1: "#60779B" },
  defender: { ...MERCURY_BASE_PALETTE, stone0: "#202C45", brass1: "#A97A44" },
  pedant: { ...MERCURY_BASE_PALETTE, stone1: "#687EA0", chalk0: "#98D8F2" },
  casuist: { ...MERCURY_BASE_PALETTE, bg2: "#455A84", accent0: "#D0EEFF" },
  cracking: { ...MERCURY_BASE_PALETTE, chalk0: "#9FE8FF", brass2: "#F1D69E" },
  trial: {
    ...MERCURY_BASE_PALETTE,
    bg0: "#09101F",
    bg1: "#111D38",
    stone2: "#E5ECF8",
  },
  hermaia: {
    ...MERCURY_BASE_PALETTE,
    bg1: "#0F1B33",
    chalk1: "#FFFFFF",
    accent0: "#D8FAFF",
  },
};

export function hexToColor(hex: string): number {
  // Strip leading '#'
  return parseInt(hex.replace(/^#/, ""), 16);
}
