/**
 * SphereTrialScene — shared governor-encounter scaffold.
 *
 * Runs N rounds of inquiries; each picks an option with a weight. Total
 * weight ≥ threshold → pass: garment released, sphere verb unlocked,
 * inscription added to relics, return to Metaxy hub.
 * Fail: drain coherence, route back to plateau for retry.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, gbcWipe, spawnMotes } from "../gbcArt";
import type { SaveSlot, SphereKey } from "../types";
import { writeSave } from "../save";
import { attachHUD, runDialog } from "../scenes/hud";
import { askSphere } from "./SpherePlateauScene";
import { getAudio } from "../audio";
import { type SphereConfig, type SphereOption, type SphereVerb, trialPassedKey } from "./types";
import { getSphereConfig } from "./registry";

const VERB_TO_SAVE: Record<SphereVerb, keyof SaveSlot["sphereVerbs"]> = {
  name: "name",
  attune: "attune",
  stand: "stand",
  weigh: "weigh",
  release: "release",
};

export class SphereTrialScene extends Phaser.Scene {
  private save!: SaveSlot;
  private sphere!: SphereKey;
  private cfg!: SphereConfig;
  private score = 0;
  private round = 0;

  constructor() {
    super("SphereTrial");
  }

  init(data: { save: SaveSlot; sphere: SphereKey }) {
    this.save = data.save;
    this.sphere = data.sphere;
    this.cfg = getSphereConfig(this.sphere);
    this.save.scene = this.cfg.trialScene;
    writeSave(this.save);
    this.score = 0;
    this.round = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor(this.cfg.bg);
    this.cameras.main.fadeIn(500);
    spawnMotes(this, { count: 14, color: this.cfg.accent, alpha: 0.6 });

    attachHUD(this, () => this.save.stats);

    new GBCText(this, GBC_W / 2 - 32, 16, `${this.cfg.governor}'S TRIAL`, {
      color: COLOR.textGold,
      depth: 10,
    });

    this.time.delayedCall(400, () =>
      runDialog(this, this.cfg.trialOpening, () => this.runRound()),
    );
  }

  private runRound() {
    if (this.round >= this.cfg.trialRounds.length) return this.resolve();
    const r = this.cfg.trialRounds[this.round];
    this.round += 1;
    askSphere(this, r.prompt, r.options, (picked) => {
      this.applyOption(picked);
      this.score += picked.weight;
      this.runRound();
    });
  }

  private resolve() {
    const max = this.cfg.trialRounds.length * 3;
    const threshold = Math.ceil(max * 0.5);
    if (this.score >= threshold) return this.pass();
    return this.fail();
  }

  private pass() {
    this.save.flags[trialPassedKey(this.sphere)] = true;
    this.save.garmentsReleased = { ...this.save.garmentsReleased, [this.sphere]: true };
    const verbKey = VERB_TO_SAVE[this.cfg.verb];
    this.save.sphereVerbs = { ...this.save.sphereVerbs, [verbKey]: true };
    if (!this.save.relics.includes(this.cfg.inscription)) {
      this.save.relics.push(this.cfg.inscription);
    }
    writeSave(this.save);
    runDialog(this, this.cfg.trialPass, () => {
      gbcWipe(this, () => this.scene.start("MetaxyHub", { save: this.save }));
    });
  }

  private fail() {
    this.save.coherence = Math.max(0, this.save.coherence - 15);
    writeSave(this.save);
    runDialog(this, this.cfg.trialFail, () => {
      gbcWipe(this, () =>
        this.scene.start(this.cfg.plateauScene, { save: this.save, sphere: this.sphere }),
      );
    });
  }

  private applyOption(opt: SphereOption) {
    if (opt.flag) this.save.flags[opt.flag] = true;
    if (opt.conviction) this.save.convictions[opt.conviction] = true;
  }
}
