/**
 * Mars room painter — bakes textures (once), draws the backdrop, lays the
 * floor, and anchors zone-specific landmarks: pillars at the approach,
 * banner ranks in the stands, line markers on the yard floor, cots in the
 * infirmary, and the Areon seal at threshold/trial.
 *
 * Returns a single handle the scene calls on zone change to wipe room art.
 */
import * as Phaser from "phaser";
import { ensureMarsTextures } from "./MarsTextures";
import { buildMarsBackdrop } from "./MarsBackdrop";
import type { MarsZoneKey } from "./MarsPalette";
import type { ScenicHandle } from "../../visual/ScenicTypes";

export function paintMarsRoom(
  scene: Phaser.Scene,
  zone: MarsZoneKey,
): ScenicHandle {
  ensureMarsTextures(scene);
  const handles: ScenicHandle[] = [];
  const objects: Phaser.GameObjects.GameObject[] = [];

  handles.push(buildMarsBackdrop(scene, zone));

  const floorKey =
    zone === "line_yard"
      ? "mars_floor_line"
      : zone === "infirmary"
        ? "mars_floor_infirm"
        : "mars_floor_plain";

  for (let y = 96; y < 144; y += 16) {
    for (let x = 0; x < 160; x += 16) {
      objects.push(
        scene.add.image(x, y, floorKey).setOrigin(0, 0).setDepth(4),
      );
    }
  }

  if (zone === "approach") {
    for (let i = 0; i < 4; i++) {
      objects.push(
        scene.add
          .image(16 + i * 40, 60, "mars_pillar")
          .setOrigin(0, 0)
          .setDepth(6),
      );
    }
  }

  if (zone === "stands") {
    for (let i = 0; i < 6; i++) {
      objects.push(
        scene.add
          .image(10 + i * 24, 82, "mars_banner")
          .setOrigin(0, 0)
          .setDepth(6),
      );
    }
  }

  if (zone === "line_yard") {
    objects.push(
      scene.add.image(70, 86, "mars_line_marker").setOrigin(0, 0).setDepth(6),
    );
    objects.push(
      scene.add.image(70, 110, "mars_line_marker").setOrigin(0, 0).setDepth(6),
    );
  }

  if (zone === "infirmary") {
    objects.push(scene.add.image(20, 88, "mars_cot").setOrigin(0, 0).setDepth(6));
    objects.push(scene.add.image(64, 88, "mars_cot").setOrigin(0, 0).setDepth(6));
    objects.push(scene.add.image(108, 88, "mars_cot").setOrigin(0, 0).setDepth(6));
  }

  if (zone === "threshold" || zone === "trial") {
    objects.push(scene.add.image(68, 96, "mars_seal").setOrigin(0, 0).setDepth(6));
  }

  return {
    destroy() {
      handles.forEach((h) => h.destroy());
      objects.forEach((o) => o.destroy());
    },
  };
}
