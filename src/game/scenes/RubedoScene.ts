/**
 * 2.4 — RUBEDO. The Reddening.
 *
 * Two pairings (Black↔White, Yellow↔Red). For each, Soryn pushes back with
 * an arc-aware rebuttal — HOLD your pairing, YIELD to her, or (if released)
 * walk it through ALONE.
 *
 * Mid-scene, the player may RELEASE Soryn (registers `release_soryn` quest;
 * the second pairing then loses the YIELD option and replaces it with WALK
 * ALONE, which counts as a hold).
 *
 * Thirteenth Soul appears at the table if `soulsCompleted >= 12` →
 * `goldStone = true`, registers `meet_the_thirteenth`.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import type { SaveSlot, WeddingType } from "../types";
import { attachHUD, runDialog, makeRowan, animateRowan, InputState } from "./hud";
import { onActionDown } from "../controls";
import { writeSave } from "../save";
import { runInquiry } from "../inquiry";
import { returnToThreshold } from "../athanor/operationScene";
import { awardNamedStone } from "../athanor/operations";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";
import { PAIRINGS, tallyWedding } from "../athanor/wedding";
import { activateQuest, completeQuest } from "../sideQuests";

const OPENING = [
  { who: "SORYN", text: "Two thrones. A long table." },
  { who: "SORYN", text: "Marry the opposites. I will argue with you." },
];

const OPENING_ALONE = [
  { who: "ROWAN", text: "Two thrones. A long table. No daimon." },
  { who: "ROWAN", text: "Pair the opposites. Argue with myself." },
];

export class RubedoScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;
  private holds = 0;
  private yields = 0;
  private alones = 0;
  // --- INTERACTIVE PROPERTIES ---
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private inputState!: InputState;
  private isBusy = false;
  private isDone = false;
  private hintText!: GBCText;

  constructor() {
    super("Rubedo");
  }

  init(d: { save: SaveSlot }) {
    this.save = d.save;
    this.save.scene = "Rubedo";
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#2a0a08");
    spawnMotes(this, { count: 16, color: 0xb84040, alpha: 0.6 });
    attachHUD(this, () => this.save.stats);
    this.vesselHud = mountVesselHud(this, this.save);

    // Long banquet table
    this.add.rectangle(GBC_W / 2, GBC_H / 2 + 14, 90, 5, 0x6a2818).setStrokeStyle(1, 0x402010).setDepth(1);
    // Twin thrones flanking the table
    this.add.rectangle(GBC_W / 2 - 40, GBC_H / 2 + 4, 14, 22, 0x401010).setStrokeStyle(1, 0xc8a040).setDepth(2);
    this.add.rectangle(GBC_W / 2 + 40, GBC_H / 2 + 4, 14, 22, 0x401010).setStrokeStyle(1, 0xc8a040).setDepth(2);
    // Throne crests
    this.add.circle(GBC_W / 2 - 40, GBC_H / 2 - 8, 2, 0xe8c860).setDepth(3);
    this.add.circle(GBC_W / 2 + 40, GBC_H / 2 - 8, 2, 0xe8c860).setDepth(3);
    // Two candles burning on the table
    [-12, 12].forEach((dx, i) => {
      this.add.rectangle(GBC_W / 2 + dx, GBC_H / 2 + 10, 2, 4, 0xe8d8b0).setDepth(2);
      const flame = this.add.ellipse(GBC_W / 2 + dx, GBC_H / 2 + 6, 2, 4, 0xffc060, 0.9).setDepth(3);
      this.tweens.add({
        targets: flame,
        scaleY: { from: 1, to: 1.5 },
        alpha: { from: 0.9, to: 0.55 },
        duration: 320 + i * 80,
        yoyo: true,
        repeat: -1,
      });
    });
    // Slow-pulsing red veil drape behind the table
    const veil = this.add.rectangle(GBC_W / 2, 28, 120, 6, 0xb84040, 0.45).setDepth(0);
    this.tweens.add({
      targets: veil,
      alpha: { from: 0.45, to: 0.2 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
    });
    new GBCText(this, GBC_W / 2 - 28, 16, "THE WEDDING", {
      color: COLOR.textWarn,
      depth: 5,
    });
    if (this.save.flags.teachers_sentence) {
      const t = new GBCText(this, 6, 22, '"WHAT YOU CALL FAILURE IS A METHOD."', {
        color: COLOR.textGold,
        depth: 5,
        scrollFactor: 0,
      });
      this.tweens.add({
        targets: t.obj,
        alpha: 0,
        duration: 4000,
        delay: 1500,
        onComplete: () => t.destroy(),
      });
    }
    // --- INTERACTIVE UPGRADE ---
    this.rowanShadow = this.add.ellipse(GBC_W / 2, GBC_H - 24, 10, 3, 0x000000, 0.4).setDepth(9);
    this.rowan = makeRowan(this, GBC_W / 2, GBC_H - 26, "soul").setDepth(10);
    this.inputState = new InputState(this);

    this.add.rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85).setOrigin(0, 0).setDepth(199);
    this.hintText = new GBCText(this, 4, GBC_H - 9, "WALK", { color: COLOR.textDim, depth: 200 });

    this.isBusy = true;
    this.time.delayedCall(800, () => {
      const intro = this.save.sorynReleased ? OPENING_ALONE : OPENING;
      runDialog(this, intro, () => {
        this.isBusy = false;
      });
    });

    onActionDown(this, "action", () => this.tryInteract());
    this.events.on("vinput-action", () => this.tryInteract());
  }

  update(_time: number, delta: number) {
    if (this.isBusy) return;
    const speed = 0.03 * delta;
    const i = this.inputState.poll();
    let dx = 0,
      dy = 0;
    if (i.left) dx -= speed;
    if (i.right) dx += speed;
    if (i.up) dy -= speed;
    if (i.down) dy += speed;

    this.rowan.x += dx;
    this.rowan.y += dy;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 20, GBC_W - 20);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, GBC_H / 2 + 14, GBC_H - 10);

    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    if (this.isDone) {
      this.hintText.setText("THE WORK IS DONE. WALK SOUTH.");
      this.hintText.setColor(COLOR.textDim);
      if (this.rowan.y >= GBC_H - 12) {
        this.isBusy = true;
        returnToThreshold(this, this.save, "rubedo");
      }
    } else {
      if (
        Phaser.Math.Distance.Between(this.rowan.x, this.rowan.y, GBC_W / 2, GBC_H / 2 + 14) < 24
      ) {
        this.hintText.setText("[A] SIT AT THE TABLE");
        this.hintText.setColor(COLOR.textGold);
      } else {
        this.hintText.setText("WALK");
        this.hintText.setColor(COLOR.textDim);
      }
    }
  }

  private tryInteract() {
    if (this.isBusy || this.isDone) return;
    if (Phaser.Math.Distance.Between(this.rowan.x, this.rowan.y, GBC_W / 2, GBC_H / 2 + 14) < 24) {
      this.isBusy = true;
      this.hintText.setText("");
      const sprite = this.rowan.getData("sprite") as Phaser.GameObjects.Sprite | undefined;
      sprite?.play("walk_up");
      this.runPairing(0);
    }
  }

  private runPairing(idx: number) {
    if (idx >= PAIRINGS.length) return this.maybeThirteenth();
    const p = PAIRINGS[idx];
    // First, Soryn (or memory of her) prompts.
    const lead = this.save.sorynReleased
      ? { who: "ROWAN", text: p.prompt.text }
      : p.prompt;
    runInquiry(
      this,
      lead,
      this.optionsFor(idx, p),
      (picked) => {
        if (picked.label === "RELEASE SORYN") {
          this.save.sorynReleased = true;
          activateQuest(this, this.save, "release_soryn");
          unlockLore(this.save, "on_releasing_the_daimon");
          showLoreToast(this, "on_releasing_the_daimon");
          writeSave(this.save);
          this.vesselHud.refresh();
          // Re-prompt this same pairing solo.
          runDialog(
            this,
            [
              { who: "SORYN", text: "THANK YOU. GO HOME. — She becomes a wisp." },
              { who: "ROWAN", text: "(The room is quieter. So am I.)" },
            ],
            () => this.runPairing(idx),
          );
          return;
        }
        if (picked.label === p.hold.label) {
          this.holds += 1;
          this.tally(idx, p, "hold", picked.reply);
          return;
        }
        if (picked.label === p.yield.label) {
          this.yields += 1;
          this.tally(idx, p, "yield", picked.reply);
          return;
        }
        // WALK ALONE
        this.alones += 1;
        this.tally(idx, p, "alone", picked.reply);
      },
    );
  }

  private optionsFor(idx: number, p: typeof PAIRINGS[number]) {
    const opts: { choice: "confess" | "silent" | "ask"; label: string; reply: string }[] = [];
    opts.push({ choice: "confess", label: p.hold.label, reply: p.hold.reply });
    if (this.save.sorynReleased) {
      opts.push({
        choice: "ask",
        label: "WALK IT ALONE",
        reply: "You hold both ends of the thread. The wax sets.",
      });
    } else {
      // Soryn's rebuttal as flavor before the YIELD option.
      const reb = p.rebuttal(this.save);
      opts.push({ choice: "silent", label: p.yield.label, reply: `${reb.text} ${p.yield.reply}` });
    }
    // Mid-scene release option, only on the second pairing and only if Soryn present.
    if (idx === 1 && !this.save.sorynReleased) {
      opts.push({
        choice: "ask",
        label: "RELEASE SORYN",
        reply: "THANK YOU. GO HOME.",
      });
    }
    return opts;
  }

  private tally(idx: number, _p: typeof PAIRINGS[number], _kind: string, reply: string) {
    awardNamedStone(this, this.save, "red", `the ${idx === 0 ? "first" : "second"} union`);
    writeSave(this.save);
    this.vesselHud.refresh();
    runDialog(this, [{ who: "SORYN", text: reply }], () => this.runPairing(idx + 1));
  }

  private maybeThirteenth() {
    if (this.save.soulsCompleted >= 12 && !this.save.goldStone) {
      activateQuest(this, this.save, "meet_the_thirteenth");
      this.save.goldStone = true;
      writeSave(this.save);
      this.vesselHud.refresh();
      runDialog(
        this,
        [
          { who: "GUEST", text: "(They sit at the table. No face. No need.)" },
          { who: "SORYN", text: this.save.sorynReleased ? "(silence)" : "The thirteenth came. That is rare." },
        ],
        () => {
          completeQuest(this, this.save, "meet_the_thirteenth");
          unlockLore(this.save, "on_the_thirteenth");
          showLoreToast(this, "on_the_thirteenth");
          this.finish();
        },
      );
      return;
    }
    this.finish();
  }

  private finish() {
    const wedding: WeddingType = tallyWedding(this.holds, this.yields, this.alones);
    this.save.weddingType = wedding;
    writeSave(this.save);
    unlockLore(this.save, "on_rubedo");
    showLoreToast(this, "on_rubedo");
    const closer = this.save.sorynReleased
      ? { who: "ROWAN", text: `The wedding was ${wedding}. Time to seal the vessel.` }
      : { who: "SORYN", text: `The wedding was ${wedding}. Seal the vessel.` };
    runDialog(this, [closer], () => returnToThreshold(this, this.save, "rubedo"));
  }
}
