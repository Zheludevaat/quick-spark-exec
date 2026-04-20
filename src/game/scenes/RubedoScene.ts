/**
 * 2.4 — RUBEDO. The Reddening.
 *
 * Vertical slice: two pairings (Black↔White, Yellow↔Red). Soryn pushes
 * back on each. Holding = strong. Yielding = gentle. Mixing = fractured.
 *
 * Awards red stones as part of the pairing (you forge red here).
 * Releases Soryn if the player chooses it during the second pairing.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import type { SaveSlot, WeddingType } from "../types";
import { attachHUD, runDialog } from "./hud";
import { writeSave } from "../save";
import { runInquiry } from "../inquiry";
import { returnToThreshold } from "../athanor/operationScene";
import { awardStone } from "../athanor/operations";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";

const OPENING = [
  { who: "SORYN", text: "Two thrones. A long table." },
  { who: "SORYN", text: "Marry the opposites. I will argue with you." },
];

export class RubedoScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;
  private holds = 0;
  private yields = 0;

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
    new GBCText(this, GBC_W / 2 - 28, 14, "THE WEDDING", {
      color: COLOR.textWarn,
      depth: 5,
    });
    runDialog(this, OPENING, () => this.firstUnion());
  }

  private firstUnion() {
    runInquiry(
      this,
      { who: "SORYN", text: "Black and white. Pair them?" },
      [
        { choice: "confess", label: "HOLD: SHADOW WEDS PURITY", reply: "She presses. You hold." },
        { choice: "silent", label: "YIELD TO HER ALTERNATIVE", reply: "She nods. The pairing softens." },
      ],
      (p) => {
        if (p.choice === "confess") this.holds++;
        else this.yields++;
        awardStone(this.save, "red", 1);
        this.vesselHud.refresh();
        this.secondUnion();
      },
    );
  }

  private secondUnion() {
    runInquiry(
      this,
      { who: "SORYN", text: "Yellow and red. Mind and heart. Pair them?" },
      [
        { choice: "confess", label: "HOLD: MIND WEDS HEART", reply: "Steady. The room warms." },
        { choice: "silent", label: "YIELD TO HER", reply: "She is pleased. Too pleased?" },
        {
          choice: "ask",
          label: "RELEASE SORYN",
          reply: "THANK YOU. GO HOME. — She becomes a wisp.",
        },
      ],
      (p) => {
        if (p.choice === "ask") {
          this.save.sorynReleased = true;
          unlockLore(this.save, "on_releasing_the_daimon");
          showLoreToast(this, "on_releasing_the_daimon");
        } else if (p.choice === "confess") this.holds++;
        else this.yields++;
        awardStone(this.save, "red", 1);
        this.vesselHud.refresh();
        this.finish();
      },
    );
  }

  private finish() {
    let wedding: WeddingType;
    if (this.holds === 2) wedding = "strong";
    else if (this.yields === 2) wedding = "gentle";
    else wedding = "fractured";
    this.save.weddingType = wedding;
    writeSave(this.save);

    // Thirteenth Soul — gold stone
    if (this.save.soulsCompleted >= 12) {
      this.save.goldStone = true;
      writeSave(this.save);
      runDialog(
        this,
        [
          { who: "GUEST", text: "(They sit at the table. No face.)" },
          { who: "SORYN", text: "The thirteenth came. That is rare." },
        ],
        () => this.closing(wedding),
      );
      unlockLore(this.save, "on_the_thirteenth");
      return;
    }
    this.closing(wedding);
  }

  private closing(wedding: WeddingType) {
    unlockLore(this.save, "on_rubedo");
    showLoreToast(this, "on_rubedo");
    runDialog(
      this,
      [{ who: "SORYN", text: `The wedding was ${wedding}. Seal the vessel.` }],
      () => returnToThreshold(this, this.save, "rubedo"),
    );
  }
}
