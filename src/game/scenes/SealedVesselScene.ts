/**
 * 2.5 — Coda: The Sealed Vessel.
 *
 * Inscription palette is filtered by weddingType + reactive variants:
 *  - Always include the canonical inscription for the player's weddingType.
 *  - If `sorynReleased`: add "AND I WALKED ALONE."
 *  - If `stainsCarried > 0`: add "STAINS AND ALL."
 *  - Otherwise add the other two canonical options as alternates.
 *
 * If the teacher's sentence was earned, it whispers across the top.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, gbcWipe, spawnMotes } from "../gbcArt";
import type { SaveSlot, WeddingType } from "../types";
import { attachHUD, runDialog } from "./hud";
import { writeSave } from "../save";
import { runInquiry } from "../inquiry";

import { unlockLore, showLoreToast } from "./lore";
import { completeQuest, questStatus } from "../sideQuests";

const CANONICAL: Record<WeddingType, string> = {
  strong: "I AM THE WORK.",
  gentle: "WE ARE THE WORK.",
  fractured: "THE WORK IS UNFINISHED. GOOD.",
};

export class SealedVesselScene extends Phaser.Scene {
  private save!: SaveSlot;
  // --- RITUAL CODA (Act 3 pass) ---
  private sealRing!: Phaser.GameObjects.Arc;
  private sealCore!: Phaser.GameObjects.Rectangle;
  private inscriptionBand!: Phaser.GameObjects.Arc;
  private sealGlow!: Phaser.GameObjects.Arc;
  private teacherWhisper?: GBCText;

  constructor() {
    super("SealedVessel");
  }

  init(d: { save: SaveSlot }) {
    this.save = d.save;
    this.save.scene = "SealedVessel";
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#180c08");
    spawnMotes(this, { count: 12, color: 0xc8a060, alpha: 0.5 });
    attachHUD(this, () => this.save.stats);

    // --- STRONGER CENTRAL SEAL IMAGE ---
    const cx = GBC_W / 2;
    const cy = GBC_H / 2;
    // Outer atmospheric glow.
    this.sealGlow = this.add
      .circle(cx, cy, 38, 0xc8a060, 0.12)
      .setDepth(2)
      .setBlendMode("ADD");
    this.tweens.add({
      targets: this.sealGlow,
      alpha: { from: 0.12, to: 0.22 },
      scale: { from: 1, to: 1.08 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    // Inscription band — a wider ring waiting for the chosen sentence.
    this.inscriptionBand = this.add
      .circle(cx, cy, 26, 0x000000, 0)
      .setStrokeStyle(1, 0x886038, 0.7)
      .setDepth(3);
    // Main seal ring.
    this.sealRing = this.add
      .circle(cx, cy, 20, 0x000000, 0)
      .setStrokeStyle(1.5, 0xc8a060, 1)
      .setDepth(4);
    // Vessel core.
    this.sealCore = this.add.rectangle(cx, cy, 14, 28, 0x4a2010).setDepth(5);
    this.sealCore.setStrokeStyle(1, 0x6a3018);
    // Subtle ember.
    const ember = this.add
      .circle(cx, cy + 4, 2, 0xff8040, 0.85)
      .setDepth(6)
      .setBlendMode("ADD");
    this.tweens.add({
      targets: ember,
      alpha: { from: 0.85, to: 0.4 },
      scale: { from: 1, to: 1.4 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
    });

    new GBCText(this, cx - 26, cy + 26, "THE SEALED VESSEL", {
      color: COLOR.textGold,
      depth: 7,
    });

    if (this.save.flags.teachers_sentence) {
      this.teacherWhisper = new GBCText(this, 6, 18, '"WHAT YOU CALL FAILURE IS A METHOD."', {
        color: COLOR.textGold,
        depth: 5,
        scrollFactor: 0,
      });
      // Don't fully fade away — let it linger faintly through the ceremony.
      this.tweens.add({
        targets: this.teacherWhisper.obj,
        alpha: { from: 1, to: 0.35 },
        duration: 4500,
        delay: 1500,
      });
    }

    const intro: { who: string; text: string }[] = [
      { who: this.save.sorynReleased ? "ROWAN" : "SOPHENE", text: "Inscribe the seal. One sentence." },
      { who: "ROWAN", text: "(I choose what to carry forward.)" },
    ];
    runDialog(this, intro, () => this.choose());
  }

  private buildOptions(): { label: string; reply: string }[] {
    const wedding = this.save.weddingType ?? "fractured";
    const canonical = CANONICAL[wedding];
    const opts: { label: string; reply: string }[] = [
      { label: canonical, reply: "The metal cools. The seal accepts it." },
    ];
    if (this.save.sorynReleased) {
      opts.push({
        label: "AND I WALKED ALONE.",
        reply: "Honest. The seal accepts it. The room is quiet.",
      });
    }
    if (this.save.stainsCarried > 0) {
      opts.push({
        label: "STAINS AND ALL.",
        reply: "True. The seal accepts it without flinching.",
      });
    }
    // Pad with other canonical inscriptions until we have at least 3 options.
    const others = (Object.keys(CANONICAL) as WeddingType[])
      .filter((w) => w !== wedding)
      .map((w) => CANONICAL[w]);
    for (const line of others) {
      if (opts.length >= 4) break;
      if (opts.find((o) => o.label === line)) continue;
      opts.push({ label: line, reply: "Bold choice. The seal accepts it." });
    }
    return opts.slice(0, 4);
  }

  private choose() {
    const opts = this.buildOptions();
    runInquiry(
      this,
      { who: "VESSEL", text: "Inscribe which?" },
      opts.map((o, i) => ({
        choice: i === 0 ? "confess" : i === 1 ? "ask" : i === 2 ? "silent" : "observe",
        label: o.label,
        reply: o.reply,
      })),
      (picked) => {
        const chosen = opts.find((o) => o.label === picked.label) ?? opts[0];
        this.save.act2Inscription = chosen.label;
        unlockLore(this.save, "on_the_sealed_vessel");
        showLoreToast(this, "on_the_sealed_vessel");
        if (this.save.sorynReleased && questStatus(this.save, "release_soryn") === "active") {
          completeQuest(this, this.save, "release_soryn");
          unlockLore(this.save, "on_walking_alone");
        }
        writeSave(this.save);
        this.performSeal(chosen.label);
      },
    );
  }

  /** Brief ritual beat: inscription appears, seal closes, motes draw inward. */
  private performSeal(inscription: string) {
    const cx = GBC_W / 2;
    const cy = GBC_H / 2;
    const inscriptionText = new GBCText(this, cx - inscription.length * 2, cy - 38, inscription, {
      color: COLOR.textGold,
      depth: 8,
    });
    inscriptionText.obj.setAlpha(0);
    this.tweens.add({
      targets: inscriptionText.obj,
      alpha: 1,
      y: cy - 42,
      duration: 900,
      ease: "Sine.out",
    });
    this.tweens.add({
      targets: this.sealRing,
      scale: { from: 1, to: 0.85 },
      duration: 900,
      ease: "Sine.inOut",
    });
    this.tweens.add({
      targets: this.inscriptionBand,
      scale: { from: 1, to: 0.92 },
      duration: 900,
      ease: "Sine.inOut",
    });
    this.tweens.add({
      targets: this.sealGlow,
      alpha: 0.45,
      scale: 1.3,
      duration: 700,
      yoyo: true,
    });
    this.time.delayedCall(1100, () => {
      runDialog(
        this,
        [{ who: "VESSEL", text: "(The seal accepts. The metal cools.)" }],
        () => this.toAct3(),
      );
    });
  }

  private toAct3() {
    const lines: { who: string; text: string }[] = [];
    if (this.save.sorynReleased) {
      lines.push({ who: "SOPHENE", text: "I will not follow further. Walk on." });
    } else {
      lines.push({ who: "SOPHENE", text: "The vessel is sealed. The Moon releases you." });
    }
    runDialog(this, lines, () => {
      // METAXY: Moon sphere complete. Release the Moon garment and route
      // back to the Metaxy hub so the player can choose the next ascent.
      this.save.flags.moon_done = true;
      this.save.garmentsReleased = { ...this.save.garmentsReleased, moon: true };
      this.save.scene = "MetaxyHub";
      writeSave(this.save);
      // Final release: brighten the camera before the wipe so it feels
      // like a completed work being let go, not just a route change.
      this.cameras.main.flash(900, 200, 160, 100);
      this.time.delayedCall(400, () => {
        gbcWipe(this, () => this.scene.start("MetaxyHub", { save: this.save }));
      });
    });
  }
}
