/**
 * Athanor scenic palette — documents the chamber's stage-based tonal arc.
 *
 * `AthanorThresholdScene` already cycles `thresholdStage` 0→4 as each
 * operation completes (op_nigredo_done → op_albedo_done → ...). Each stage
 * shifts the chamber's dominant accent toward the next operation's color,
 * matching the door tints in DOOR_DEFS.
 *
 * Use `AthanorStagePalette(stage)` when you need a stage-tinted
 * scenic palette for a derivative system (perimeter trace tones, vessel
 * aura layers). Existing in-scene tween colors should remain authoritative.
 */
import type { ScenicPalette } from "../../visual/ScenicTypes";

const BASE: ScenicPalette = {
  bg0: "#0a0810",
  bg1: "#141018",
  bg2: "#1e1820",
  floor0: "#181420",
  floor1: "#241c2c",
  wall0: "#100c14",
  wall1: "#1c1822",
  trim0: "#3a3048",
  trim1: "#604858",
  accent0: "#a08068",
  accent1: "#e0c098",
};

const STAGE_ACCENT: Array<{ accent0: string; accent1: string }> = [
  { accent0: "#a08068", accent1: "#e0c098" }, // 0 - dormant
  { accent0: "#404048", accent1: "#80808c" }, // 1 - nigredo (black)
  { accent0: "#c0c0c8", accent1: "#f0f0f8" }, // 2 - albedo (white)
  { accent0: "#c8a040", accent1: "#f0d878" }, // 3 - citrinitas (yellow)
  { accent0: "#c84040", accent1: "#f08080" }, // 4 - rubedo (red)
];

export function athanorStagePalette(stage: 0 | 1 | 2 | 3 | 4): ScenicPalette {
  return { ...BASE, ...STAGE_ACCENT[stage] };
}

/** Numeric door tints kept in lockstep with `DOOR_DEFS` in the scene. */
export const ATHANOR_DOOR_TINTS = {
  nigredo: 0x202028,
  albedo: 0xe0e0e8,
  citrinitas: 0xe8c860,
  rubedo: 0xb84040,
} as const;

/** Perimeter trace tints — soot / basin / filament / seam. */
export const ATHANOR_PERIMETER_TINTS = {
  soot: 0x404048,
  basin: 0xc0c0c8,
  filament: 0xc8a040,
  seam: 0xc84040,
} as const;
