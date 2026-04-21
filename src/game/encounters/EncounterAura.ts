import * as Phaser from "phaser";
import type { EncounterIntroStyle, EncounterPalette } from "./EncounterProfile";

/**
 * Reusable aura attached to the encounter's world position. Supports a small
 * set of identity-flavours (orbit motes, ember halo, mirror shimmer, etc.)
 * plus three lifecycle hooks: `pulse` (used on arrival / state-change),
 * `soften` (used on resolution / completion), and `destroy`.
 */
export type EncounterAuraHandle = {
  root: Phaser.GameObjects.Container;
  setActive(v: boolean): void;
  pulse(): void;
  soften(): void;
  destroy(): void;
};

export function makeEncounterAura(
  scene: Phaser.Scene,
  x: number,
  y: number,
  style: EncounterIntroStyle,
  palette: EncounterPalette,
): EncounterAuraHandle {
  const root = scene.add.container(x, y).setDepth(24);
  // Track every member so `soften` can dim the whole arrangement, and so
  // tweens can be cleaned up on destroy without leaking timers.
  const members: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];

  const ring = scene.add.circle(0, 0, 8, palette.glow, 0.18);
  root.add(ring);
  members.push(ring);

  if (style === "orbit" || style === "shimmer") {
    for (let i = 0; i < 3; i++) {
      const mote = scene.add.circle(0, 0, 1, palette.primary, 0.6);
      root.add(mote);
      members.push(mote);
      const counter = scene.tweens.addCounter({
        from: 0,
        to: Math.PI * 2,
        duration: 1800 + i * 220,
        repeat: -1,
        onUpdate: (tw) => {
          const v = tw.getValue() as number;
          const a = v + (i / 3) * Math.PI * 2;
          mote.x = Math.cos(a) * 10;
          mote.y = Math.sin(a) * 6;
        },
      });
      tweens.push(counter);
    }
  }

  if (style === "furnace") {
    const ember = scene.add.circle(0, 2, 3, palette.primary, 0.35);
    root.add(ember);
    members.push(ember);
    tweens.push(
      scene.tweens.add({
        targets: ember,
        scale: { from: 1, to: 1.6 },
        alpha: { from: 0.35, to: 0.1 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      }),
    );
  }

  if (style === "seal") {
    ring.setStrokeStyle(1, palette.primary, 0.7);
  }

  if (style === "hush") {
    tweens.push(
      scene.tweens.add({
        targets: ring,
        alpha: { from: 0.18, to: 0.06 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      }),
    );
  } else if (style !== "furnace") {
    tweens.push(
      scene.tweens.add({
        targets: ring,
        scale: { from: 1, to: 1.35 },
        alpha: { from: 0.18, to: 0.08 },
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      }),
    );
  }

  let softened = false;

  return {
    root,
    setActive(v) {
      root.setVisible(v);
    },
    pulse() {
      // Quick "noticed me" flash. Re-uses the same root scale.
      scene.tweens.add({
        targets: root,
        scale: { from: 1, to: 1.25 },
        duration: 180,
        yoyo: true,
      });
    },
    soften() {
      if (softened) return;
      softened = true;
      // Quieted memory state — figure is still present, but no longer demanding.
      members.forEach((m) => {
        const shape = m as Phaser.GameObjects.Shape;
        if (typeof shape.setAlpha === "function") shape.setAlpha(0.14);
      });
    },
    destroy() {
      tweens.forEach((t) => t?.remove?.());
      root.destroy(true);
    },
  };
}
