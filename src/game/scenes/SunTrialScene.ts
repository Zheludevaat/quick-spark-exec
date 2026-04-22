/**
 * SunTrialScene — Helion's trial. The Curated Self confrontation, but
 * extracted from the legacy CuratedSelfScene monolith and slimmed down so
 * the only responsibility here is the three-phase trial.
 *
 * Phase 1 (composed)  — ADDRESS three masks.
 * Phase 2 (fractured) — OBSERVE/WITNESS trustworthy fragments.
 * Phase 3 (exposed)   — verb plan keyed to weddingType (see harvest.ts).
 *
 * Victory routes back to MetaxyHub and lights the Sun garment.
 * The Epilogue is no longer chained from this scene.
 */

import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  spawnMotes,
  fitSingleLineText,
} from "../gbcArt";
import { writeSave } from "../save";
import type { Command, SaveSlot, SceneKey } from "../types";
import { ACT_BY_SCENE } from "../types";
import { attachHUD } from "./hud";
import { getAudio, SONG_BOSS } from "../audio";
import { onActionDown, onDirection } from "../controls";
import { setSceneSnapshot } from "../gameUiBridge";
import {
  openingWhisper,
  phaseTaunt,
  addressReply,
  phase3Plan,
  sorynBark,
  narratorLine,
  type SorynEvent,
} from "../act3/harvest";

type Phase = "composed" | "fractured" | "exposed";

const CMDS: { label: string; cmd: Command }[] = [
  { label: "OBSERVE", cmd: "observe" },
  { label: "ADDRESS", cmd: "address" },
  { label: "REMEMBER", cmd: "remember" },
  { label: "RELEASE", cmd: "release" },
  { label: "WITNESS", cmd: "witness" },
];

export class SunTrialScene extends Phaser.Scene {
  private readonly sceneKey: SceneKey;
  private save!: SaveSlot;
  private phase: Phase = "composed";
  private busy = false;
  private cursor = 0;
  private cmdTexts: GBCText[] = [];
  private cursorMark!: GBCText;
  private stateText!: GBCText;
  private logText!: GBCText;
  private needText!: GBCText;
  private maskIndex = 0;
  private masks: { id: string; label: string; stable: boolean }[] = [];
  private fragments: { x: number; y: number; trustworthy: boolean; lit: boolean }[] = [];
  private witnessHits = 0;
  private addressHits = 0;
  private releaseHits = 0;

  constructor(sceneKey: SceneKey = "SunTrial") {
    super(sceneKey);
    this.sceneKey = sceneKey;
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = this.sceneKey;
    this.save.act = ACT_BY_SCENE[this.sceneKey];
    writeSave(this.save);
    this.phase = "composed";
    this.busy = false;
    this.cursor = 0;
    this.cmdTexts = [];
    this.maskIndex = 0;
    this.masks = [];
    this.fragments = [];
    this.witnessHits = 0;
    this.addressHits = 0;
    this.releaseHits = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor("#06070b");
    this.cameras.main.fadeIn(600);
    getAudio().music.play("boss", SONG_BOSS);

    this.add.rectangle(0, 0, GBC_W, GBC_H, 0x05060f, 1).setOrigin(0, 0);
    spawnMotes(this, { count: 10, color: 0xffd070, alpha: 0.35, depth: 5 });
    spawnMotes(this, { count: 6, color: 0xc8d8ff, alpha: 0.25, depth: 6 });

    const PHASE_BOX_X = 0;
    const PHASE_BOX_Y = 15;
    const PHASE_BOX_W = 106;

    const TRIAL_BOX_W = 46;
    const TRIAL_BOX_X = GBC_W - TRIAL_BOX_W - 4;
    const TRIAL_BOX_Y = 15;

    drawGBCBox(this, PHASE_BOX_X, PHASE_BOX_Y, PHASE_BOX_W, 12);
    this.stateText = new GBCText(
      this,
      PHASE_BOX_X + 4,
      PHASE_BOX_Y + 2,
      fitSingleLineText(this.phaseHeaderLabel(), PHASE_BOX_W - 8),
      {
        color: COLOR.textGold,
        depth: 100,
      },
    );

    drawGBCBox(this, TRIAL_BOX_X, TRIAL_BOX_Y, TRIAL_BOX_W, 12);
    new GBCText(this, TRIAL_BOX_X + 4, TRIAL_BOX_Y + 2, "HELION", {
      color: COLOR.textWarn,
      depth: 100,
    });

    drawGBCBox(this, 0, 72, GBC_W, 34);
    this.logText = new GBCText(this, 4, 77, phaseTaunt("composed", this.save), {
      color: COLOR.textAccent,
      depth: 102,
      maxWidthPx: GBC_W - 10,
    });

    drawGBCBox(this, 0, 108, GBC_W, 28);
    this.needText = new GBCText(this, 4, 108, "", {
      color: COLOR.textDim,
      depth: 103,
      maxWidthPx: GBC_W - 8,
    });

    this.cmdTexts = CMDS.map((c, i) => {
      const x = 18 + (i % 2) * 68;
      const y = 118 + Math.floor(i / 2) * 8;
      return new GBCText(this, x, y, c.label, {
        color: i === 0 ? COLOR.textGold : COLOR.textLight,
        depth: 103,
      });
    });

    this.cursorMark = new GBCText(this, 8, 118, "▶", {
      color: COLOR.textGold,
      depth: 104,
    });

    attachHUD(this, () => this.save.stats);
    this.showWhisper(openingWhisper(this.save));
    this.speak("enter");

    this.setupPhase1();
    this.refreshCursor();
    this.refreshNeeds();
    this.publishSnapshot();

    onDirection(this, (d) => {
      if (this.busy) return;
      if (d === "left" || d === "up")
        this.cursor = (this.cursor - 1 + CMDS.length) % CMDS.length;
      if (d === "right" || d === "down")
        this.cursor = (this.cursor + 1) % CMDS.length;
      this.refreshCursor();
      getAudio().sfx("cursor");
    });

    onActionDown(this, "action", () => this.choose());
  }

