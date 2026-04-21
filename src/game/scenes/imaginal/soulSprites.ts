import * as Phaser from "phaser";
import type { SoulArchetype } from "./souls";

/**
 * Tiny GBC-style soul figures, built from primitives (rectangles + arcs).
 * One container per soul — keeps `ImaginalRealmScene` free of asset baking.
 *
 * All presence styling (shadow, idle motion, halo pulse, mood) is owned here.
 * Callers only decide which mood a soul should be in via setMood().
 */

export type SoulMood = "waiting" | "engaged" | "resolved";

export type Built = {
  container: Phaser.GameObjects.Container;
  halo: Phaser.GameObjects.Arc;
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

// --- Presence staging ----------------------------------------------------

type PresenceProfile = {
  baseAlpha: number;
  idleLift: number;
  idleScaleX: number;
  idleScaleY: number;
  idleDuration: number;
  haloScaleFrom: number;
  haloScaleTo: number;
  haloAlphaFrom: number;
  haloAlphaTo: number;
};

const ARCHETYPE_VARIANCE: Partial<
  Record<SoulArchetype, { lift: number; duration: number; halo: number }>
> = {
  robed: { lift: 0.8, duration: 1500, halo: 1.0 },
  weeper: { lift: 1.1, duration: 1450, halo: 1.0 },
  drowned: { lift: 1.3, duration: 1650, halo: 1.05 },
  mirror: { lift: 0.7, duration: 1350, halo: 0.96 },
  collector: { lift: 0.7, duration: 1500, halo: 0.95 },
  sleeper: { lift: 0.3, duration: 1900, halo: 0.9 },
  saint: { lift: 0.5, duration: 1750, halo: 1.08 },
  composer: { lift: 0.8, duration: 1500, halo: 1.0 },
  crowned: { lift: 0.6, duration: 1700, halo: 1.08 },
  stonechild: { lift: 0.4, duration: 1250, halo: 0.88 },
  mathematician: { lift: 0.6, duration: 1350, halo: 0.95 },
  feather: { lift: 0.9, duration: 1550, halo: 1.02 },
  echo: { lift: 0.9, duration: 1650, halo: 1.0 },
};

function presenceProfile(archetype: SoulArchetype, mood: SoulMood): PresenceProfile {
  const v = ARCHETYPE_VARIANCE[archetype] ?? { lift: 0.8, duration: 1500, halo: 1.0 };

  if (mood === "engaged") {
    return {
      baseAlpha: 1,
      idleLift: v.lift + 0.35,
      idleScaleX: 0.99,
      idleScaleY: 1.03,
      idleDuration: Math.max(950, v.duration - 180),
      haloScaleFrom: 1.0 * v.halo,
      haloScaleTo: 1.18 * v.halo,
      haloAlphaFrom: 0.12,
      haloAlphaTo: 0.26,
    };
  }

  if (mood === "resolved") {
    return {
      baseAlpha: 0.58,
      idleLift: 0.25,
      idleScaleX: 1.0,
      idleScaleY: 1.01,
      idleDuration: v.duration + 450,
      haloScaleFrom: 0.94 * v.halo,
      haloScaleTo: 1.02 * v.halo,
      haloAlphaFrom: 0.0,
      haloAlphaTo: 0.05,
    };
  }

  return {
    baseAlpha: 0.95,
    idleLift: v.lift,
    idleScaleX: 0.995,
    idleScaleY: 1.02,
    idleDuration: v.duration,
    haloScaleFrom: 0.95 * v.halo,
    haloScaleTo: 1.08 * v.halo,
    haloAlphaFrom: 0.02,
    haloAlphaTo: 0.08,
  };
}

export function buildSoulSprite(
  scene: Phaser.Scene,
  archetype: SoulArchetype,
  x: number,
  y: number,
): Built {
  const c = scene.add.container(x, y).setDepth(8);
  const p = PALETTE[archetype];

  // Halo (visible based on mood)
  const halo = scene.add.circle(0, 0, 9, 0xdde6f5, 0).setDepth(7);

  // Common body
  const robe = scene.add.rectangle(0, 2, 6, 8, p.robe, 1).setOrigin(0.5);
  const head = scene.add.circle(0, -4, 2.5, p.head, 1);
  c.add([robe, head]);

  // Per-archetype tells
  switch (archetype) {
    case "robed": {
      const scroll = scene.add.rectangle(0, 4, 5, 1.5, p.accent, 1);
      c.add(scroll);
      break;
    }
    case "weeper": {
      const lt = scene.add.circle(-1.5, -3, 0.6, p.accent, 1);
      const rt = scene.add.circle(1.5, -3, 0.6, p.accent, 1);
      c.add([lt, rt]);
      break;
    }
    case "drowned": {
      const wisp = scene.add.rectangle(0, 6, 5, 1, p.accent, 0.7);
      const hair = scene.add.rectangle(0, -5, 6, 1.5, p.accent, 1);
      c.add([wisp, hair]);
      break;
    }
    case "mirror": {
      const mirror = scene.add.rectangle(2, 2, 2, 3, p.accent, 1);
      c.add(mirror);
      break;
    }
    case "collector": {
      const jar = scene.add.rectangle(0, 4, 3, 4, 0x303848, 1);
      const mote1 = scene.add.circle(-0.5, 4, 0.5, p.accent, 1);
      const mote2 = scene.add.circle(0.5, 5, 0.5, p.accent, 1);
      c.add([jar, mote1, mote2]);
      break;
    }
    case "sleeper": {
      robe.setSize(8, 4);
      robe.setPosition(0, 4);
      head.setPosition(-4, 4);
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
      const halo2 = scene.add.circle(0, -6, 2, p.accent, 0.6);
      const f1 = scene.add.rectangle(-1, 7, 1, 1, p.head, 1);
      const f2 = scene.add.rectangle(1, 7, 1, 1, p.head, 1);
      c.add([halo2, f1, f2]);
      break;
    }
    case "composer": {
      const staff1 = scene.add.rectangle(0, 2, 5, 0.5, p.accent, 1);
      const staff2 = scene.add.rectangle(0, 4, 5, 0.5, p.accent, 1);
      c.add([staff1, staff2]);
      break;
    }
    case "crowned": {
      const crown = scene.add.rectangle(0, -7, 5, 1.5, p.accent, 1);
      c.add(crown);
      break;
    }
    case "stonechild": {
      robe.setSize(5, 6);
      robe.setPosition(0, 3);
      head.setPosition(0, -2);
      head.setRadius(2);
      break;
    }
    case "mathematician": {
      const lantern = scene.add.rectangle(3, 3, 2, 3, p.accent, 1);
      const flame = scene.add.circle(3, 2, 0.7, 0xffe098, 1);
      scene.tweens.add({ targets: flame, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
      c.add([lantern, flame]);
      break;
    }
    case "feather": {
      const stem = scene.add.rectangle(2, 1, 0.7, 6, p.accent, 1).setRotation(0.3);
      const tip = scene.add.circle(3, -2, 0.8, p.accent, 1);
      c.add([stem, tip]);
      break;
    }
    case "echo": {
      // Visual transparency baked into idle profile via baseAlpha of waiting
      break;
    }
  }

  // Drop shadow (sits behind body inside container so it follows movement)
  const shadow = scene.add.ellipse(0, 6, 10, 3, 0x000000, 0.35);
  c.add(shadow);
  c.sendToBack(shadow);

  // Mood-driven presence tweens (owned here, recreated on mood change)
  let idleTween: Phaser.Tweens.Tween | undefined;
  let auraTween: Phaser.Tweens.Tween | undefined;
  let currentMood: SoulMood = "waiting";

  const applyPresence = (m: SoulMood) => {
    currentMood = m;
    idleTween?.remove();
    auraTween?.remove();

    const prof = presenceProfile(archetype, m);

    halo.fillColor = MOOD_COLOR[m];
    c.setAlpha(prof.baseAlpha);
    halo.setScale(prof.haloScaleFrom);
    halo.setAlpha(prof.haloAlphaFrom);

    idleTween = scene.tweens.add({
      targets: c,
      y: y - prof.idleLift,
      scaleX: prof.idleScaleX,
      scaleY: prof.idleScaleY,
      duration: prof.idleDuration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
      delay: Phaser.Math.Between(0, 700),
    });

    auraTween = scene.tweens.add({
      targets: halo,
      scale: { from: prof.haloScaleFrom, to: prof.haloScaleTo },
      alpha: { from: prof.haloAlphaFrom, to: prof.haloAlphaTo },
      duration: prof.idleDuration + 350,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
      delay: Phaser.Math.Between(0, 500),
    });
  };

  // --- ART UPGRADE: Bespoke Silhouettes & Statue Petrification ---
  const setMood = (m: SoulMood) => {
    if (m === currentMood) return;
    if (m === "resolved") {
      // Petrification: turn them into a silver stone statue
      idleTween?.remove();
      auraTween?.remove();
      currentMood = m;
      c.setAlpha(0.6);
      // Tint each child sprite/shape to silver-grey
      for (const child of c.list as Phaser.GameObjects.GameObject[]) {
        const anyChild = child as unknown as { setFillStyle?: (n: number) => void; setTint?: (n: number) => void };
        if (typeof anyChild.setFillStyle === "function") anyChild.setFillStyle(0x788898);
        else if (typeof anyChild.setTint === "function") anyChild.setTint(0x788898);
      }
      halo.setAlpha(0);
      return;
    }
    applyPresence(m);

    // Inject bespoke environmental FX once per soul
    if (archetype === "drowned" && !c.getData("hasFX")) {
      c.setData("hasFX", true);
      // Use a tiny generated 1x1 white texture if missing
      if (!scene.textures.exists("__pixel1")) {
        const g = scene.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xffffff, 1).fillRect(0, 0, 1, 1);
        g.generateTexture("__pixel1", 1, 1);
        g.destroy();
      }
      scene.add
        .particles(c.x, c.y + 4, "__pixel1", {
          tint: 0x88c0e8,
          alpha: { start: 0.8, end: 0 },
          scale: { start: 1, end: 0 },
          speedY: { min: 10, max: 20 },
          lifespan: 600,
          frequency: 400,
        })
        .setDepth(c.depth + 1);
    }
  };

  applyPresence("waiting");

  return { container: c, halo, setMood, archetype };
}
