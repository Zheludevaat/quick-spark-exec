/**
 * 2.5 — Coda: The Sealed Vessel.
 *
 * One choice: what to inscribe. The inscription is read by Act 3.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, gbcWipe, spawnMotes } from "../gbcArt";
import type { SaveSlot } from "../types";
import { attachHUD, runDialog } from "./hud";
import { writeSave } from "../save";
import { runInquiry } from "../inquiry";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";

const INSCRIPTIONS: Record<"strong" | "gentle" | "fractured", string> = {
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

    runDialog(
      this,
      [
        { who: "SORYN", text: "Inscribe the seal. One sentence." },
        { who: "ROWAN", text: "(I choose what to carry forward.)" },
      ],
      () => this.choose(),
    );
  }

  private choose() {
    const wedding = this.save.weddingType ?? "fractured";
    const default_ = INSCRIPTIONS[wedding];
    runInquiry(
      this,
      { who: "VESSEL", text: `Inscribe: "${default_}"?` },
      [
        { choice: "confess", label: "INSCRIBE AS GIVEN", reply: "The metal cools." },
        {
          choice: "ask",
          label: "I AM THE WORK.",
          reply: "Bold. The seal accepts it.",
        },
        {
          choice: "silent",
          label: "WE ARE THE WORK.",
          reply: "Generous. The seal accepts it.",
        },
        {
          choice: "observe",
          label: "THE WORK IS UNFINISHED. GOOD.",
          reply: "Honest. The seal accepts it.",
        },
      ],
      (p) => {
        const inscription =
          p.choice === "confess"
            ? default_
            : p.choice === "ask"
              ? INSCRIPTIONS.strong
              : p.choice === "silent"
                ? INSCRIPTIONS.gentle
                : INSCRIPTIONS.fractured;
        this.save.act2Inscription = inscription;
        unlockLore(this.save, "on_the_sealed_vessel");
        showLoreToast(this, "on_the_sealed_vessel");
        writeSave(this.save);
        this.toAct3();
      },
    );
  }

  private toAct3() {
    runDialog(
      this,
      [
        { who: "SORYN", text: "Act II ends. The work is sealed." },
        { who: "ROWAN", text: "And now the return." },
      ],
      () => {
        this.save.scene = "CuratedSelf";
        writeSave(this.save);
        gbcWipe(this, () => this.scene.start("CuratedSelf", { save: this.save }));
      },
    );
  }
}