  private publishSnapshot() {
    setSceneSnapshot({
      key: this.sceneKey,
      label: "Sun - Helion's Trial",
      act: ACT_BY_SCENE[this.sceneKey],
      zone: `Phase: ${this.phase.toUpperCase()}`,
      nodes: null,
      marker: null,
      idleTitle: "HELION TRIAL",
      idleBody:
        this.phase === "composed"
          ? "Address the polished fronts until they lose control of the light."
          : this.phase === "fractured"
            ? "Witness trustworthy fragments, not merely brilliant ones."
            : "Read the current need state and answer with the right verb.",
      footerHint: "UP / DOWN SELECT VERB · A COMMIT",
      showStatsBar: true,
      showUtilityRail: true,
      showDialogueDock: true,
      showMiniMap: true,
      allowPlayerHub: true,
      showFooter: true,
    });
  }

  private setupPhase1() {
    this.phase = "composed";
    this.masks = [
      { id: "admirable", label: "ADMIRABLE SELF", stable: false },
      { id: "coherent", label: "COHERENT SELF", stable: true },
      { id: "innocent", label: "INNOCENT SELF", stable: true },
    ];
    this.maskIndex = 0;
  }

  private setupPhase2() {
    this.phase = "fractured";
    this.fragments = [
      { x: 52, y: 48, trustworthy: true, lit: true },
      { x: 80, y: 40, trustworthy: false, lit: false },
      { x: 108, y: 48, trustworthy: true, lit: false },
      { x: 80, y: 58, trustworthy: false, lit: false },
    ];
  }

  private setupPhase3() {
    this.phase = "exposed";
  }

