/**
 * Mercury landmarks — the hero focal objects that give each major room
 * its screenshot moment. Containers are placed at low depth (3..4) so
 * they sit behind playable stations, providing scenery and atmosphere
 * without blocking interactables.
 */
import * as Phaser from "phaser";
import { mercuryTexKey } from "./MercuryTextures";
import type { MercuryZoneKey } from "./MercuryPalette";

export type MercuryLandmarkHandle = {
  root: Phaser.GameObjects.Container;
  destroy(): void;
};

export function createCrackedLensLandmark(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  x: number,
  y: number,
): MercuryLandmarkHandle {
  const root = scene.add.container(x, y).setDepth(3);
  const lens = scene.add
    .image(0, 0, mercuryTexKey("cracked_lens", zone))
    .setOrigin(0.5, 0.5);
  root.add(lens);

  const tween = scene.tweens.add({
    targets: lens,
    alpha: { from: 0.85, to: 1 },
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  return {
    root,
    destroy: () => {
      tween.stop();
      root.destroy();
    },
  };
}

export function createTrialDoorsLandmark(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  x: number,
  y: number,
): MercuryLandmarkHandle {
  const root = scene.add.container(x, y).setDepth(3);
  const doorA = scene.add
    .image(-36, 0, mercuryTexKey("door_doubt", zone))
    .setOrigin(0.5, 1)
    .setAlpha(0.85);
  const doorB = scene.add
    .image(0, 0, mercuryTexKey("door_certainty", zone))
    .setOrigin(0.5, 1)
    .setAlpha(0.85);
  const doorC = scene.add
    .image(36, 0, mercuryTexKey("door_silence", zone))
    .setOrigin(0.5, 1)
    .setAlpha(0.85);
  root.add([doorA, doorB, doorC]);
  return { root, destroy: () => root.destroy() };
}

export function createHermaiaSealLandmark(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  x: number,
  y: number,
): MercuryLandmarkHandle {
  const root = scene.add.container(x, y).setDepth(3);
  const seal = scene.add
    .image(0, 0, mercuryTexKey("hermaia_seal", zone))
    .setOrigin(0.5, 0.5);
  root.add(seal);

  const tween = scene.tweens.add({
    targets: seal,
    angle: { from: 0, to: 360 },
    duration: 22000,
    repeat: -1,
    ease: "Linear",
  });

  return {
    root,
    destroy: () => {
      tween.stop();
      root.destroy();
    },
  };
}
