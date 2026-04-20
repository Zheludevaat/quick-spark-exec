import * as Phaser from "phaser";
import type { SaveSlot } from "../../types";
import { writeSave } from "../../save";
import { runDialog } from "../hud";
import { runInquiry, type InquiryOption, type InquiryChoice } from "../../inquiry";
import { runRhythmTap } from "../minigames/rhythmTap";
import { unlockLore, showLoreToast } from "../lore";
import { awardShardFragment } from "../../shardFeedback";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../../gbcArt";
import { getAudio } from "../../audio";
import { setSoulState, soulState, type SoulId, SOULS } from "./souls";

/**
 * Declarative arc runner for plateau souls.
 *
 * Each `SoulArc` is an ordered list of steps. A step can be:
 *  - "dialog"   — show a sequence of dialog lines (always advances)
 *  - "inquiry"  — present choices; advance only if chosen choice is in advanceOn
 *  - "rhythm"   — run a rhythm-tap; advance only on hits >= required
 *  - "idle"     — require the player to stand still for N ms (advances or aborts)
 *  - "witness"  — require save.verbs.witness; otherwise show hint and abort
 *
 * `save.souls[id]` tracks the current step index. Re-entering an in-progress
 * arc resumes at that index. On final step success, `onComplete` fires (which
 * typically awards lore + stats and marks the soul "done" by setting state to
 * `steps.length + 1`).
 */

export type DialogLine = { who: string; text: string };

export type SoulStep =
  | { kind: "dialog"; lines: DialogLine[] }
  | {
      kind: "inquiry";
      prompt: { who: string; text: string };
      options: InquiryOption[];
      /** Choice values that advance to the next step. Others end the arc here. */
      advanceOn: InquiryChoice[];
      /** Optional reaction lines per non-advancing choice (already shown by inquiry reply). */
    }
  | { kind: "rhythm"; title: string; beats: number[]; required: number }
  | { kind: "idle"; ms: number; prompt: string }
  | { kind: "witness"; lines: DialogLine[]; missingHint: DialogLine };

export type SoulArc = {
  id: SoulId;
  steps: SoulStep[];
  /** Called when the LAST step resolves successfully. */
  onComplete: (scene: Phaser.Scene, save: SaveSlot) => void;
};

const DONE_OFFSET = 1000;

export function isSoulDone(save: SaveSlot, id: SoulId): boolean {
  return soulState(save, id) >= DONE_OFFSET;
}

export function markSoulDone(save: SaveSlot, id: SoulId) {
  setSoulState(save, id, DONE_OFFSET);
  writeSave(save);
}

/**
 * Run (or resume) a soul's arc. Always wraps the calling scene's dialog flow
 * so the caller should set its own `dialogActive` flag and clear it in `onClose`.
 */
export function runSoul(
  scene: Phaser.Scene,
  save: SaveSlot,
  arc: SoulArc,
  onClose: () => void,
) {
  if (isSoulDone(save, arc.id)) {
    // Re-visit reading: short reflective acknowledgment.
    runDialog(scene, [{ who: nameOf(arc.id), text: revisitLine(arc.id) }], onClose);
    return;
  }

  let step = soulState(save, arc.id);
  if (step >= arc.steps.length) step = arc.steps.length - 1;

  const advance = () => {
    const next = step + 1;
    if (next >= arc.steps.length) {
      markSoulDone(save, arc.id);
      arc.onComplete(scene, save);
      writeSave(save);
      onClose();
      return;
    }
    setSoulState(save, arc.id, next);
    writeSave(save);
    onClose();
  };

  const stop = () => {
    // Save current step (no advance) and close.
    setSoulState(save, arc.id, step);
    writeSave(save);
    onClose();
  };

  runStep(scene, save, arc.steps[step], advance, stop);
}

function runStep(
  scene: Phaser.Scene,
  save: SaveSlot,
  s: SoulStep,
  advance: () => void,
  stop: () => void,
) {
  switch (s.kind) {
    case "dialog":
      runDialog(scene, s.lines, advance);
      return;

    case "inquiry":
      runInquiry(scene, s.prompt, s.options, (picked) => {
        if (s.advanceOn.includes(picked.choice)) advance();
        else stop();
      });
      return;

    case "rhythm":
      runRhythmTap(scene, { title: s.title, beats: s.beats }, (r) => {
        if (r.hits >= s.required) advance();
        else stop();
      });
      return;

    case "idle":
      runIdleStep(scene, s.ms, s.prompt, advance, stop);
      return;

    case "witness":
      if (!save.verbs.witness) {
        runDialog(scene, [s.missingHint], stop);
        return;
      }
      runDialog(scene, s.lines, advance);
      return;
  }
}

