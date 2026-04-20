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
 * Branching declarative arc runner for plateau souls.
 *
 * Each `SoulArc` is an array of `SoulStep`s. A step can be:
 *  - "dialog"   — show lines (advances).
 *  - "react"    — lines built at runtime from save state (advances).
 *                 Lets souls remember prior choices anywhere in the save.
 *  - "inquiry"  — choices; each can branch to a labeled step or end the arc.
 *                 Choices are recorded into save.soulChoices[id].
 *  - "rhythm"   — rhythm-tap; advance only on hits >= required.
 *  - "idle"     — stand-still timer; aborts on movement.
 *  - "witness"  — requires save.verbs.witness; increments save.witnessUses.
 *  - "gate"     — predicate check; if true → branch label, else → branch elseLabel.
 *  - "set"      — write a flag/choice tag into the ledger (no UI).
 *
 * Each step may carry an optional `label`. Branches reference labels.
 * `ending` on the last reached step decides which `endings[name]` payload pays out.
 *
 * `save.souls[id]` stores the current step INDEX (legacy compatibility).
 * `save.soulChoices[id]` stores the ordered ledger of every recorded tag.
 */

export type DialogLine = { who: string; text: string };

export type Branch = {
  /** Step `label` to jump to. Special value "end" finalises the arc. */
  to: string | "end" | "next";
  /** Optional ending key — selects which `endings[ending]` to pay out on "end". */
  ending?: string;
};

export type StepBase = { label?: string };

export type SoulStep = StepBase &
  (
    | { kind: "dialog"; lines: DialogLine[]; next?: Branch }
    | {
        kind: "react";
        build: (save: SaveSlot) => DialogLine[];
        next?: Branch;
      }
    | {
        kind: "inquiry";
        prompt: { who: string; text: string };
        options: (InquiryOption & { tag?: string; branch?: Branch })[];
        /** Default branch when an option has no explicit branch. */
        defaultBranch?: Branch;
      }
    | { kind: "rhythm"; title: string; beats: number[]; required: number; pass?: Branch; fail?: Branch }
    | { kind: "idle"; ms: number; prompt: string; pass?: Branch; fail?: Branch }
    | { kind: "witness"; lines: DialogLine[]; missingHint: DialogLine; next?: Branch }
    | {
        kind: "gate";
        check: (save: SaveSlot) => boolean;
        pass: Branch;
        fail: Branch;
      }
    | { kind: "set"; flag?: string; tag?: string; next?: Branch }
  );

export type SoulEnding = {
  loreId?: string;
  stats?: { clarity?: number; compassion?: number; courage?: number };
  shardFragments?: number;
  flag?: string;
  /** Side effects: activate/complete quests, etc. */
  effect?: (scene: Phaser.Scene, save: SaveSlot) => void;
};

export type SoulArc = {
  id: SoulId;
  steps: SoulStep[];
  /** Keyed payouts. Inquiry branches set { ending } to pick one. */
  endings: Record<string, SoulEnding>;
  /** Default ending when none specified. */
  defaultEnding: string;
};

const DONE_OFFSET = 1000;

export function isSoulDone(save: SaveSlot, id: SoulId): boolean {
  return soulState(save, id) >= DONE_OFFSET;
}

export function recordChoice(save: SaveSlot, id: SoulId, tag: string) {
  if (!save.soulChoices[id]) save.soulChoices[id] = [];
  save.soulChoices[id].push(tag);
}

export function hasChoice(save: SaveSlot, id: SoulId, tag: string): boolean {
  return !!save.soulChoices[id]?.includes(tag);
}

/** Resolve a label to an index. "next" = current+1, "end" = sentinel -1. */
function resolveBranch(steps: SoulStep[], from: number, b?: Branch): number {
  if (!b) return from + 1;
  if (b.to === "end") return -1;
  if (b.to === "next") return from + 1;
  const idx = steps.findIndex((s) => s.label === b.to);
  return idx >= 0 ? idx : from + 1;
}

/**
 * Run (or resume) a soul's arc. Calls onClose exactly once.
 * Selected ending is paid out when reaching index -1 ("end").
 */
export function runSoul(
  scene: Phaser.Scene,
  save: SaveSlot,
  arc: SoulArc,
  onClose: () => void,
) {
  if (isSoulDone(save, arc.id)) {
    runDialog(scene, [{ who: nameOf(arc.id), text: revisitLine(arc.id, save) }], onClose);
    return;
  }

  let cursor = soulState(save, arc.id);
  if (cursor >= arc.steps.length) cursor = arc.steps.length - 1;
  let pendingEnding = arc.defaultEnding;

  const finish = () => {
    setSoulState(save, arc.id, DONE_OFFSET);
    save.soulsCompleted = (save.soulsCompleted ?? 0) + 1;
    const payout = arc.endings[pendingEnding] ?? arc.endings[arc.defaultEnding];
    payout.effect?.(scene, save);
    awardSoul(scene, save, payout);
    writeSave(save);
    onClose();
  };

  const stepInto = (idx: number) => {
    if (idx < 0 || idx === -1) {
      finish();
      return;
    }
    if (idx >= arc.steps.length) {
      finish();
      return;
    }
    cursor = idx;
    setSoulState(save, arc.id, cursor);
    writeSave(save);
    runStep(scene, save, arc, cursor, (branch, ending) => {
      if (ending) pendingEnding = ending;
      const next = resolveBranch(arc.steps, cursor, branch);
      stepInto(next);
    }, () => {
      // Aborted (e.g. failed rhythm, walked away during idle, missing verb).
      // Save current cursor; close dialog.
      setSoulState(save, arc.id, cursor);
      writeSave(save);
      onClose();
    });
  };

  stepInto(cursor);
}

