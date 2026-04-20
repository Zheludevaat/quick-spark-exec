import * as Phaser from "phaser";
import type { SaveSlot } from "./types";
import { writeSave } from "./save";

export const ASSET_BASE = "/assets/game";

export const ASSETS: Record<string, string> = {
  sys_common: `${ASSET_BASE}/sys_common.png`,
  silver_threshold_base: `${ASSET_BASE}/silver_threshold_base.png`,
  silver_threshold_effects: `${ASSET_BASE}/silver_threshold_effects.png`,
  moon_gate_threshold: `${ASSET_BASE}/moon_gate_threshold.png`,
  moon_hall_base: `${ASSET_BASE}/moon_hall_base.png`,
  moon_mirror_puzzle: `${ASSET_BASE}/moon_mirror_puzzle.png`,
  moon_overlays_sigils: `${ASSET_BASE}/moon_overlays_sigils.png`,
  rowan_soul: `${ASSET_BASE}/rowan_soul.png`,
  rowan_reflections: `${ASSET_BASE}/rowan_reflections.png`,
  elemental_guardians: `${ASSET_BASE}/elemental_guardians.png`,
  soryn: `${ASSET_BASE}/soryn.png`,
  soryn_portraits: `${ASSET_BASE}/soryn_portraits.png`,
  moon_encounters: `${ASSET_BASE}/moon_encounters.png`,
  curated_self_boss: `${ASSET_BASE}/curated_self_boss.png`,
  command_icons: `${ASSET_BASE}/command_icons.png`,
  ui_misc_small: `${ASSET_BASE}/ui_misc_small.png`,
  ui_dialog_buttons: `${ASSET_BASE}/ui_dialog_buttons.png`,
  pickups_and_status: `${ASSET_BASE}/pickups_and_status.png`,
  reflection_portraits: `${ASSET_BASE}/reflection_portraits.png`,
  touch_controls: `${ASSET_BASE}/touch_controls.png`,
};

// GBC-style palette
export const PAL = {
  void: 0x0a0e1a,
  silverDark: 0x2a3550,
  silverMid: 0x6a7a9c,
  silverLight: 0xc8d4e8,
  pearl: 0xeef3ff,
  moonBlue: 0x4a78c8,
  moonCyan: 0x8ec8e8,
  fire: 0xe07b3c,
  water: 0x4aa0d8,
  earth: 0x6ab84a,
  air: 0xd8e8d8,
  sigil: 0xf0e08c,
  warn: 0xd86a6a,
  text: 0xeef3ff,
};

export const TILE = 16;
export const VIEW_W = 320; // 20 tiles
export const VIEW_H = 240; // 15 tiles

/**
 * Pixel font using Phaser bitmap text would require a font asset.
 * We use a tiny pixelated text via Phaser.GameObjects.Text with monospace.
 */
export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 8,
  color = "#eef3ff",
) {
  return scene.add.text(x, y, text, {
    fontFamily: "monospace",
    fontSize: `${size}px`,
    color,
    resolution: 2,
  }).setScrollFactor(0);
}

export function drawDialogBox(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(100);
  g.fillStyle(0x0a0e1a, 0.92);
  g.fillRect(x, y, w, h);
  g.lineStyle(2, PAL.silverLight, 1);
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.lineStyle(1, PAL.moonCyan, 0.8);
  g.strokeRect(x + 4, y + 4, w - 8, h - 8);
  return g;
}

export function persistScene(slot: SaveSlot, scene: SaveSlot["scene"]) {
  writeSave({ ...slot, scene });
}