/** Stand-still timer with a small UI bar. Aborts on any direction press. */
function runIdleStep(
  scene: Phaser.Scene,
  ms: number,
  prompt: string,
  onDone: () => void,
  onAbort: () => void,
) {
  const boxW = GBC_W - 24;
  const box = drawGBCBox(scene, 12, 60, boxW, 28, 800);
  const title = new GBCText(scene, 16, 64, prompt.toUpperCase(), {
    color: COLOR.textAccent,
    depth: 801,
    scrollFactor: 0,
    maxWidthPx: boxW - 8,
  });
  const bar = scene.add
    .rectangle(16, 80, 0, 3, 0xffe098, 1)
    .setOrigin(0, 0.5)
    .setScrollFactor(0)
    .setDepth(801);
  const maxW = boxW - 8;

  const start = scene.time.now;
  let cancelled = false;

  const cleanup = () => {
    timer.remove(false);
    box.destroy();
    title.destroy();
    bar.destroy();
    scene.events.off("vinput-down", abort);
  };

  const abort = () => {
    if (cancelled) return;
    cancelled = true;
    cleanup();
    getAudio().sfx("miss");
    onAbort();
  };

  // Cancel if player moves (vinput emits direction events from touchpad too)
  scene.events.on("vinput-down", abort);

  const timer = scene.time.addEvent({
    delay: 16,
    repeat: -1,
    callback: () => {
      if (cancelled) return;
      const elapsed = scene.time.now - start;
      bar.width = Math.min(maxW, (elapsed / ms) * maxW);
      if (elapsed >= ms) {
        cleanup();
        getAudio().sfx("resolve");
        onDone();
      }
    },
  });
  void GBC_H;
}

function nameOf(id: SoulId): string {
  return SOULS.find((s) => s.id === id)?.name ?? "ECHO";
}

function revisitLine(id: SoulId): string {
  switch (id) {
    case "cartographer":
      return "THE LAST MAP IS DONE. IT POINTS HERE.";
    case "weeping_twin":
      return "SHE LAUGHS. QUIETLY. THANK YOU.";
    case "drowned_poet":
      return "THE SONG IS WHOLE. I CAN STOP NOW.";
    case "mirror_philosopher":
      return "THE POOL IS A POOL. THANK YOU.";
    case "collector":
      return "THE JAR IS FULL ENOUGH.";
    case "sleeper":
      return "STILL SLEEPING. PEACEFULLY NOW.";
    case "walking_saint":
      return "KIND OF YOU. STILL NO, THOUGH.";
    case "composer":
      return "I HEARD IT. I HEARD IT.";
    case "crowned_one":
      return "YES. YES. THE CROWN WAS PAPER.";
    case "stonechild":
      return "MY NAME. I HAVE IT NOW.";
    case "lantern_mathematician":
      return "NEITHER. OF COURSE. OF COURSE.";
    case "weighed_heart":
      return "LIGHTER NOW. GO ON.";
    case "lampkeeper_echo":
      return "A FAINTER VERSION OF SOMEONE.";
  }
}

/** Award helper used by arc onComplete callbacks. */
export function awardSoul(
  scene: Phaser.Scene,
  save: SaveSlot,
  opts: {
    loreId?: string;
    stats?: { clarity?: number; compassion?: number; courage?: number };
    shardFragments?: number;
    flag?: string;
  },
) {
  if (opts.loreId && unlockLore(save, opts.loreId)) showLoreToast(scene, opts.loreId);
  if (opts.stats?.clarity) save.stats.clarity += opts.stats.clarity;
  if (opts.stats?.compassion) save.stats.compassion += opts.stats.compassion;
  if (opts.stats?.courage) save.stats.courage += opts.stats.courage;
  if (opts.shardFragments) {
    for (let i = 0; i < opts.shardFragments; i++) {
      awardShardFragment(scene, save, () => `soul_${save.shards.length}_${i}`, {});
    }
  }
  if (opts.flag) save.flags[opts.flag] = true;
  writeSave(save);
  scene.events.emit("stats-changed");
}

/** Bookkeeping: count souls completed (for unlocking world-expansion lore). */
export function soulsCompleted(save: SaveSlot): number {
  let n = 0;
  for (const s of SOULS) if (isSoulDone(save, s.id)) n++;
  return n;
}
