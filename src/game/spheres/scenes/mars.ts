/**
 * Mars scenes — Areon-augmented plateau and bespoke trial.
 *
 * The plateau still uses the shared `SpherePlateauScene` station menu, but
 * is wrapped with an Areon encounter presentation so the governor's
 * iron-red hush pulse and intro sting land before the menu opens.
 *
 * The trial is fully bespoke (no longer a thin shell). It runs the three
 * config rounds, but introduces each round with an AREON phase strip —
 * THE BLOW / THE LINE / THE STANCE — and presides with the governor
 * presentation through the whole sequence.
 */
import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  gbcWipe,
  spawnMotes,
  fitSingleLineText,
  measureText,
} from "../../gbcArt";
import { ACT_BY_SCENE, type SaveSlot } from "../../types";
import { writeSave } from "../../save";
import { attachHUD, runDialog } from "../../scenes/hud";
import { SpherePlateauScene, askSphere } from "../SpherePlateauScene";
import { marsConfig } from "../configs/mars";
import { trialPassedKey, type SphereOption } from "../types";
import {
  createEncounterPresentation,
  type EncounterPresentationHandle,
} from "../../encounters/EncounterPresentation";
import {
  AREON_PROFILE,
  AREON_PHASE_SUBTITLES,
} from "../../encounters/profiles/governors";

export class MarsPlateauScene extends SpherePlateauScene {
  private areonPresentation?: EncounterPresentationHandle;

  constructor() {
    super("MarsPlateau");
  }

  init(data: { save: SaveSlot }) {
    super.init({ save: data.save, sphere: "mars" });
  }

  create() {
    super.create();

    // Areon presides over the plateau from the upper-right corner — far
    // enough from the menu to read as architectural pressure rather than
    // a hotspot. Iron-red hush pulse via the AREON_PROFILE introStyle.
    this.areonPresentation = createEncounterPresentation(
      this,
      GBC_W - 22,
      18,
      AREON_PROFILE,
    );

    // First-visit intro is fired by the parent's opening dialog flow already;
    // the encounter sting fires once on top of that and never again.
    this.time.delayedCall(450, () => {
      this.areonPresentation?.introOnce(
        "encounter_seen_areon_plateau",
        (this as unknown as { save: SaveSlot }).save ?? readPlateauSave(this),
      );
    });
  }
}

/**
 * Helper — the SpherePlateauScene base keeps `save` private. We read it via
 * the same scene-data channel the base used to receive it.
 */
function readPlateauSave(scene: Phaser.Scene): SaveSlot {
  // Phaser scenes keep init-data accessible via scene.scene.settings.data.
  const data = (scene.scene.settings as { data?: { save?: SaveSlot } }).data;
  return (data?.save ?? null) as SaveSlot;
}

/**
 * Bespoke Mars trial — Areon presence with per-round phase strips.
 * Mirrors the shared trial scoring contract so save semantics stay
 * identical: pass = trialPassedKey + verb stand + inscription, fail = -15
 * coherence + return to plateau.
 */
export class MarsTrialScene extends Phaser.Scene {
  private save!: SaveSlot;
  private score = 0;
  private round = 0;
  private busy = false;
  private areonPresentation?: EncounterPresentationHandle;

  constructor() {
    super("MarsTrial");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "MarsTrial";
    this.save.act = ACT_BY_SCENE.MarsTrial;
    writeSave(this.save);
    this.score = 0;
    this.round = 0;
    this.busy = false;
  }

  create() {
    this.cameras.main.setBackgroundColor(marsConfig.bg);
    this.cameras.main.fadeIn(500);
    spawnMotes(this, { count: 14, color: marsConfig.accent, alpha: 0.6 });

    attachHUD(this, () => this.save.stats);

    const rawTitle = `${marsConfig.governor}'S TRIAL`;
    const titleText = fitSingleLineText(rawTitle, GBC_W - 12);
    const titleX = Math.floor((GBC_W - measureText(titleText)) / 2);
    new GBCText(this, titleX, 16, titleText, {
      color: COLOR.textGold,
      depth: 10,
    });

    // Areon presence presides at center-back of the arena. Pulse aura.
    this.areonPresentation = createEncounterPresentation(
      this,
      GBC_W / 2,
      GBC_H / 2 - 4,
      AREON_PROFILE,
    );

    this.busy = true;
    this.time.delayedCall(450, () => {
      this.areonPresentation?.introOnce(
        "encounter_seen_areon_trial",
        this.save,
      );
      runDialog(this, marsConfig.trialOpening, () => {
        this.busy = false;
        this.runRound();
      });
    });
  }

