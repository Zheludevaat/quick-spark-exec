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
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  gbcWipe,
  spawnMotes,
  fitSingleLineState,
  textHeightPx,
  GBC_LINE_H,
} from "../gbcArt";
import { ACT_BY_SCENE, type SaveSlot, type SphereKey } from "../types";
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
  private listStart = 0;
  private visibleRows = 0;
  private rowH = 9;
  private listTop = 30;
  private labelFitW = 0;

  constructor(sceneKey: string = "SpherePlateau") {
    super(sceneKey);
  }

  init(data: { save: SaveSlot; sphere: SphereKey }) {
    this.save = data.save;
    this.sphere = data.sphere;
    this.cfg = getSphereConfig(this.sphere);
    this.save.scene = this.cfg.plateauScene;
    this.save.act = ACT_BY_SCENE[this.cfg.plateauScene];
    writeSave(this.save);
    this.cursor = 0;
    this.busy = false;
    this.stations = [];
    this.stationTexts = [];
  }

  private crackFlag(): string {
    return `sphere_${this.sphere}_cracked`;
  }

  private isCracked(): boolean {
    return !!this.save.flags[this.crackFlag()];
  }

  private requiredOpsForCrack(): number {
    return this.cfg.operations.length;
  }

  private defaultCursorIndex(): number {
    const idx = this.stations.findIndex((s) => {
      if (s.kind === "soul" || s.kind === "op" || s.kind === "crack") {
        return !this.save.flags[s.doneFlag];
      }
      if (s.kind === "trial" || s.kind === "settle") {
        return this.isCracked();
      }
      return false;
    });
    return idx >= 0 ? idx : 0;
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

    const boxX = 6;
    const boxY = 26;
    const boxW = GBC_W - 12;
    const boxH = GBC_H - 50;
    drawGBCBox(this, boxX, boxY, boxW, boxH, 5);

    // Windowed list: stations are menu rows — they MUST stay one line each.
    this.listTop = boxY + 4;
    const usable = boxH - 8;
    this.visibleRows = Math.max(1, Math.min(this.stations.length, Math.floor(usable / this.rowH)));
    this.labelFitW = boxW - 20;
    for (let i = 0; i < this.visibleRows; i++) {
      this.stationTexts.push(
        new GBCText(this, 14, this.listTop + i * this.rowH, "", {
          color: COLOR.textLight,
          depth: 11,
        }),
      );
    }
    this.mark = new GBCText(this, 8, this.listTop, ">", { color: COLOR.textGold, depth: 12 });

    this.hint = new GBCText(this, 6, GBC_H - 14, "A: select   B: hub", {
      color: COLOR.textDim,
      depth: 12,
      maxWidthPx: GBC_W - 12,
    });

    this.cursor = this.defaultCursorIndex();
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

    // Scroll window so cursor stays visible
    const half = Math.floor(this.visibleRows / 2);
    const maxStart = Math.max(0, this.stations.length - this.visibleRows);
    this.listStart = Math.max(0, Math.min(maxStart, this.cursor - half));
    const visibleIdx = this.cursor - this.listStart;
    this.mark.setPosition(8, this.listTop + visibleIdx * this.rowH);

    this.stationTexts.forEach((t, row) => {
      const abs = this.listStart + row;
      const st = this.stations[abs];
      if (!st) {
        t.setText("");
        return;
      }
      let color = COLOR.textLight;
      let suffix = "";

      if ((st.kind === "soul" || st.kind === "op" || st.kind === "crack") && this.save.flags[st.doneFlag]) {
        color = COLOR.textDim;
        suffix = " *";
      }

      if (st.kind === "settle" && !this.isCracked()) {
        color = COLOR.textDim;
        suffix = " -";
      }

      if (abs === this.cursor) color = COLOR.textGold;
      t.setText(fitSingleLineText(st.label + suffix, this.labelFitW));
      t.setColor(color);
    });

    if (s.kind === "trial") {
      this.hint.setText(this.isCracked() ? "A: enter the Trial" : "Answer the Cracking Question first.");
      return;
    }

    if (s.kind === "crack") {
      const done = opsCompleted(
        this.save,
        this.sphere,
        this.cfg.operations.map((o) => o.id),
      );
      const need = this.requiredOpsForCrack();
      this.hint.setText(done >= need ? "A: face the Question" : `More operations needed (${done}/${need})`);
      return;
    }

    if (s.kind === "settle") {
      this.hint.setText(this.isCracked() ? "A: settle here (soft ending)" : "Answer the Cracking Question first.");
      return;
    }

    this.hint.setText("A: select   B: hub");
  }

  private choose() {
    if (this.busy) return;
    const s = this.stations[this.cursor];
    this.busy = true;

    if (s.kind === "soul") return this.runSoul(s.idx, s.doneFlag);
    if (s.kind === "op") return this.runOp(s.idx, s.doneFlag);
    if (s.kind === "crack") return this.runCrack(s.doneFlag);
    if (s.kind === "trial") return this.tryEnterTrial();
    if (s.kind === "settle") return this.trySettle();
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
    const needed = this.requiredOpsForCrack();
    const done = opsCompleted(
      this.save,
      this.sphere,
      this.cfg.operations.map((o) => o.id),
    );

    if (done < needed) {
      getAudio().sfx("cancel");
      runDialog(this, [{ who: "SORYN", text: `Sit with more of the work first. (${done}/${needed})` }], () => {
        this.busy = false;
      });
      return;
    }

    const cq = this.cfg.crackingQuestion;
    askSphere(this, cq.prompt, cq.options, (picked) => {
      this.applyOption(picked);
      this.save.flags[doneFlag] = true;
      writeSave(this.save);
      const trialIdx = this.stations.findIndex((st) => st.kind === "trial");
      this.cursor = trialIdx >= 0 ? trialIdx : this.cursor;
      this.busy = false;
      this.refreshCursor();
    });
  }

  private trySettle() {
    if (!this.isCracked()) {
      getAudio().sfx("cancel");
      runDialog(this, [{ who: "SORYN", text: "Not yet. Answer the question first." }], () => {
        this.busy = false;
      });
      return;
    }
    this.settleHere();
  }

  private tryEnterTrial() {
    if (!this.isCracked()) {
      getAudio().sfx("cancel");
      runDialog(this, [{ who: "SORYN", text: "The question first. Then the trial." }], () => {
        this.busy = false;
      });
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

/**
 * Adapter: SphereOption → InquiryOption. We hand runInquiry the labels it
 * needs and look up the original SphereOption (with its weight) by label.
 */
export function askSphere(
  scene: Phaser.Scene,
  prompt: { who: string; text: string },
  options: SphereOption[],
  onPicked: (opt: SphereOption) => void,
): void {
  const inquiryOpts: InquiryOption[] = options.map((o) => ({
    choice: o.choice ?? "ask",
    label: o.label,
    reply: o.reply,
  }));
  runInquiry(scene, prompt, inquiryOpts, (picked) => {
    const orig = options.find((o) => o.label === picked.label) ?? options[0];
    onPicked(orig);
  });
}