  private refreshCursor() {
    this.cmdTexts.forEach((t, i) =>
      t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textLight),
    );
    const x = 8 + (this.cursor % 2) * 68;
    const y = 118 + Math.floor(this.cursor / 2) * 8;
    this.cursorMark.setPosition(x, y);
  }

  private phaseHeaderLabel() {
    switch (this.phase) {
      case "composed":
        return "P1 COMPOSED";
      case "fractured":
        return "P2 FRACTURED";
      case "exposed":
        return "P3 EXPOSED";
    }
  }

  private needSummary() {
    if (this.phase === "composed") {
      const current = this.masks[this.maskIndex];
      return `TARGET ${current.label}`;
    }

    if (this.phase === "fractured") {
      const totalTrue = this.fragments.filter((f) => f.trustworthy).length;
      return `TRUE FRAGMENTS ${this.witnessHits}/${totalTrue}`;
    }

    const plan = phase3Plan(this.save);
    return `W ${Math.min(this.witnessHits, plan.needs.witness)}/${plan.needs.witness}  A ${Math.min(this.addressHits, plan.needs.address)}/${plan.needs.address}  R ${Math.min(this.releaseHits, plan.needs.release)}/${plan.needs.release}`;
  }

  private refreshNeeds() {
    this.stateText.setText(fitSingleLineText(this.phaseHeaderLabel(), 98));
    this.needText.setText(fitSingleLineText(this.needSummary(), GBC_W - 8));
    this.publishSnapshot();
  }

  private showWhisper(text: string) {
    const w = new GBCText(this, 4, 40, text, {
      color: COLOR.textGold,
      depth: 150,
      maxWidthPx: GBC_W - 8,
    });
    this.tweens.add({
      targets: w.obj,
      alpha: 0,
      duration: 1800,
      delay: 2200,
      onComplete: () => w.destroy(),
    });
  }

  private speak(event: SorynEvent) {
    const line = sorynBark(this.save, event) ?? narratorLine(event);
    const t = new GBCText(this, 4, 28, line, {
      color: this.save.sopheneReleased ? COLOR.textGold : COLOR.textAccent,
      depth: 160,
      maxWidthPx: GBC_W - 8,
    });
    this.tweens.add({
      targets: t.obj,
      alpha: 0,
      duration: 1200,
      delay: 1800,
      onComplete: () => t.destroy(),
    });
  }

  private choose() {
    if (this.busy) return;
    this.busy = true;
    const cmd = CMDS[this.cursor].cmd;

    if (this.phase === "composed") return this.handlePhase1(cmd);
    if (this.phase === "fractured") return this.handlePhase2(cmd);
    return this.handlePhase3(cmd);
  }

  private handlePhase1(cmd: Command) {
    if (cmd === "address") {
      this.addressHits++;
      this.logText.setText(addressReply(this.save, this.addressHits));
      this.speak("phase1_hit");
      this.maskIndex = (this.maskIndex + 1) % this.masks.length;
      if (this.addressHits >= 3) {
        this.time.delayedCall(800, () => {
          this.setupPhase2();
          this.refreshNeeds();
          this.logText.setText(phaseTaunt("fractured", this.save));
          this.busy = false;
        });
        return;
      }
      this.refreshNeeds();
      this.busy = false;
      return;
    }

    this.logText.setText(
      "The façade takes the wrong verb as admiration and hardens.",
    );
    getAudio().sfx("miss");
    this.busy = false;
  }

  private handlePhase2(cmd: Command) {
    if (cmd === "observe" || cmd === "witness") {
      const next = this.fragments.find((f) => f.trustworthy && f.lit);
      if (next) {
        next.lit = false;
        this.witnessHits++;
        this.logText.setText(
          `A true fragment is witnessed. ${Math.max(0, 2 - this.witnessHits)} remain.`,
        );
        this.speak("phase2_hit");
      } else {
        this.logText.setText(
          "You found brilliance. Not truth. They are close cousins and poor substitutes.",
        );
      }

      if (this.witnessHits >= 2) {
        this.time.delayedCall(800, () => {
          this.setupPhase3();
          this.witnessHits = 0;
          this.addressHits = 0;
          this.releaseHits = 0;
          this.refreshNeeds();
          this.logText.setText(phaseTaunt("exposed", this.save));
          this.busy = false;
        });
        return;
      }

      // Cycle which trustworthy fragment is currently lit.
      const remaining = this.fragments.filter((f) => f.trustworthy && !f.lit);
      this.fragments.forEach((f, i) => {
        f.lit = i === ((remaining.length + 1) % this.fragments.length);
      });
      this.refreshNeeds();
      this.busy = false;
      return;
    }

    this.logText.setText(
      "The fragments reassemble just long enough to punish abstraction.",
    );
    getAudio().sfx("miss");
    this.busy = false;
  }

  private handlePhase3(cmd: Command) {
    const plan = phase3Plan(this.save);

    if (cmd === "witness" && this.witnessHits < plan.needs.witness) {
      this.witnessHits++;
      this.logText.setText("It is seen without being repaired.");
      this.speak("phase3_hit");
    } else if (cmd === "address" && this.addressHits < plan.needs.address) {
      this.addressHits++;
      this.logText.setText(
        "You name what it was, not what it preferred to be called.",
      );
      this.speak("phase3_hit");
    } else if (cmd === "release" && this.releaseHits < plan.needs.release) {
      this.releaseHits++;
      this.logText.setText("You stop asking the image to survive forever.");
      this.speak("phase3_hit");
    } else {
      this.logText.setText(`Wrong emphasis. Current plan: ${plan.label}.`);
      getAudio().sfx("miss");
      this.refreshNeeds();
      this.busy = false;
      return;
    }

    this.refreshNeeds();

    if (
      this.witnessHits >= plan.needs.witness &&
      this.addressHits >= plan.needs.address &&
      this.releaseHits >= plan.needs.release
    ) {
      this.victory();
      return;
    }

    this.busy = false;
  }

  private victory() {
    this.logText.setText(
      "The Curated Self loses authority over the lighting.",
    );
    this.save.flags.sun_trial_complete = true;
    this.save.flags.plateau_remain = false;
    this.save.garmentsReleased = {
      ...this.save.garmentsReleased,
      sun: true,
    };
    this.save.scene = "MetaxyHub";
    writeSave(this.save);
    this.speak("victory");
    this.time.delayedCall(1200, () => {
      this.scene.start("MetaxyHub", { save: this.save });
    });
  }
}