  /**
   * Each round opens with a short AREON phase strip — THE BLOW / THE LINE
   * / THE STANCE — so the trial reads as three discrete stances rather
   * than a chain of menu choices.
   */
  private runRound() {
    if (this.round >= marsConfig.trialRounds.length) return this.resolve();
    const r = marsConfig.trialRounds[this.round];
    const phaseLabel =
      AREON_PHASE_SUBTITLES[
        Math.min(this.round, AREON_PHASE_SUBTITLES.length - 1)
      ];
    const idx = this.round;
    this.round += 1;

    this.runPhaseStrip(phaseLabel, idx + 1, () => {
      this.areonPresentation?.pulse();
      askSphere(this, r.prompt, r.options, (picked) => {
        this.applyOption(picked);
        this.score += picked.weight;
        this.runRound();
      });
    });
  }

  /**
   * Phase strip — a compact GBC card showing the round index and the
   * AREON phase subtitle. Holds ~900ms then dissolves.
   */
  private runPhaseStrip(label: string, index: number, onDone: () => void) {
    const w = 110;
    const h = 22;
    const x = Math.floor((GBC_W - w) / 2);
    const y = 36;
    const box = drawGBCBox(this, x, y, w, h, 80);
    const round = new GBCText(this, x + 6, y + 4, `ROUND ${index} / 3`, {
      color: COLOR.textDim,
      depth: 81,
      maxWidthPx: w - 12,
    });
    const phase = new GBCText(this, x + 6, y + 12, label, {
      color: COLOR.textGold,
      depth: 81,
      maxWidthPx: w - 12,
    });

    // Pulse the phase color subtly so the strip reads as ceremonial, not UI.
    const targets: Phaser.GameObjects.GameObject[] = [box, round.obj, phase.obj];
    box.setAlpha(0);
    round.obj.setAlpha(0);
    phase.obj.setAlpha(0);
    this.tweens.add({
      targets,
      alpha: { from: 0, to: 1 },
      duration: 200,
      yoyo: true,
      hold: 900,
      onComplete: () => {
        box.destroy();
        round.destroy();
        phase.destroy();
        onDone();
      },
    });
  }

  private resolve() {
    const max = marsConfig.trialRounds.length * 3;
    const threshold =
      typeof marsConfig.trialPassThreshold === "number"
        ? marsConfig.trialPassThreshold
        : Math.ceil(max * 0.5);
    if (this.score >= threshold) return this.pass();
    return this.fail();
  }

  private pass() {
    this.save.flags[trialPassedKey("mars")] = true;
    this.save.garmentsReleased = {
      ...this.save.garmentsReleased,
      mars: true,
    };
    this.save.sphereVerbs = { ...this.save.sphereVerbs, stand: true };
    if (!this.save.relics.includes(marsConfig.inscription)) {
      this.save.relics.push(marsConfig.inscription);
    }
    writeSave(this.save);

    // Iron memory mark — Areon's verdict left as a slow, low ring.
    this.areonPresentation?.pulse();
    const mark = this.add
      .circle(GBC_W / 2, GBC_H / 2 - 4, 5, AREON_PROFILE.palette.primary, 0.22)
      .setStrokeStyle(1, AREON_PROFILE.palette.glow, 0.6)
      .setDepth(40);
    this.tweens.add({
      targets: mark,
      scale: { from: 1, to: 2.2 },
      alpha: { from: 0.22, to: 0.05 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    runDialog(this, marsConfig.trialPass, () => {
      gbcWipe(this, () => this.scene.start("MetaxyHub", { save: this.save }));
    });
  }

  private fail() {
    this.save.coherence = Math.max(0, this.save.coherence - 15);
    writeSave(this.save);
    runDialog(this, marsConfig.trialFail, () => {
      gbcWipe(this, () =>
        this.scene.start("MarsPlateau", { save: this.save, sphere: "mars" }),
      );
    });
  }

  private applyOption(opt: SphereOption) {
    if (opt.flag) this.save.flags[opt.flag] = true;
    if (opt.conviction) this.save.convictions[opt.conviction] = true;
  }
}
