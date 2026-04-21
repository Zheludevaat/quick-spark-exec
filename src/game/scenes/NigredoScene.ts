/**
 * 2.1 — NIGREDO. The Blackening.
 *
 * Three named shades rise — the Mother-Who-Did-Her-Best, the Self-Who-Said-
 * Yes, and the Inquisitor — and challenge Rowan with the worst version of
 * a memory. Sitting with each shade earns a black stone. Fleeing loses
 * clarity. A "destroyed" outcome (cruelty / over-confession) wastes the
 * shard and registers the salvage_a_shard quest.
 *
 * The selection picker still asks for 3 shards (one is dissolved per
 * shade); shadesEncountered records the outcome so later scenes can read it.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import type { SaveSlot, ShardId } from "../types";
import { attachHUD, runDialog } from "./hud";
import { writeSave } from "../save";
import { runInquiry } from "../inquiry";
import { selectShards, returnToThreshold } from "../athanor/operationScene";
import { awardNamedStone } from "../athanor/operations";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";
import { shardName } from "../athanor/shards";
import { SHADES, pickShades } from "../athanor/shades";
import { activateQuest } from "../sideQuests";

const OPENING = [
  { who: "SORYN", text: "The furnace is cold until you feed it." },
  { who: "SORYN", text: "Three shards. Three ghosts. Sit with each." },
];

const OPENING_RUSHED = [
  { who: "SORYN", text: "Few shards. The fire will work with what you bring." },
];

export class NigredoScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;
  private destroyedAny = false;

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

    this.add.rectangle(GBC_W / 2, GBC_H / 2, 32, 24, 0x000000).setStrokeStyle(1, 0x803010);
    this.add.circle(GBC_W / 2, GBC_H / 2, 6, 0xc04020, 0.7);
    new GBCText(this, GBC_W / 2 - 14, GBC_H / 2 + 14, "FURNACE", {
      color: COLOR.textWarn,
      depth: 5,
    });

    const opening = this.save.shardInventory.length < 3 ? OPENING_RUSHED : OPENING;
    runDialog(this, opening, () => this.beginDissolving());
  }

  private beginDissolving() {
    selectShards(this, this.save, "DISSOLVE WHICH 3?", 3, (picked) => {
      const shadeIds = pickShades(this.save, Math.max(1, picked.length));
      this.runShade(picked, shadeIds, 0, 0);
    });
  }

  private runShade(picked: ShardId[], shadeIds: string[], i: number, sat: number) {
    if (i >= picked.length || i >= shadeIds.length) return this.finish(sat);
    const id = picked[i];
    const shade = SHADES[shadeIds[i]];
    if (!shade) return this.finish(sat);

    runDialog(this, shade.opening, () => {
      const opts = shade.options(this.save);
      runInquiry(
        this,
        shade.prompt,
        opts.map((o) => ({
          choice:
            o.outcome === "sat_with"
              ? "observe"
              : o.outcome === "destroyed"
                ? "confess"
                : "silent",
          label: o.label,
          reply: o.reply,
        })),
        (picked2) => {
          // Resolve outcome by matching label back to options.
          const chosen = opts.find((o) => o.label === picked2.label) ?? opts[0];
          this.save.shadesEncountered[id] = chosen.outcome;
          if (chosen.outcome === "sat_with") {
            awardNamedStone(this, this.save, "black", `sat with ${shade.name}`);
            const bene = shade.benediction?.(this.save);
            const tail = bene
              ? [{ who: shade.name, text: bene }]
              : [];
            writeSave(this.save);
            this.vesselHud.refresh();
            if (tail.length > 0) {
              runDialog(this, tail, () =>
                this.runShade(picked, shadeIds, i + 1, sat + 1),
              );
            } else {
              this.runShade(picked, shadeIds, i + 1, sat + 1);
            }
            return;
          }
          if (chosen.outcome === "destroyed") {
            this.destroyedAny = true;
            // Wasted shard — note the loss for salvage.
            this.save.flags.act2_shard_destroyed = true;
            activateQuest(this, this.save, "salvage_a_shard");
          } else {
            this.save.stats.clarity = Math.max(0, this.save.stats.clarity - 1);
          }
          writeSave(this.save);
          this.vesselHud.refresh();
          this.runShade(picked, shadeIds, i + 1, sat);
        },
      );
    });
  }

  private finish(sat: number) {
    if (sat >= 2) {
      unlockLore(this.save, "on_nigredo");
      showLoreToast(this, "on_nigredo");
    }
    if (this.save.shadesEncountered["inquisitor"] === "sat_with") {
      unlockLore(this.save, "on_the_inquisitor");
    }
    const closing: { who: string; text: string }[] = [];
    if (this.destroyedAny) {
      closing.push({ who: "SORYN", text: "Something burned through. The water may keep it." });
    } else {
      closing.push({ who: "SORYN", text: "Black sediment, settling. Good." });
    }
    runDialog(this, closing, () => returnToThreshold(this, this.save, "nigredo"));
  }
}
