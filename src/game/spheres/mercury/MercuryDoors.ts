/**
 * Mercury door art — distinct identities for Doubt, Certainty, Silence.
 * Wraps the baked door textures with motion that matches each motif:
 *   - Doubt: fast unstable flicker
 *   - Certainty: slow, rigid breath
 *   - Silence: barely-there shimmer of the centerline
 */
import * as Phaser from "phaser";
import { mercuryTexKey } from "./MercuryTextures";
import type { MercuryZoneKey } from "./MercuryPalette";

export type MercuryDoorKind = "doubt" | "certainty" | "silence";

export type MercuryDoorHandle = {
  image: Phaser.GameObjects.Image;
  destroy(): void;
};

export function createMercuryDoor(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  kind: MercuryDoorKind,
  x: number,
  y: number,
): MercuryDoorHandle {
  const key = mercuryTexKey(`door_${kind}`, zone);
  const img = scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(4);

  const cfg =
    kind === "doubt"
      ? { duration: 360, alpha: 0.55 as const, ease: "Sine.inOut" as const }
      : kind === "certainty"
        ? { duration: 1800, alpha: 0.85 as const, ease: "Quad.inOut" as const }
        : { duration: 2400, alpha: 0.5 as const, ease: "Sine.inOut" as const };

  const tween = scene.tweens.add({
    targets: img,
    alpha: { from: 1, to: cfg.alpha },
    duration: cfg.duration,
    yoyo: true,
    repeat: -1,
    ease: cfg.ease,
  });

  return {
    image: img,
    destroy: () => {
      tween.stop();
      img.destroy();
    },
  };
}
