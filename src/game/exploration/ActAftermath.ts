/**
 * ActAftermath — reusable visual primitives for "the room remembers".
 *
 * Acts call these helpers after a meaningful resolution to leave a small
 * persistent or animated mark on the scene: a slow memory ring, a colored
 * tone overlay, or a one-shot resolve flash. The goal is that solved
 * places visibly calm down or shift, so revisits feel different without
 * each scene reinventing its own ambient layer.
 */
import * as Phaser from "phaser";

export type AftermathHandle = {
  destroy(): void;
};

export function spawnMemoryRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  alpha = 0.18,
): AftermathHandle {
  const ring = scene.add.circle(x, y, 5, color, alpha).setDepth(18);
  scene.tweens.add({
    targets: ring,
    scale: { from: 1, to: 1.3 },
    alpha: { from: alpha, to: alpha * 0.5 },
    duration: 1400,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });
  return { destroy: () => ring.destroy() };
}

export function spawnToneOverlay(
  scene: Phaser.Scene,
  color: number,
  alpha: number,
  y = 22,
  width = 160,
  height = 122,
): AftermathHandle {
  const overlay = scene.add
    .rectangle(0, y, width, height, color, alpha)
    .setOrigin(0, 0)
    .setDepth(2);
  return { destroy: () => overlay.destroy() };
}

export function flashResolve(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffffff,
) {
  const flash = scene.add.circle(x, y, 4, color, 0.45).setDepth(24);
  scene.tweens.add({
    targets: flash,
    scale: { from: 1, to: 2.8 },
    alpha: { from: 0.45, to: 0 },
    duration: 320,
    ease: "Sine.out",
    onComplete: () => flash.destroy(),
  });
}
