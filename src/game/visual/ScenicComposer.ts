/**
 * Scenic composer — turns a ScenicRoomSpec into a layered scene.
 *
 * Acts that want default backdrop+floor+landmark layering call
 * `composeScenicRoom(...)` with their own backdrop and landmark builders.
 * Bespoke acts (Mercury, Mars) can skip this and call their painters
 * directly when they need finer control.
 */
import * as Phaser from "phaser";
import type { ScenicHandle, ScenicRoomSpec } from "./ScenicTypes";

export type ScenicComposerDeps = {
  buildBackdrop: (scene: Phaser.Scene, spec: ScenicRoomSpec) => ScenicHandle;
  placeLandmarks: (scene: Phaser.Scene, spec: ScenicRoomSpec) => ScenicHandle;
};

export function composeScenicRoom(
  scene: Phaser.Scene,
  spec: ScenicRoomSpec,
  deps: ScenicComposerDeps,
): ScenicHandle {
  const handles: ScenicHandle[] = [];

  handles.push(deps.buildBackdrop(scene, spec));

  const tiles: Phaser.GameObjects.Image[] = [];
  for (let y = spec.floorY; y < spec.floorY + spec.floorH; y += 16) {
    for (let x = 0; x < 160; x += 16) {
      tiles.push(scene.add.image(x, y, spec.floorTileKey).setOrigin(0, 0).setDepth(4));
    }
  }
  handles.push({
    destroy() {
      tiles.forEach((t) => t.destroy());
    },
  });

  handles.push(deps.placeLandmarks(scene, spec));

  return {
    destroy() {
      handles.forEach((h) => h.destroy());
    },
  };
}
