import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../../gbcArt";
import { runDialog } from "../hud";
import { runInquiry } from "../../inquiry";
import { getAudio } from "../../audio";
import { onActionDown, onDirection } from "../../controls";
import type { SaveSlot } from "../../types";

/**
 * Each knot mechanic resolves with onDone(success). Failure here means
 * "the player chose RELEASE / gave up" — still progresses, smaller stat reward.
 */
export type KnotKind = "reflection" | "echo" | "glitter" | "lantern" | "crown";

export type KnotResult = {
  cleared: boolean;
  stats?: { clarity?: number; compassion?: number; courage?: number };
  shardFragments?: number;
  flags?: string[];
};

export const KNOT_TAGLINE: Record<KnotKind, string> = {
  reflection: "AN IMAGE THAT MIMICS YOU.",
  echo:       "A WORD THE REALM REMEMBERS.",
  glitter:    "A FRAGMENT OF AN AFTERNOON.",
  lantern:    "A LIGHT THAT LIES KINDLY.",
  crown:      "THE SELF YOU WISHED YOU WERE.",
};

export const KNOT_VERB: Record<KnotKind, string> = {
  reflection: "OBSERVE", echo: "ADDRESS", glitter: "REMEMBER", lantern: "RELEASE", crown: "WITNESS",
};

// ============================================================================
// REFLECTION — stand still until your delayed mirror catches up; then OBSERVE.
// ============================================================================
export function runReflectionKnot(
  scene: Phaser.Scene,
  rowan: Phaser.GameObjects.Container,
  knotXY: { x: number; y: number },
  save: SaveSlot,
  onDone: (r: KnotResult) => void,
) {
  const box = drawGBCBox(scene, 4, GBC_H - 32, GBC_W - 8, 28, 250);
  const label = new GBCText(scene, 8, GBC_H - 28, "STAND STILL. WHEN YOUR REFLECTION OVERLAPS, A.", {
    color: COLOR.textAccent, depth: 251, maxWidthPx: GBC_W - 16,
  });

  // Spawn a mimic sprite copying Rowan with a delay
  const mimic = scene.add.sprite(rowan.x + 24, rowan.y, "rowan", 0).setOrigin(0.5, 0.7).setAlpha(0.55).setTint(0xa8c8e8).setDepth(45);
  let lastX = rowan.x, lastY = rowan.y;
  const trail: { x: number; y: number; t: number }[] = [];
  let done = false;

  const timer = scene.time.addEvent({
    delay: 30, loop: true, callback: () => {
      trail.push({ x: rowan.x, y: rowan.y, t: scene.time.now });
      // Drop trail older than 1100ms
      while (trail.length && scene.time.now - trail[0].t > 1100) trail.shift();
      const head = trail[0];
      if (head) { mimic.x = head.x + 18; mimic.y = head.y; }
      lastX = rowan.x; lastY = rowan.y;
    },
  });

  // Detect overlap window: mimic within 8px of rowan AND rowan barely moving
  let overlapping = false;
  const overlapTimer = scene.time.addEvent({
    delay: 60, loop: true, callback: () => {
      const dx = mimic.x - rowan.x, dy = mimic.y - rowan.y;
      overlapping = dx * dx + dy * dy < 36;
      mimic.setAlpha(overlapping ? 0.85 : 0.55);
    },
  });
  void lastX; void lastY;

  const observe = () => {
    if (done) return;
    if (!overlapping) {
      // visual ripple
      scene.cameras.main.shake(80, 0.002);
      getAudio().sfx("miss");
      return;
    }
    done = true;
    cleanup();
    getAudio().sfx("resolve");
    scene.cameras.main.flash(180, 220, 230, 255);
    runDialog(scene, [
      { who: "Soryn", text: "You stood and saw it. The mimic had no inside." },
      { who: "Soryn", text: seedAware(save, "seed_window", "It only knew the wave you did not return.", "It only knew the shape of you.") },
    ], () => onDone({ cleared: true, stats: { clarity: 2 }, shardFragments: 1 }));
  };

  const release = () => {
    if (done) return;
    done = true;
    cleanup();
    runDialog(scene, [
      { who: "Soryn", text: "You release. The mimic dims but stays. It will be here later." },
    ], () => onDone({ cleared: false }));
  };

  let unbindAct: (() => void) | null = null;
  let unbindCancel: (() => void) | null = null;
  const cleanup = () => {
    timer.remove(false);
    overlapTimer.remove(false);
    unbindAct?.();
    unbindCancel?.();
    scene.events.off("vinput-action", observe);
    scene.events.off("vinput-cancel", release);
    box.destroy(); label.destroy(); mimic.destroy();
  };

  unbindAct = onActionDown(scene, "action", observe);
  unbindCancel = onActionDown(scene, "cancel", release);
  scene.events.on("vinput-action", observe);
  scene.events.on("vinput-cancel", release);

  // Safety auto-end after 30s
  scene.time.delayedCall(30000, () => { if (!done) release(); });
  void knotXY;
}

