/**
 * SpherePlateauScene — shared plateau scaffold for Mercury through Saturn.
 *
 * The scene reads its SphereConfig from `init({ save, sphere })`. It renders:
 *  - opening dialog (first visit)
 *  - a small list of "stations" (3 souls + 4 operations + cracking question)
 *  - a settle/exit option once cracking question is answered
 *
 * Reuses runDialog + runInquiry; no new framework. Keeps Phaser overhead low.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, gbcWipe, spawnMotes } from "../gbcArt";
import type { SaveSlot, SphereKey } from "../types";
import { writeSave } from "../save";
import { attachHUD, runDialog } from "../scenes/hud";
import { runInquiry, type InquiryOption } from "../inquiry";
import { onActionDown, onDirection } from "../controls";
import { getAudio } from "../audio";
import {
  type SphereConfig,
  type SphereOption,
  markOpDone,
  opsCompleted,
} from "./types";
import { getSphereConfig } from "./registry";

type Station =
  | { kind: "soul"; idx: number; label: string; doneFlag: string }
  | { kind: "op"; idx: number; label: string; doneFlag: string }
  | { kind: "crack"; label: string; doneFlag: string }
  | { kind: "trial"; label: string }
  | { kind: "settle"; label: string };

export class SpherePlateauScene extends Phaser.Scene {
  private save!: SaveSlot;
  private sphere!: SphereKey;
  private cfg!: SphereConfig;
  private cursor = 0;
  private busy = false;
  private stations: Station[] = [];
  private stationTexts: GBCText[] = [];
  private mark!: GBCText;
  private hint!: GBCText;
  private title!: GBCText;

  constructor() {
    super("SpherePlateau");
  }

  init(data: { save: SaveSlot; sphere: SphereKey }) {
    this.save = data.save;
    this.sphere = data.sphere;
    this.cfg = getSphereConfig(this.sphere);
    this.save.scene = this.cfg.plateauScene;
    writeSave(this.save);
    this.cursor = 0;
    this.busy = false;
    this.stations = [];
    this.stationTexts = [];
  }

  create() {
    this.cameras.main.setBackgroundColor(this.cfg.bg);
    this.cameras.main.fadeIn(500);
    spawnMotes(this, { count: 18, color: this.cfg.accent, alpha: 0.5 });

    attachHUD(this, () => this.save.stats);

    this.title = new GBCText(this, GBC_W / 2 - 36, 16, `${this.cfg.label} PLATEAU`, {
      color: COLOR.textGold,
      depth: 10,
    });

    // Build station list
    this.stations.push(
      ...this.cfg.souls.map((s, i) => ({
        kind: "soul" as const,
        idx: i,
        label: `Soul: ${s.name}`,
        doneFlag: `sphere_${this.sphere}_soul_${s.id}`,
      })),
    );
    this.stations.push(
      ...this.cfg.operations.map((o, i) => ({
        kind: "op" as const,
        idx: i,
        label: `Op: ${o.title}`,
        doneFlag: `sphere_${this.sphere}_op_${o.id}`,
      })),
    );
    this.stations.push({
      kind: "crack",
      label: "The Cracking Question",
      doneFlag: `sphere_${this.sphere}_cracked`,
    });
    this.stations.push({ kind: "trial", label: `>> ${this.cfg.governor}'s Trial` });
    this.stations.push({ kind: "settle", label: "[Settle Here]" });

    drawGBCBox(this, 6, 26, GBC_W - 12, GBC_H - 50, 5);
    this.stations.forEach((s, i) => {
      this.stationTexts.push(
        new GBCText(this, 14, 30 + i * 8, s.label, {
          color: COLOR.textLight,
          depth: 11,
          maxWidthPx: GBC_W - 28,
        }),
      );
    });
    this.mark = new GBCText(this, 8, 30, ">", { color: COLOR.textGold, depth: 12 });

    this.hint = new GBCText(this, 6, GBC_H - 14, "A: select   B: hub", {
      color: COLOR.textDim,
      depth: 12,
    });

    this.refreshCursor();

    onDirection(this, (d) => {
      if (this.busy) return;
      if (d === "up") this.move(-1);
      if (d === "down") this.move(1);
    });
    onActionDown(this, "action", () => this.choose());
    onActionDown(this, "cancel", () => this.toHub());

    if (!this.save.flags[`sphere_${this.sphere}_seen`]) {
      this.save.flags[`sphere_${this.sphere}_seen`] = true;
      writeSave(this.save);
      this.busy = true;
      this.time.delayedCall(400, () =>
        runDialog(this, this.cfg.opening, () => {
          this.busy = false;
        }),
      );
    }
  }

  private move(d: number) {
    this.cursor = (this.cursor + d + this.stations.length) % this.stations.length;
    getAudio().sfx("cursor");
    this.refreshCursor();
  }

  private refreshCursor() {
    const s = this.stations[this.cursor];
    this.mark.setPosition(8, 30 + this.cursor * 8);
    this.stationTexts.forEach((t, i) => {
      const st = this.stations[i];
      let color = COLOR.textLight;
      let suffix = "";
      if ((st.kind === "soul" || st.kind === "op" || st.kind === "crack") && this.save.flags[st.doneFlag]) {
        color = COLOR.textDim;
        suffix = "  *";
      }
      if (i === this.cursor) color = COLOR.textGold;
      const baseLabel = st.kind === "soul" || st.kind === "op" || st.kind === "crack"
        ? st.label
        : st.label;
      t.setText(baseLabel + suffix);
      t.setColor(color);
    });

    if (s.kind === "trial") {
      const ready = !!this.save.flags[`sphere_${this.sphere}_cracked`];
      this.hint.setText(ready ? "A: enter the Trial" : "Answer the Cracking Question first.");
    } else if (s.kind === "settle") {
      this.hint.setText("A: settle here (soft ending)");
    } else {
      this.hint.setText("A: select   B: hub");
    }
  }

  private choose() {
    if (this.busy) return;
    const s = this.stations[this.cursor];
    this.busy = true;
    if (s.kind === "soul") return this.runSoul(s.idx, s.doneFlag);
    if (s.kind === "op") return this.runOp(s.idx, s.doneFlag);
    if (s.kind === "crack") return this.runCrack(s.doneFlag);
    if (s.kind === "trial") return this.tryEnterTrial();
    if (s.kind === "settle") return this.settleHere();
  }

  private runSoul(i: number, doneFlag: string) {
    const soul = this.cfg.souls[i];
    askSphere(this, soul.prompt, soul.options, (picked) => {
      this.applyOption(picked);
      this.save.flags[doneFlag] = true;
      writeSave(this.save);
      this.busy = false;
      this.refreshCursor();
    });
  }

  private runOp(i: number, doneFlag: string) {
    const op = this.cfg.operations[i];
    askSphere(this, op.prompt, op.options, (picked) => {
      this.applyOption(picked);
      if (op.rewardStat && picked.weight >= 2) {
        this.save.stats[op.rewardStat] = Math.min(9, this.save.stats[op.rewardStat] + 1);
      }
      markOpDone(this.save, this.sphere, op.id);
      this.save.flags[doneFlag] = true;
      writeSave(this.save);
      this.busy = false;
      this.refreshCursor();
    });
  }

  private runCrack(doneFlag: string) {
    const opsDone = opsCompleted(
      this.save,
      this.sphere,
      this.cfg.operations.map((o) => o.id),
    );
    if (opsDone < 2) {
      runDialog(this, [{ who: "SORYN", text: "Sit with the operations first. The question waits." }], () => {
        this.busy = false;
      });
      return;
    }
    const cq = this.cfg.crackingQuestion;
    askSphere(this, cq.prompt, cq.options, (picked) => {
      this.applyOption(picked);
      this.save.flags[doneFlag] = true;
      writeSave(this.save);
      this.busy = false;
      this.refreshCursor();
    });
  }

  private tryEnterTrial() {
    if (!this.save.flags[`sphere_${this.sphere}_cracked`]) {
      this.busy = false;
      return;
    }
    gbcWipe(this, () =>
      this.scene.start(this.cfg.trialScene, { save: this.save, sphere: this.sphere }),
    );
  }

  private settleHere() {
    runDialog(
      this,
      this.cfg.settleText.map((t) => ({ who: "?", text: t })),
      () => {
        this.save.plateauSettled = { ...this.save.plateauSettled, [this.sphere]: true };
        this.save.scene = "Epilogue";
        writeSave(this.save);
        gbcWipe(this, () => this.scene.start("Epilogue", { save: this.save }));
      },
    );
  }

  private toHub() {
    if (this.busy) return;
    this.save.scene = "MetaxyHub";
    writeSave(this.save);
    gbcWipe(this, () => this.scene.start("MetaxyHub", { save: this.save }));
  }

  private applyOption(opt: SphereOption) {
    if (opt.flag) this.save.flags[opt.flag] = true;
    if (opt.conviction) this.save.convictions[opt.conviction] = true;
  }
}
