import * as Phaser from "phaser";
import type { SoulArchetype } from "./souls";

/**
 * Tiny GBC-style soul figures, built from primitives (rectangles + arcs).
 * One container per soul — keeps `ImaginalRealmScene` free of asset baking.
 *
 * Each archetype has a recognizable silhouette + a "tell" prop for the
 * famous shades (a feather, a lantern, a score, etc.) so the player can
 * identify them by hook + tell alone.
 */

export type SoulMood = "waiting" | "engaged" | "resolved";

export type Built = {
  container: Phaser.GameObjects.Container;
  halo: Phaser.GameObjects.Arc;
  /** Apply a mood — changes halo color/intensity and idle bob speed. */
  setMood: (m: SoulMood) => void;
  archetype: SoulArchetype;
};

const MOOD_COLOR: Record<SoulMood, number> = {
  waiting: 0xdde6f5,
  engaged: 0xffe098,
  resolved: 0xa8e8c8,
};

const PALETTE: Record<SoulArchetype, { robe: number; head: number; accent: number }> = {
  robed: { robe: 0x3a4a78, head: 0xdde6f5, accent: 0x88a8d8 },
  weeper: { robe: 0x586878, head: 0xdde6f5, accent: 0x88c0e8 },
  drowned: { robe: 0x2a3a58, head: 0xa8c8e8, accent: 0xdde6f5 },
  mirror: { robe: 0x4a3a58, head: 0xdde6f5, accent: 0xc8a8e8 },
  collector: { robe: 0x584830, head: 0xdde6f5, accent: 0xffe098 },
  sleeper: { robe: 0x303848, head: 0x9fb0cf, accent: 0x586878 },
  saint: { robe: 0x686050, head: 0xdde6f5, accent: 0xf0e8c8 },
  composer: { robe: 0x382a48, head: 0xdde6f5, accent: 0xf0a878 },
  crowned: { robe: 0x583a3a, head: 0xdde6f5, accent: 0xd8a868 },
  stonechild: { robe: 0x484848, head: 0xa8a8a8, accent: 0x686868 },
  mathematician: { robe: 0x2a3848, head: 0xdde6f5, accent: 0xffe098 },
  feather: { robe: 0x484058, head: 0xdde6f5, accent: 0xf0f0f0 },
  echo: { robe: 0x586878, head: 0xa8c8e8, accent: 0xdde6f5 },
};

export function buildSoulSprite(
  scene: Phaser.Scene,
  archetype: SoulArchetype,
  x: number,
  y: number,
): Built {
  const c = scene.add.container(x, y).setDepth(8);
  const p = PALETTE[archetype];

  // Halo (visible when player is near)
  const halo = scene.add.circle(0, 0, 9, 0xdde6f5, 0).setDepth(7);
  scene.tweens.add({
    targets: halo,
    scale: 1.3,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  // Common body: small robed figure 6w x 10h, head on top.
  const robe = scene.add.rectangle(0, 2, 6, 8, p.robe, 1).setOrigin(0.5);
  const head = scene.add.circle(0, -4, 2.5, p.head, 1);
  c.add([robe, head]);

  // Per-archetype tells
  switch (archetype) {
    case "robed": {
      // Cartographer — a small "scroll" in front
      const scroll = scene.add.rectangle(0, 4, 5, 1.5, p.accent, 1);
      c.add(scroll);
      break;
    }
    case "weeper": {
      // Hands to face — two tiny accent dots
      const lt = scene.add.circle(-1.5, -3, 0.6, p.accent, 1);
      const rt = scene.add.circle(1.5, -3, 0.6, p.accent, 1);
      c.add([lt, rt]);
      break;
    }
    case "drowned": {
      // Hair fanned — wider head + a wisp below
      const wisp = scene.add.rectangle(0, 6, 5, 1, p.accent, 0.7);
      const hair = scene.add.rectangle(0, -5, 6, 1.5, p.accent, 1);
      c.add([wisp, hair]);
      break;
    }
    case "mirror": {
      // Holds a tiny mirror in front
      const mirror = scene.add.rectangle(2, 2, 2, 3, p.accent, 1);
      c.add(mirror);
      break;
    }
    case "collector": {
      // Jar in front (motes inside)
      const jar = scene.add.rectangle(0, 4, 3, 4, 0x303848, 1);
      const mote1 = scene.add.circle(-0.5, 4, 0.5, p.accent, 1);
      const mote2 = scene.add.circle(0.5, 5, 0.5, p.accent, 1);
      c.add([jar, mote1, mote2]);
      break;
    }
    case "sleeper": {
      // Lying down — flatten and rotate
      robe.setSize(8, 4);
      robe.setPosition(0, 4);
      head.setPosition(-4, 4);
      // Z's
      const z = scene.add.text(3, -4, "z", {
        fontFamily: "monospace",
        fontSize: "5px",
        color: "#dde6f5",
      });
      c.add(z);
      scene.tweens.add({ targets: z, alpha: 0.2, duration: 1400, yoyo: true, repeat: -1 });
      break;
    }
    case "saint": {
      // Bare feet — two small dots; halo over head
      const halo2 = scene.add.circle(0, -6, 2, p.accent, 0.6);
      const f1 = scene.add.rectangle(-1, 7, 1, 1, p.head, 1);
      const f2 = scene.add.rectangle(1, 7, 1, 1, p.head, 1);
      c.add([halo2, f1, f2]);
      break;
    }
    case "composer": {
      // Holds a stylized score — two short staff lines
      const staff1 = scene.add.rectangle(0, 2, 5, 0.5, p.accent, 1);
      const staff2 = scene.add.rectangle(0, 4, 5, 0.5, p.accent, 1);
      c.add([staff1, staff2]);
      break;
    }
    case "crowned": {
      // Paper crown
      const crown = scene.add.rectangle(0, -7, 5, 1.5, p.accent, 1);
      c.add(crown);
      break;
    }
    case "stonechild": {
      // Smaller, greyer
      robe.setSize(5, 6);
      robe.setPosition(0, 3);
      head.setPosition(0, -2);
      head.setRadius(2);
      break;
    }
    case "mathematician": {
      // Lantern in hand
      const lantern = scene.add.rectangle(3, 3, 2, 3, p.accent, 1);
      const flame = scene.add.circle(3, 2, 0.7, 0xffe098, 1);
      scene.tweens.add({ targets: flame, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
      c.add([lantern, flame]);
      break;
    }
    case "feather": {
      // Holds a feather — diagonal line + tip
      const stem = scene.add.rectangle(2, 1, 0.7, 6, p.accent, 1).setRotation(0.3);
      const tip = scene.add.circle(3, -2, 0.8, p.accent, 1);
      c.add([stem, tip]);
      break;
    }
    case "echo": {
      // Faint, semi-transparent, drifts
      c.setAlpha(0.6);
      scene.tweens.add({
        targets: c,
        alpha: 0.35,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      break;
    }
  }

  // Idle bob
  scene.tweens.add({
    targets: c,
    y: y - 1,
    duration: 1400 + Math.random() * 400,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  return { container: c, halo };
}