// ============================================================================
// ECHO — pick the original sentence from 4 garbled options.
// ============================================================================
export function runEchoKnot(
  scene: Phaser.Scene, save: SaveSlot, onDone: (r: KnotResult) => void,
) {
  const seedCall = save.seeds.seed_call;
  const seedKettle = save.seeds.seed_kettle;
  const original = seedCall ? "I should have called Mara." : seedKettle ? "I always pour two cups." : "I am tired of being unseen.";
  const garbled: import("../../inquiry").InquiryOption[] = [
    { choice: "ask",     label: "I SHOULD CALL TOMORROW.",  reply: "Close. But too late was always the rhythm." },
    { choice: "ask",     label: original.toUpperCase(),     reply: "Yes. The echo answers, kindly." },
    { choice: "observe", label: "I AM FINE. I AM FINE.",    reply: "That was the surface. Not the line beneath." },
    { choice: "silent",  label: "(SAY NOTHING)",            reply: "Silence is also an echo. Quieter, not gone." },
  ];
  // Shuffle
  for (let i = garbled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [garbled[i], garbled[j]] = [garbled[j], garbled[i]];
  }
  const correct = garbled.findIndex(g => g.label === original.toUpperCase());

  runInquiry(scene, { who: "Echo", text: "WHAT DID YOU MEAN TO SAY?" }, garbled, (picked) => {
    const isCorrect = garbled.indexOf(picked) === correct;
    if (isCorrect) {
      runDialog(scene, [
        { who: "Soryn", text: "Naming what you meant is half of mending." },
      ], () => onDone({ cleared: true, stats: { compassion: 2 }, shardFragments: 1, flags: ["ack_seed_call"] }));
    } else {
      runDialog(scene, [
        { who: "Soryn", text: "Not the line. The echo softens but stays." },
      ], () => onDone({ cleared: true, stats: { compassion: 1 } }));
    }
  });
}

// ============================================================================
// GLITTER — re-order 4 fragments of an afternoon.
// ============================================================================
export function runGlitterKnot(
  scene: Phaser.Scene, save: SaveSlot, onDone: (r: KnotResult) => void,
) {
  const correct = ["MORNING LIGHT", "A CUP IS POURED", "A WORD UNSAID", "EVENING DIM"];
  const shuffled = [...correct];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Ensure not already sorted
  if (shuffled.every((s, i) => s === correct[i])) [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];

  const box = drawGBCBox(scene, 4, GBC_H - 60, GBC_W - 8, 56, 250);
  const title = new GBCText(scene, 8, GBC_H - 56, "ORDER THE AFTERNOON.", { color: COLOR.textAccent, depth: 251 });
  const hint  = new GBCText(scene, 8, GBC_H - 12, "L/R: SWAP  A: CONFIRM", { color: COLOR.textDim, depth: 251 });
  let cursor = 0;
  const items: GBCText[] = shuffled.map((s, i) =>
    new GBCText(scene, 16, GBC_H - 46 + i * 8, s, { color: COLOR.textLight, depth: 251 }));
  const cur = new GBCText(scene, 8, GBC_H - 46, "▶", { color: COLOR.textGold, depth: 251 });

  const refresh = () => {
    items.forEach((t, i) => { t.setText(shuffled[i]); t.setColor(i === cursor ? COLOR.textGold : COLOR.textLight); });
    cur.setPosition(8, GBC_H - 46 + cursor * 8);
  };
  refresh();

  const move = (d: number) => { cursor = (cursor + d + 4) % 4; getAudio().sfx("cursor"); refresh(); };
  const swap = (d: number) => {
    const j = (cursor + d + 4) % 4;
    [shuffled[cursor], shuffled[j]] = [shuffled[j], shuffled[cursor]];
    cursor = j;
    getAudio().sfx("confirm");
    refresh();
  };
  const confirm = () => {
    const ok = shuffled.every((s, i) => s === correct[i]);
    cleanup();
    if (ok) {
      getAudio().sfx("resolve");
      scene.cameras.main.flash(160, 240, 220, 160);
      runDialog(scene, [
        { who: "Soryn", text: "The whole afternoon. Even the dull parts." },
        { who: "Soryn", text: seedAware(save, "seed_kettle", "The second cup was for someone who knew you. You knew it.", "Memory in pieces is still memory.") },
      ], () => onDone({ cleared: true, stats: { courage: 2 }, shardFragments: 1, flags: ["ack_seed_kettle"] }));
    } else {
      runDialog(scene, [
        { who: "Soryn", text: "Half-ordered. The shape is enough for now." },
      ], () => onDone({ cleared: true, stats: { courage: 1 } }));
    }
  };
  let unbindAct: (() => void) | null = null;
  let unbindDir: (() => void) | null = null;
  const cleanup = () => {
    unbindAct?.();
    unbindDir?.();
    scene.events.off("vinput-action", confirm);
    scene.events.off("vinput-down", vmove);
    box.destroy(); title.destroy(); hint.destroy(); cur.destroy();
    items.forEach(i => i.destroy());
  };
  const vmove = (dir: string) => {
    if (dir === "up") move(-1);
    if (dir === "down") move(1);
    if (dir === "left") swap(-1);
    if (dir === "right") swap(1);
  };
  unbindAct = onActionDown(scene, "action", confirm);
  unbindDir = onDirection(scene, vmove);
  scene.events.on("vinput-action", confirm);
  scene.events.on("vinput-down", vmove);
}

