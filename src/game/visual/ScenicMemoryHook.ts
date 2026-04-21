/**
 * ScenicMemoryHook — small bridge between `ActAftermathState.actMemoryState`
 * and the per-act palette modules.
 *
 * Pattern:
 *   const state = actMemoryState(save, partials, resolveds);
 *   const overlay = applyScenicMemoryTone(scene, palette, state);
 *
 * This lets new visual passes opt into a unified "fresh / partial /
 * resolved" tinting language without touching the existing in-scene tween
 * code that authored acts already use.
 */
import * as Phaser from "phaser";
import type { ScenicPalette } from "./ScenicTypes";
import type { ActMemoryState } from "./ActAftermathState";
import { spawnToneOverlay, type AftermathHandle } from "./ScenicAftermath";

function hexToColor(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export function applyScenicMemoryTone(
  scene: Phaser.Scene,
  palette: ScenicPalette,
  state: ActMemoryState,
  y = 22,
  height = 122,
): AftermathHandle | undefined {
  if (state === "fresh") return undefined;
  const tint = state === "resolved" ? palette.accent1 : palette.accent0;
  const alpha = state === "resolved" ? 0.08 : 0.05;
  return spawnToneOverlay(scene, hexToColor(tint), alpha, y, height);
}
