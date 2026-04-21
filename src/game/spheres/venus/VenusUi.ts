/**
 * Venus UI helpers — small zone label + hint factories used by the
 * bespoke plateau scene, plus the chapter-specific attune ring.
 */
import * as Phaser from "phaser";
import { COLOR, GBCText, GBC_W } from "../../gbcArt";
import { VENUS_SPRITE } from "./VenusSprites";

export function makeVenusZoneLabel(scene: Phaser.Scene, text: string): GBCText {
  return new GBCText(scene, 6, 14, text, {
    color: COLOR.textGold,
    depth: 120,
    maxWidthPx: GBC_W - 12,
  });
}

export function makeVenusHint(scene: Phaser.Scene, text: string): GBCText {
  return new GBCText(scene, 6, 132, text, {
    color: COLOR.textDim,
    depth: 120,
    maxWidthPx: GBC_W - 12,
  });
}

export function makeVenusSubtitle(scene: Phaser.Scene, text: string): GBCText {
  return new GBCText(scene, 6, 24, text, {
    color: COLOR.textAccent,
    depth: 120,
    maxWidthPx: GBC_W - 12,
  });
}

/**
 * LEGACY — generic attune ring kept for any non-Venus call sites.
 * Venus call sites should use `makeVenusAttuneRing` below.
 */
export function makeAttuneRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius = 7,
  color = 0xe89bb8,
): { gfx: Phaser.GameObjects.Graphics; update: (t: number) => void; destroy: () => void } {
  const gfx = scene.add.graphics().setDepth(50);
  const draw = (t: number) => {
    gfx.clear();
    gfx.lineStyle(1, 0x000000, 0.6);
    gfx.strokeCircle(x, y, radius);
    if (t > 0) {
      gfx.lineStyle(1, color, 1);
      gfx.beginPath();
      gfx.arc(x, y, radius - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
      gfx.strokePath();
    }
  };
  draw(0);
  return {
    gfx,
    update: draw,
    destroy: () => gfx.destroy(),
  };
}

export type VenusAttuneRingHandle = {
  update: (t: number) => void;
  destroy: () => void;
  /** Petals collapse inward (used on break, not on completion). */
  break: () => void;
  /** Completion flare — soft outward bloom. */
  complete: () => void;
};

/**
 * Venus-specific attune visualization — rose-gold outer ring, four
 * petal nodes orbiting at the cardinal points, soft inner bloom, and
 * dedicated complete/break animations. Designed to read instantly at
 * 160x144 without crowding the chamber.
 */
export function makeVenusAttuneRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius = 8,
): VenusAttuneRingHandle {
  // Outer rose-gold ring
  const ring = scene.add.graphics().setDepth(50);
  const drawRing = (t: number) => {
    ring.clear();
    ring.lineStyle(1, 0x281018, 0.8);
    ring.strokeCircle(x, y, radius + 1);
    ring.lineStyle(1, 0xb07a48, 0.9);
    ring.strokeCircle(x, y, radius);
    if (t > 0) {
      ring.lineStyle(1, 0xf0d8a0, 1);
      ring.beginPath();
      ring.arc(x, y, radius - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
      ring.strokePath();
    }
  };

  // Inner glow
  const glow = scene.add
    .circle(x, y, radius - 2, 0xf0c8d8, 0.18)
    .setDepth(49)
    .setBlendMode(Phaser.BlendModes.ADD);
  const glowTween = scene.tweens.add({
    targets: glow,
    alpha: 0.42,
    scale: 1.15,
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  // Four petal nodes at cardinal points
  const petalKey = scene.textures.exists(VENUS_SPRITE.fx.petal)
    ? VENUS_SPRITE.fx.petal
    : null;
  const petalOffsets = [
    { dx: 0, dy: -radius - 4 },
    { dx: radius + 4, dy: 0 },
    { dx: 0, dy: radius + 4 },
    { dx: -radius - 4, dy: 0 },
  ];
  const petals: Phaser.GameObjects.Image[] = [];
  if (petalKey) {
    petalOffsets.forEach((o, i) => {
      const p = scene.add
        .image(x + o.dx, y + o.dy, petalKey)
        .setDepth(51)
        .setAlpha(0.85);
      p.setData("home", { x: x + o.dx, y: y + o.dy });
      p.setData("idx", i);
      scene.tweens.add({
        targets: p,
        alpha: 0.5,
        duration: 700 + i * 60,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      petals.push(p);
    });
  }

  drawRing(0);

  let destroyed = false;
  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    glowTween.stop();
    ring.destroy();
    glow.destroy();
    petals.forEach((p) => p.destroy());
  };

  return {
    update: (t: number) => {
      if (destroyed) return;
      drawRing(t);
    },
    destroy: cleanup,
    break: () => {
      if (destroyed) return;
      // Petals collapse inward, then everything dissolves.
      petals.forEach((p) =>
        scene.tweens.add({
          targets: p,
          x,
          y,
          alpha: 0,
          duration: 240,
          ease: "Quad.in",
        }),
      );
      scene.tweens.add({
        targets: glow,
        alpha: 0,
        scale: 0.6,
        duration: 240,
        ease: "Quad.in",
        onComplete: cleanup,
      });
    },
    complete: () => {
      if (destroyed) return;
      // Outward bloom flare
      const flare = scene.add
        .circle(x, y, radius, 0xf0d8a0, 0.55)
        .setDepth(52)
        .setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: flare,
        scale: 2.4,
        alpha: 0,
        duration: 520,
        ease: "Quad.out",
        onComplete: () => flare.destroy(),
      });
      petals.forEach((p, i) =>
        scene.tweens.add({
          targets: p,
          scale: 1.4,
          alpha: 0,
          duration: 380,
          delay: i * 30,
          ease: "Sine.out",
        }),
      );
      scene.tweens.add({
        targets: glow,
        alpha: 0,
        scale: 1.8,
        duration: 420,
        ease: "Sine.out",
        onComplete: cleanup,
      });
    },
  };
}