// ============================================================================
// LANTERN — a comforting lie. Player must RELEASE; other verbs feed it.
// ============================================================================
export function runLanternKnot(
  scene: Phaser.Scene, save: SaveSlot, onDone: (r: KnotResult) => void,
) {
  const seedCoat = save.seeds.seed_coat;
  const lie = seedCoat
    ? "YOU DID EVERYTHING YOU COULD."
    : "THEY UNDERSTOOD. THEY ALWAYS UNDERSTOOD.";

  const lantern = scene.add.circle(GBC_W / 2, 60, 6, 0xffe098, 0.8).setDepth(40);
  const halo = scene.add.circle(GBC_W / 2, 60, 12, 0xffe098, 0.3).setDepth(39);
  scene.tweens.add({ targets: halo, scale: 1.6, alpha: 0.1, duration: 1100, yoyo: true, repeat: -1 });

  let brightness = 1;

  runInquiry(
    scene,
    { who: "Lantern", text: lie },
    [
      { choice: "observe", label: "OBSERVE",  reply: "It loves being looked at. The light grows." },
      { choice: "ask",     label: "ADDRESS",  reply: "It answers in your voice. The light grows." },
      { choice: "silent",  label: "REMEMBER", reply: "You wrap the lie in memory. The light grows." },
      { choice: "confess", label: "RELEASE",  reply: "You let it go. The lantern winks out." },
    ],
    (picked) => {
      if (picked.label === "RELEASE") {
        scene.tweens.add({ targets: [lantern, halo], alpha: 0, scale: 0.4, duration: 800, onComplete: () => { lantern.destroy(); halo.destroy(); } });
        getAudio().sfx("resolve");
        runDialog(scene, [
          { who: "Soryn", text: "Some lights are not meant to be kept." },
          { who: "Soryn", text: seedAware(save, "seed_coat", "The coat by the door. The unfinished things. They were not yours to finish.", "The kindest lies are the hardest to put down.") },
        ], () => onDone({ cleared: true, stats: { clarity: 1, courage: 2 }, shardFragments: 1, flags: ["ack_seed_coat"] }));
      } else {
        // Brightening cycle — second pass
        brightness++;
        scene.tweens.add({ targets: lantern, scale: 1 + brightness * 0.4, duration: 400 });
        scene.tweens.add({ targets: halo, scale: 1.6 + brightness * 0.4, duration: 400 });
        getAudio().sfx("miss");
        runDialog(scene, [
          { who: "Lantern", text: "ISN'T IT NICE TO BE TOLD?" },
          { who: "Soryn", text: "The lantern fattens on attention. Try RELEASE." },
        ], () => {
          // One forced RELEASE prompt
          runInquiry(scene, { who: "Soryn", text: "Let it go?" }, [
            { choice: "confess", label: "RELEASE", reply: "Yes. Let it dim." },
            { choice: "silent",  label: "KEEP IT", reply: "Then it keeps you. We move on either way." },
          ], (p2) => {
            scene.tweens.add({ targets: [lantern, halo], alpha: 0, scale: 0.4, duration: 800, onComplete: () => { lantern.destroy(); halo.destroy(); } });
            if (p2.label === "RELEASE") {
              onDone({ cleared: true, stats: { courage: 1 }, shardFragments: 1 });
            } else {
              save.flags.kept_lantern = true;
              onDone({ cleared: true, stats: { compassion: 1 }, flags: ["kept_lantern"] });
            }
          });
        });
      }
    },
  );
}

