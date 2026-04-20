/**
 * 2.1 — NIGREDO. The Blackening.
 *
 * Rowan dissolves shards in the furnace. Each dissolved shard summons a
 * Shade — a memory-figure who challenges her with the worst version of
 * that memory. The right answer (sit with the shame) → black stone.
 *
 * Vertical slice: pick 3 shards → 3 inquiries → 2/3 right = pass.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import type { SaveSlot, ShardId } from "../types";
import { attachHUD, runDialog } from "./hud";
import { writeSave } from "../save";
import { runInquiry } from "../inquiry";
import { selectShards, returnToThreshold } from "../athanor/operationScene";
import { awardStone } from "../athanor/operations";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";
import { shardName } from "../athanor/shards";

const OPENING = [
  { who: "SORYN", text: "The furnace is cold until you feed it." },
  { who: "SORYN", text: "Three shards. Sit with each ghost they call." },
];

const CLOSING = [
  { who: "SORYN", text: "Black sediment, settling. Good." },
];

export class NigredoScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;

  constructor() {
    super("Nigredo");
  }

  init(d: { save: SaveSlot }) {
    this.save = d.save;
    this.save.scene = "Nigredo";
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0608");
    spawnMotes(this, { count: 14, color: 0x402030, alpha: 0.5 });
    attachHUD(this, () => this.save.stats);
    this.vesselHud = mountVesselHud(this, this.save);

    // Furnace glyph
    this.add.rectangle(GBC_W / 2, GBC_H / 2, 32, 24, 0x000000).setStrokeStyle(1, 0x803010);
    this.add.circle(GBC_W / 2, GBC_H / 2, 6, 0xc04020, 0.7);
    new GBCText(this, GBC_W / 2 - 14, GBC_H / 2 + 18, "FURNACE", {
      color: COLOR.textWarn,
      depth: 5,
    });

    runDialog(this, OPENING, () => this.beginDissolving());
  }

  private beginDissolving() {
    selectShards(this, this.save, "DISSOLVE WHICH 3?", 3, (picked) => {
      this.runShades(picked, 0, 0);
    });
  }

  private runShades(picked: ShardId[], i: number, sat: number) {
    if (i >= picked.length) return this.finish(sat);
    const id = picked[i];
    const prompt = {
      who: "SHADE",
      text: `${shardName(id)}. Tell me what you regret.`,
    };
    runInquiry(
      this,
      prompt,
      [
        {
          choice: "observe",
          label: "SIT WITH IT",
          reply: "The shame stays. So do you.",
        },
        {
          choice: "ask",
          label: "DEFEND",
          reply: "The story tightens. The shade fades faster.",
        },
        {
          choice: "confess",
          label: "OVER-CONFESS",
          reply: "Too much. The shade looks bored.",
        },
        {
          choice: "silent",
          label: "TURN AWAY",
          reply: "The shade watches you go.",
        },
      ],
      (picked2) => {
        const sit = picked2.choice === "observe";
        this.save.shadesEncountered[id] = sit ? "sat_with" : "fled";
        if (sit) awardStone(this.save, "black", 1);
        else this.save.stats.clarity = Math.max(0, this.save.stats.clarity - 1);
        writeSave(this.save);
        this.vesselHud.refresh();
        this.runShades(picked, i + 1, sit ? sat + 1 : sat);
      },
    );
  }

  private finish(sat: number) {
    if (sat >= 2) {
      unlockLore(this.save, "on_nigredo");
      showLoreToast(this, "on_nigredo");
    }
    runDialog(this, CLOSING, () => returnToThreshold(this, this.save, "nigredo"));
  }
}
