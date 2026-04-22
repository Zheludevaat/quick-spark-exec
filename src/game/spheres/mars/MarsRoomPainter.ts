/**
 * Mars room painter — bakes per-zone textures, draws the backdrop, lays
 * the floor, and anchors zone-specific landmarks. Returns a single handle
 * the scene calls on zone change to wipe room art.
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
  const textures = ensureMarsTextures(scene, zone);
  const handles: ScenicHandle[] = [];
  const objects: Phaser.GameObjects.GameObject[] = [];

  handles.push(
    buildMarsBackdrop(scene, zone, {
      banner: textures.banner,
      seal: textures.seal,
    }),
  );

  const floorKey =
    zone === "line_yard"
      ? textures.floorLine
      : zone === "infirmary"
        ? textures.floorInfirm
        : textures.floorPlain;

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
          .image(16 + i * 40, 60, textures.pillar)
          .setOrigin(0, 0)
          .setDepth(6),
      );
    }
  }

  if (zone === "stands") {
    for (let i = 0; i < 6; i++) {
      objects.push(
        scene.add
          .image(10 + i * 24, 82, textures.banner)
          .setOrigin(0, 0)
          .setDepth(6),
      );
    }
  }

  if (zone === "line_yard") {
    objects.push(
      scene.add.image(70, 86, textures.lineMarker).setOrigin(0, 0).setDepth(6),
    );
    objects.push(
      scene.add.image(70, 110, textures.lineMarker).setOrigin(0, 0).setDepth(6),
    );
  }

  if (zone === "infirmary") {
    objects.push(scene.add.image(20, 88, textures.cot).setOrigin(0, 0).setDepth(6));
    objects.push(scene.add.image(64, 88, textures.cot).setOrigin(0, 0).setDepth(6));
    objects.push(scene.add.image(108, 88, textures.cot).setOrigin(0, 0).setDepth(6));
  }

  if (zone === "threshold" || zone === "trial") {
    objects.push(scene.add.image(68, 96, textures.seal).setOrigin(0, 0).setDepth(6));
  }

  return {
    destroy() {
      handles.forEach((h) => h.destroy());
      objects.forEach((o) => o.destroy());
    },
  };
}