// ============================================================================
// CROWN — optional. WITNESS dissolves, anything else feeds it.
// ============================================================================
export function runCrownKnot(
  scene: Phaser.Scene, save: SaveSlot, onDone: (r: KnotResult) => void,
) {
  if (!save.verbs.witness) {
    runDialog(scene, [
      { who: "Soryn", text: "You are not yet ready to WITNESS this image." },
    ], () => onDone({ cleared: false }));
    return;
  }
  // Show idealized Rowan-in-robes briefly above
  const crown = scene.add.sprite(GBC_W / 2, 56, "rowan", 0).setOrigin(0.5, 0.7).setScale(1.2).setTint(0xffe098).setDepth(40);
  const halo = scene.add.circle(GBC_W / 2, 50, 12, 0xffe098, 0.4).setDepth(39);
  scene.tweens.add({ targets: halo, scale: 1.8, alpha: 0.15, duration: 1300, yoyo: true, repeat: -1 });

  runInquiry(scene, { who: "Crown", text: "AM I NOT WHO YOU WANTED TO BE?" }, [
    { choice: "observe", label: "OBSERVE", reply: "It preens under your gaze. It grows brighter." },
    { choice: "ask",     label: "ADDRESS", reply: "It answers like a king. It grows brighter." },
    { choice: "confess", label: "WITNESS", reply: "You stand and see it whole. The crown is paper." },
    { choice: "silent",  label: "RELEASE", reply: "You let it stay. It will be smaller next time." },
  ], (picked) => {
    if (picked.label === "WITNESS") {
      scene.tweens.add({ targets: [crown, halo], alpha: 0, scaleY: 0.3, duration: 1000, onComplete: () => { crown.destroy(); halo.destroy(); } });
      getAudio().sfx("resolve");
      scene.cameras.main.flash(220, 240, 220, 160);
      save.flags.crown_witnessed = true;
      runDialog(scene, [
        { who: "Soryn", text: "The wished-self. Paper, after all." },
        { who: "Soryn", text: "You will carry this in the next sphere. The Curated Self will know." },
      ], () => onDone({ cleared: true, stats: { clarity: 2 }, flags: ["crown_witnessed"], shardFragments: 1 }));
    } else if (picked.label === "RELEASE") {
      scene.tweens.add({ targets: [crown, halo], alpha: 0.4, duration: 600, onComplete: () => { crown.destroy(); halo.destroy(); } });
      onDone({ cleared: false, stats: { compassion: 1 } });
    } else {
      scene.tweens.add({ targets: crown, scale: 1.4, duration: 400 });
      runDialog(scene, [
        { who: "Crown", text: "GOOD. KEEP LOOKING." },
        { who: "Soryn", text: "It feeds. WITNESS is the only verb that empties it." },
      ], () => {
        scene.tweens.add({ targets: [crown, halo], alpha: 0, duration: 800, onComplete: () => { crown.destroy(); halo.destroy(); } });
        onDone({ cleared: false });
      });
    }
  });
}

// ============================================================================
function seedAware(save: SaveSlot, seed: string, withSeed: string, without: string): string {
  return save.seeds[seed] ? withSeed : without;
}

export function dispatchKnot(
  scene: Phaser.Scene,
  kind: KnotKind,
  rowan: Phaser.GameObjects.Container,
  knotXY: { x: number; y: number },
  save: SaveSlot,
  onDone: (r: KnotResult) => void,
) {
  switch (kind) {
    case "reflection": return runReflectionKnot(scene, rowan, knotXY, save, onDone);
    case "echo":       return runEchoKnot(scene, save, onDone);
    case "glitter":    return runGlitterKnot(scene, save, onDone);
    case "lantern":    return runLanternKnot(scene, save, onDone);
    case "crown":      return runCrownKnot(scene, save, onDone);
  }
}
