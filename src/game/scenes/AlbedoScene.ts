/**
 * 2.2 — ALBEDO. The Whitening.
 *
 * A rhythm tap whose beats are keyed to the souls Rowan resolved in Act 1
 * (one beat per soul, capped at 8). Each hit = a memory forgiven; each
 * miss = a stain carried forward.
 *
 * Reactivity:
 *  - If `the_unfinished_song` quest is done, the Drowned Bride appears
 *    after the bath and sings the song back (lore + 1 white stone).
 *  - If no shards were dissolved in Nigredo (cruel speedrun), the water
 *    is murky: beats arrive 30% faster (smaller window).
 *  - If `salvage_a_shard` is active, the Bath-Keeper offers it back here.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import type { SaveSlot } from "../types";
import { attachHUD, runDialog, makeRowan, animateRowan, InputState } from "./hud";
import { onActionDown } from "../controls";
import { writeSave } from "../save";
import { runRhythmTap } from "./minigames/rhythmTap";
import { returnToThreshold } from "../athanor/operationScene";
import { awardStoneFx, awardNamedStone } from "../athanor/operations";
import { emitHudStainAdded } from "../ui/hudSignals";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";
import { completeQuest, questStatus } from "../sideQuests";
import { salvageShard } from "../athanor/shards";

const OPENING = [
  { who: "SORYN", text: "The bath is moonlight and salt." },
  { who: "SORYN", text: "Each beat is a forgiveness. Yours, mostly." },
];

const OPENING_MURKY = [
  { who: "SORYN", text: "The water is murky tonight. You did not feed the fire." },
  { who: "SORYN", text: "The beats will come faster. Try to keep up." },
];

const BATH_KEEPER_LINES = [
  { who: "BATH-KEEPER", text: "Cleanliness is not innocence." },
  { who: "BATH-KEEPER", text: "Begin again, anyway." },
];

export class AlbedoScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;
  private murky = false;
  // --- INTERACTIVE PROPERTIES ---
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private inputState!: InputState;
  private isBusy = false;
  private isDone = false;
  private hintText!: GBCText;
  // --- BATH MEMORY (Act 3 pass) ---
  private waterGlow!: Phaser.GameObjects.Arc;
  private waterHighlightBands: Phaser.GameObjects.Rectangle[] = [];
  private bathResultShown = false;
  private keeperSilhouette?: Phaser.GameObjects.Ellipse;
  private keeperReflection?: Phaser.GameObjects.Rectangle;

  constructor() {
    super("Albedo");
  }

  init(d: { save: SaveSlot }) {
    this.save = d.save;
    this.save.scene = "Albedo";
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a1a28");
    spawnMotes(this, { count: 18, color: 0xd0d8e8, alpha: 0.5 });
    attachHUD(this, () => this.save.stats);
    this.vesselHud = mountVesselHud(this, this.save);

    // --- ART UPGRADE: Moonlight & Rippling Marble Bath ---
    const cx = GBC_W / 2;
    const cy = GBC_H / 2 + 10;

    // 1. Deep Night Sky & Cloud Layer
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x050a14, 0x050a14, 0x121c2c, 0x121c2c, 1, 1, 1, 1);
    sky.fillRect(0, 0, GBC_W, 50);

    // 2. The Moon & Ethereal Moonbeam
    this.add.circle(cx, 26, 8, 0xdde6f5).setDepth(1);
    const glow = this.add.circle(cx, 26, 16, 0x88c0e8, 0.4).setDepth(1).setBlendMode("ADD");
    this.tweens.add({ targets: glow, scale: 1.2, alpha: 0.2, duration: 2500, yoyo: true, repeat: -1 });

    const moonBeam = this.add
      .polygon(cx, 60, [-10, -40, 10, -40, 40, 30, -40, 30], 0x88c0e8, 0.15)
      .setDepth(2)
      .setBlendMode("ADD");
    this.tweens.add({
      targets: moonBeam,
      alpha: 0.05,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // 3. Foreground Architecture (Marble Pillars)
    const arch = this.add.graphics().setDepth(3);
    arch.fillStyle(0x1a2430, 1);
    arch.fillRect(cx - 50, 0, 12, GBC_H);
    arch.fillRect(cx + 38, 0, 12, GBC_H);
    arch.fillStyle(0x2a3440, 1);
    arch.fillRect(cx - 48, 0, 2, GBC_H);
    arch.fillRect(cx + 40, 0, 2, GBC_H);

    // 4. The Marble Bath & Water
    this.add.rectangle(cx, cy, 80, 24, 0x1a2430).setDepth(4);
    this.add.rectangle(cx, cy, 76, 20, 0x2a3440).setDepth(4);
    this.add.rectangle(cx, cy + 2, 76, 16, 0x2a3c58).setDepth(5);

    // Rippling water surface highlights (Additive)
    for (let i = 0; i < 4; i++) {
      const ripple = this.add
        .rectangle(cx, cy - 2 + i * 4, 60 + i * 4, 1, 0x88c0e8, 0.4)
        .setDepth(6)
        .setBlendMode("ADD");
      this.tweens.add({
        targets: ripple,
        scaleX: 1.1,
        alpha: 0.1,
        x: cx + (i % 2 === 0 ? 2 : -2),
        duration: 1200 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }

    new GBCText(this, cx - 12, cy + 20, "BATH", { color: COLOR.textAccent, depth: 7 });

    // Bath memory layer — soft additive water glow + highlight bands
    this.waterGlow = this.add
      .circle(cx, cy + 2, 30, 0x88c0e8, 0.18)
      .setDepth(5)
      .setBlendMode("ADD");
    this.tweens.add({
      targets: this.waterGlow,
      alpha: { from: 0.18, to: 0.08 },
      scale: { from: 1, to: 1.08 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    for (let i = 0; i < 3; i++) {
      const band = this.add
        .rectangle(cx, cy - 4 + i * 5, 64, 1, 0xeaf2ff, 0.35)
        .setDepth(6)
        .setBlendMode("ADD");
      this.waterHighlightBands.push(band);
    }

    // Bath-Keeper presence: low-contrast silhouette at the rim + faint reflection
    this.keeperSilhouette = this.add
      .ellipse(cx + 30, cy - 4, 6, 14, 0x8094b0, 0.35)
      .setDepth(7);
    this.tweens.add({
      targets: this.keeperSilhouette,
      alpha: { from: 0.35, to: 0.18 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.keeperReflection = this.add
      .rectangle(cx + 18, cy + 4, 4, 1, 0xc8d8ee, 0.4)
      .setDepth(6)
      .setBlendMode("ADD");
    // --- END ART UPGRADE ---

    this.murky = this.save.shardsConsumed.length === 0;
    this.applyBathState(); // pre-bath neutral state

    // --- INTERACTIVE UPGRADE ---
    this.rowanShadow = this.add.ellipse(GBC_W / 2, GBC_H - 24, 10, 3, 0x000000, 0.4).setDepth(9);
    this.rowan = makeRowan(this, GBC_W / 2, GBC_H - 26, "soul").setDepth(10);
    this.inputState = new InputState(this);

    this.add.rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85).setOrigin(0, 0).setDepth(199);
    this.hintText = new GBCText(this, 4, GBC_H - 9, "WALK", { color: COLOR.textDim, depth: 200 });

    this.isBusy = true;
    this.time.delayedCall(800, () => {
      const intro = this.murky ? OPENING_MURKY : OPENING;
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
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, GBC_H / 2 + 10, GBC_H - 10);

    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    if (this.isDone) {
      this.hintText.setText("THE BATH IS DONE. WALK SOUTH.");
      this.hintText.setColor(COLOR.textDim);
      if (this.rowan.y >= GBC_H - 12) {
        this.isBusy = true;
        returnToThreshold(this, this.save, "albedo");
      }
    } else {
      if (
        Phaser.Math.Distance.Between(this.rowan.x, this.rowan.y, GBC_W / 2, GBC_H / 2 + 10) < 26
      ) {
        this.hintText.setText("[A] STEP INTO THE WATER");
        this.hintText.setColor(COLOR.textGold);
      } else {
        this.hintText.setText("WALK");
        this.hintText.setColor(COLOR.textDim);
      }
    }
  }

  private tryInteract() {
    if (this.isBusy || this.isDone) return;
    if (Phaser.Math.Distance.Between(this.rowan.x, this.rowan.y, GBC_W / 2, GBC_H / 2 + 10) < 26) {
      this.isBusy = true;
      this.hintText.setText("");
      const sprite = this.rowan.getData("sprite") as Phaser.GameObjects.Sprite | undefined;
      sprite?.play("walk_up");
      this.runBath();
    }
  }

  /** Build beat schedule from soulChoices: one beat per resolved soul, max 8. */
  private buildBeats(): number[] {
    const resolvedCount = Math.max(
      3,
      Math.min(8, Object.keys(this.save.soulChoices).length || this.save.soulsCompleted),
    );
    const beats: number[] = [];
    let t = 600;
    const gap = this.murky ? 480 : 700;
    for (let i = 0; i < resolvedCount; i++) {
      beats.push(t);
      t += gap;
    }
    return beats;
  }

  private runBath() {
    const beats = this.buildBeats();
    const window = this.murky ? 200 : 280;
    runRhythmTap(
      this,
      { title: "FORGIVE", beats, window },
      (r) => {
        const stains = r.total - r.hits;
        if (stains > 0) {
          this.save.stainsCarried += stains;
          // Emit per stain so the HUD plate flashes the newest pip.
          for (let i = 0; i < stains; i++) {
            const next = Math.min(3, this.save.stainsCarried - (stains - 1 - i));
            emitHudStainAdded(this, next);
          }
        }
        if (r.judgment === "great") awardNamedStone(this, this.save, "white", "all forgiven");
        else if (r.judgment === "ok") awardNamedStone(this, this.save, "white", "most forgiven");
        else awardStoneFx(this, this.save, "white", 1);
        writeSave(this.save);
        this.vesselHud.refresh();
        // Aftermath: bath visibly reacts before the Keeper speaks.
        const visualJudgment: "great" | "ok" | "poor" =
          r.judgment === "great" ? "great" : r.judgment === "ok" ? "ok" : "poor";
        this.applyBathState(visualJudgment, this.save.stainsCarried);
        unlockLore(this.save, "on_albedo");
        showLoreToast(this, "on_albedo");
        runDialog(this, BATH_KEEPER_LINES, () => this.maybeSalvage());
      },
    );
  }

  /** Update the bath visuals to reflect the run result + carried stains. */
  private applyBathState(judgment?: "great" | "ok" | "poor", stains = 0) {
    if (!this.waterGlow) return;
    let color = 0x88c0e8;
    let alpha = 0.18;
    let bandAlpha = 0.35;
    let bandColor = 0xeaf2ff;
    if (judgment === "great") {
      color = 0xb8e0ff;
      alpha = 0.32;
      bandAlpha = 0.55;
      bandColor = 0xffffff;
    } else if (judgment === "ok") {
      color = 0x9cd0ee;
      alpha = 0.24;
      bandAlpha = 0.42;
    } else if (judgment === "poor") {
      color = 0x607890;
      alpha = 0.14;
      bandAlpha = 0.2;
      bandColor = 0xa8b4c4;
    }
    // Stains slightly cloud the bath regardless of judgment.
    if (stains > 0) {
      const cloud = Math.min(0.18, stains * 0.06);
      alpha = Math.max(0.06, alpha - cloud);
      bandAlpha = Math.max(0.12, bandAlpha - cloud);
    }
    this.tweens.add({
      targets: this.waterGlow,
      fillColor: color,
      alpha,
      duration: 600,
      ease: "Sine.inOut",
    });
    this.waterGlow.setFillStyle(color, alpha);
    this.waterHighlightBands.forEach((b) => {
      b.setFillStyle(bandColor, bandAlpha);
    });
    if (judgment && !this.bathResultShown) {
      this.bathResultShown = true;
      // Brief inward pulse so the room reads the result instantly.
      this.tweens.add({
        targets: this.waterGlow,
        scale: { from: 1.25, to: 1 },
        duration: 520,
        ease: "Sine.out",
      });
    }
  }

  /** Bath-Keeper offers back a destroyed shard if the salvage quest is active. */
  private maybeSalvage() {
    if (questStatus(this.save, "salvage_a_shard") !== "active" || this.save.shardsConsumed.length === 0) {
      return this.maybeBride();
    }
    runDialog(
      this,
      [
        { who: "BATH-KEEPER", text: "Something rose to the top. Yours, I think." },
        { who: "BATH-KEEPER", text: "Take it. Apologies are not always spoken." },
      ],
      () => {
        // Salvage the most recently destroyed shard.
        const last = this.save.shardsConsumed[this.save.shardsConsumed.length - 1];
        salvageShard(this.save, last);
        this.save.stats.compassion += 1;
        completeQuest(this, this.save, "salvage_a_shard");
        unlockLore(this.save, "on_salvage");
        showLoreToast(this, "on_salvage");
        writeSave(this.save);
        this.vesselHud.refresh();
        this.maybeBride();
      },
    );
  }

  /** Drowned Bride returns if the unfinished song was finished. */
  private maybeBride() {
    if (this.save.sideQuests["the_unfinished_song"] !== "done") {
      return this.exit();
    }
    runDialog(
      this,
      [
        { who: "BRIDE", text: "(She rises from the bath, dripping moonlight.)" },
        { who: "BRIDE", text: "PANSIES ARE FOR THOUGHTS. THANK YOU." },
        { who: "BRIDE", text: "(She sings the rest. The water remembers.)" },
      ],
      () => {
        awardNamedStone(this, this.save, "white", "the bride sang");
        unlockLore(this.save, "on_the_bride_sang");
        showLoreToast(this, "on_the_bride_sang");
        writeSave(this.save);
        this.vesselHud.refresh();
        this.exit();
      },
    );
  }

  private exit() {
    this.isDone = true;
    this.isBusy = false;
  }
}
