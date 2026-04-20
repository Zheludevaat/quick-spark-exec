/**
 * 2.2 — ALBEDO. The Whitening.
 *
 * Vertical slice: a short rhythm tap (uses runRhythmTap). Each hit is a
 * memory forgiven. Misses = stains carried into Citrinitas.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import type { SaveSlot } from "../types";
import { attachHUD, runDialog } from "./hud";
import { writeSave } from "../save";
import { runRhythmTap } from "./minigames/rhythmTap";
import { returnToThreshold } from "../athanor/operationScene";
import { awardStone } from "../athanor/operations";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";

const OPENING = [
  { who: "SORYN", text: "The bath is moonlight and salt." },
  { who: "SORYN", text: "Each beat is a forgiveness. Yours, mostly." },
];

export class AlbedoScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;

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

    this.add.rectangle(GBC_W / 2, GBC_H / 2, 60, 30, 0x506880, 0.6).setStrokeStyle(1, 0xc8d8e8);
    new GBCText(this, GBC_W / 2 - 18, GBC_H / 2 - 22, "BATH OF STARS", {
      color: COLOR.textAccent,
      depth: 5,
    });

    runDialog(this, OPENING, () => this.runBath());
  }

  private runBath() {
    const beats = [600, 1100, 1700, 2400, 3100, 3800];
    runRhythmTap(
      this,
      { title: "FORGIVE", beats, window: 280 },
      (r) => {
        const stains = r.total - r.hits;
        this.save.stainsCarried += stains;
        if (r.judgment === "great") awardStone(this.save, "white", 3);
        else if (r.judgment === "ok") awardStone(this.save, "white", 2);
        else awardStone(this.save, "white", 1);
        writeSave(this.save);
        this.vesselHud.refresh();
        unlockLore(this.save, "on_albedo");
        showLoreToast(this, "on_albedo");
        runDialog(
          this,
          [{ who: "SORYN", text: "Cleanliness is not innocence. Begin again." }],
          () => returnToThreshold(this, this.save, "albedo"),
        );
      },
    );
  }
}
