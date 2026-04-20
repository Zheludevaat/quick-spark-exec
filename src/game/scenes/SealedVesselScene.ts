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
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";
import { completeQuest, questStatus } from "../sideQuests";

const CANONICAL: Record<WeddingType, string> = {
  strong: "I AM THE WORK.",
  gentle: "WE ARE THE WORK.",
  fractured: "THE WORK IS UNFINISHED. GOOD.",
};

export class SealedVesselScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;

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
    this.vesselHud = mountVesselHud(this, this.save);

    this.add.circle(GBC_W / 2, GBC_H / 2, 18, 0x000000).setStrokeStyle(1, 0xc8a060);
    this.add.rectangle(GBC_W / 2, GBC_H / 2, 16, 30, 0x4a2010);
    new GBCText(this, GBC_W / 2 - 26, GBC_H / 2 + 24, "THE SEALED VESSEL", {
      color: COLOR.textGold,
      depth: 5,
    });

    if (this.save.flags.teachers_sentence) {
      const t = new GBCText(this, 6, 18, '"WHAT YOU CALL FAILURE IS A METHOD."', {
        color: COLOR.textGold,
        depth: 5,
        scrollFactor: 0,
      });
      this.tweens.add({
        targets: t.obj,
        alpha: 0,
        duration: 4500,
        delay: 1500,
        onComplete: () => t.destroy(),
      });
    }

    const intro: { who: string; text: string }[] = [
      { who: this.save.sorynReleased ? "ROWAN" : "SORYN", text: "Inscribe the seal. One sentence." },
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
        // Complete release_soryn now that the seal carries the variant.
        if (this.save.sorynReleased && questStatus(this.save, "release_soryn") === "active") {
          completeQuest(this, this.save, "release_soryn");
          unlockLore(this.save, "on_walking_alone");
        }
        writeSave(this.save);
        this.toAct3();
      },
    );
  }

  private toAct3() {
    const lines: { who: string; text: string }[] = [];
    if (this.save.sorynReleased) {
      lines.push({ who: "ROWAN", text: "Act II ends. The work is sealed. I sealed it." });
    } else {
      lines.push({ who: "SORYN", text: "Act II ends. The work is sealed." });
      lines.push({ who: "ROWAN", text: "And now the return." });
    }
    runDialog(this, lines, () => {
      this.save.scene = "CuratedSelf";
      writeSave(this.save);
      gbcWipe(this, () => this.scene.start("CuratedSelf", { save: this.save }));
    });
  }
}