function runStep(
  scene: Phaser.Scene,
  save: SaveSlot,
  arc: SoulArc,
  idx: number,
  proceed: (branch?: Branch, ending?: string) => void,
  abort: () => void,
) {
  const s = arc.steps[idx];
  switch (s.kind) {
    case "dialog":
      runDialog(scene, s.lines, () => proceed(s.next));
      return;

    case "react": {
      const lines = s.build(save);
      runDialog(scene, lines, () => proceed(s.next));
      return;
    }

    case "inquiry":
      runInquiry(scene, s.prompt, s.options, (picked) => {
        const opt = s.options.find((o) => o === picked) ?? picked;
        const tag = (opt as { tag?: string }).tag;
        if (tag) recordChoice(save, arc.id, tag);
        const branch = (opt as { branch?: Branch }).branch ?? s.defaultBranch;
        proceed(branch, branch?.ending);
      });
      return;

    case "rhythm":
      runRhythmTap(scene, { title: s.title, beats: s.beats }, (r) => {
        if (r.hits >= s.required) proceed(s.pass);
        else if (s.fail) proceed(s.fail);
        else abort();
      });
      return;

    case "idle":
      runIdleStep(scene, s.ms, s.prompt, () => proceed(s.pass), () => {
        if (s.fail) proceed(s.fail);
        else abort();
      });
      return;

    case "witness":
      if (!save.verbs.witness) {
        runDialog(scene, [s.missingHint], abort);
        return;
      }
      save.witnessUses = (save.witnessUses ?? 0) + 1;
      writeSave(save);
      // Auto-unlock witness lore at threshold
      if (save.witnessUses >= 5 && unlockLore(save, "on_witnessing")) {
        showLoreToast(scene, "on_witnessing");
      }
      runDialog(scene, s.lines, () => proceed(s.next));
      return;

    case "gate":
      proceed(s.check(save) ? s.pass : s.fail);
      return;

    case "set":
      if (s.flag) save.flags[s.flag] = true;
      if (s.tag) recordChoice(save, arc.id, s.tag);
      writeSave(save);
      proceed(s.next);
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

/** Revisit lines that vary by which ending the player chose. */
function revisitLine(id: SoulId, save: SaveSlot): string {
  const ledger = save.soulChoices[id] ?? [];
  switch (id) {
    case "cartographer":
      if (ledger.includes("witnessed")) return "THE LAST MAP IS DONE. IT POINTS HERE.";
      return "HE NODS. HE IS STILL DRAWING.";
    case "weeping_twin":
      return "SHE LAUGHS. QUIETLY. THANK YOU.";
    case "drowned_poet":
      return "THE SONG IS WHOLE. I CAN STOP NOW.";
    case "mirror_philosopher":
      if (ledger.includes("agreed")) return "THE POOL AGREES WITH ITSELF, KINDLY.";
      if (ledger.includes("argued")) return "STILL ARGUING WITH HIS REFLECTION. HAPPILY.";
      return "HE IS GONE. THE POOL IS A POOL.";
    case "collector":
      return "THE JAR IS FULL ENOUGH.";
    case "sleeper":
      return "STILL SLEEPING. PEACEFULLY NOW.";
    case "walking_saint":
      if (ledger.includes("forced")) return "SHE LEFT. KINDLY, BUT FIRMLY.";
      return "KIND OF YOU. STILL NO, THOUGH.";
    case "composer":
      return "I HEARD IT. I HEARD IT.";
    case "crowned_one":
      return "YES. YES. THE CROWN WAS PAPER.";
    case "stonechild":
      return "MY NAME. I HAVE IT NOW.";
    case "lantern_mathematician":
      if (ledger.includes("witnessed_neither")) return "NEITHER. OF COURSE. OF COURSE.";
      return "HE COUNTS ON. KINDLY.";
    case "weighed_heart":
      return "LIGHTER NOW. GO ON.";
    case "lampkeeper_echo":
      return "A FAINTER VERSION OF SOMEONE.";
  }
}

/** Pay out an ending. */
export function awardSoul(
  scene: Phaser.Scene,
  save: SaveSlot,
  payout: SoulEnding,
) {
  if (payout.loreId && unlockLore(save, payout.loreId)) showLoreToast(scene, payout.loreId);
  if (payout.stats?.clarity) save.stats.clarity += payout.stats.clarity;
  if (payout.stats?.compassion) save.stats.compassion += payout.stats.compassion;
  if (payout.stats?.courage) save.stats.courage += payout.stats.courage;
  if (payout.shardFragments) {
    for (let i = 0; i < payout.shardFragments; i++) {
      awardShardFragment(scene, save, () => `soul_${save.shards.length}_${i}`, {
        x: GBC_W / 2,
        y: GBC_H / 2,
      });
    }
  }
  if (payout.flag) save.flags[payout.flag] = true;
  writeSave(save);
  scene.events.emit("stats-changed");
}

/** Bookkeeping: total souls completed (recomputed from save). */
export function soulsCompleted(save: SaveSlot): number {
  if (typeof save.soulsCompleted === "number" && save.soulsCompleted > 0) {
    return save.soulsCompleted;
  }
  let n = 0;
  for (const s of SOULS) if (isSoulDone(save, s.id)) n++;
  return n;
}
