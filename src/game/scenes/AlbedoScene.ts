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
import { attachHUD, runDialog } from "./hud";
import { writeSave } from "../save";
import { runRhythmTap } from "./minigames/rhythmTap";
import { returnToThreshold } from "../athanor/operationScene";
import { awardStone, awardNamedStone } from "../athanor/operations";
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

    this.murky = this.save.shardsConsumed.length === 0;
    const intro = this.murky ? OPENING_MURKY : OPENING;
    runDialog(this, intro, () => this.runBath());
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
        this.save.stainsCarried += stains;
        if (r.judgment === "great") awardNamedStone(this, this.save, "white", "all forgiven");
        else if (r.judgment === "ok") awardNamedStone(this, this.save, "white", "most forgiven");
        else awardStone(this.save, "white", 1);
        writeSave(this.save);
        this.vesselHud.refresh();
        unlockLore(this.save, "on_albedo");
        showLoreToast(this, "on_albedo");
        runDialog(this, BATH_KEEPER_LINES, () => this.maybeSalvage());
      },
    );
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
    returnToThreshold(this, this.save, "albedo");
  }
}
