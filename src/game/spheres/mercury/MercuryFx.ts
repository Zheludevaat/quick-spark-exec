/**
 * Mercury subtle FX — restrained ambient motion that reads as breathing
 * rather than busy. Motes drift, lamps shimmer in slight phase offsets.
 * No screen-wide particle storms.
 */
import * as Phaser from "phaser";

export type MercuryFxHandle = {
  destroy(): void;
};

export function createMercuryMotes(
  scene: Phaser.Scene,
  count = 10,
): MercuryFxHandle {
  const motes: Phaser.GameObjects.Rectangle[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  for (let i = 0; i < count; i++) {
    const mote = scene.add
      .rectangle(
        12 + ((i * 17) % 136),
        22 + ((i * 29) % 96),
        1,
        1,
        0xd8f7ff,
        0.5,
      )
      .setDepth(4);
    motes.push(mote);

    tweens.push(
      scene.tweens.add({
        targets: mote,
        y: mote.y + 4 + (i % 5),
        alpha: { from: 0.25, to: 0.6 },
        duration: 1600 + i * 80,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      }),
    );
  }

  return {
    destroy() {
      tweens.forEach((t) => t.stop());
      motes.forEach((m) => m.destroy());
    },
  };
}

export function createLampShimmer(
  scene: Phaser.Scene,
  lamps: Phaser.GameObjects.Image[],
): MercuryFxHandle {
  const tweens = lamps.map((lamp, i) =>
    scene.tweens.add({
      targets: lamp,
      alpha: { from: 0.92, to: 1 },
      duration: 500 + i * 70,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    }),
  );

  return {
    destroy() {
      tweens.forEach((t) => t.stop());
    },
  };
}
