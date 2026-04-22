import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  spawnMotes,
  gbcWipe,
} from "../gbcArt";
import type { SaveSlot } from "../types";
import { ACT_BY_SCENE } from "../types";
import { writeSave } from "../save";
import { setSceneSnapshot } from "../gameUiBridge";
import { attachHUD } from "./hud";
import { getAudio } from "../audio";
import { onActionDown, onDirection } from "../controls";

type TrialCommand = "witness" | "name" | "release";

type TrialStep = {
  prompt: string;
  correct: TrialCommand;
  success: string;
  fail: string;
};

const COMMANDS: { label: string; cmd: TrialCommand }[] = [
  { label: "WITNESS", cmd: "witness" },
  { label: "NAME", cmd: "name" },
  { label: "RELEASE", cmd: "release" },
];

const STEPS: TrialStep[] = [
  {
    prompt: "The water offers your face back to you. Do not correct it.",
    correct: "witness",
    success: "You do not interfere. The image settles because it is no longer being forced.",
    fail: "The water clouds. Selenos waits for the verb that does not seize.",
  },
  {
    prompt: "The silver hall asks what the image becomes when pretending ends.",
    correct: "name",
    success: "You name what remains after performance. The chamber answers with stillness.",
    fail: "The hall returns only brightness. It wanted the truer word.",
  },
  {
    prompt: "The reflection asks to be kept forever, polished and intact.",
    correct: "release",
    success: "You let the image pass. The water keeps nothing that must become a door.",
    fail: "The image clings harder. Selenos waits for the loosening verb.",
  },
];

export class MoonTrialScene extends Phaser.Scene {
  private save!: SaveSlot;
  private cursor = 0;
  private stepIndex = 0;
  private busy = false;

  private header!: GBCText;
  private promptText!: GBCText;
  private feedbackText!: GBCText;
  private cursorMark!: GBCText;
  private cmdTexts: GBCText[] = [];

  constructor() {
    super("MoonTrial");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "MoonTrial";
    this.save.act = ACT_BY_SCENE.MoonTrial;
    writeSave(this.save);

    this.cursor = 0;
    this.stepIndex = 0;
    this.busy = false;
    this.cmdTexts = [];
  }

  create() {
    this.cameras.main.setBackgroundColor("#d9dbe8");

    spawnMotes(this, {
      count: 14,
      color: 0xb8c4e8,
      alpha: 0.35,
      driftY: -0.004,
      driftX: 0.002,
      depth: 5,
    });

    drawGBCBox(this, 4, 6, GBC_W - 8, 16, 20);
    this.header = new GBCText(this, 8, 12, "MOON TRIAL · 1/3", {
      color: COLOR.textGold,
      depth: 21,
    });

    drawGBCBox(this, 4, 28, GBC_W - 8, 48, 20);
    this.promptText = new GBCText(this, 8, 34, STEPS[0].prompt, {
      color: COLOR.textAccent,
      depth: 21,
      maxWidthPx: GBC_W - 16,
    });

    drawGBCBox(this, 4, 80, GBC_W - 8, 24, 20);
    this.feedbackText = new GBCText(
      this,
      8,
      86,
      "Choose the verb that lets the image become true.",
      {
        color: COLOR.textDim,
        depth: 21,
        maxWidthPx: GBC_W - 16,
      },
    );

    drawGBCBox(this, 4, 108, GBC_W - 8, 28, 20);
    this.cmdTexts = COMMANDS.map((c, i) => {
      const x = 24 + i * 42;
      return new GBCText(this, x, 118, c.label, {
        color: i === 0 ? COLOR.textGold : COLOR.textLight,
        depth: 21,
      });
    });
    this.cursorMark = new GBCText(this, 12, 118, ">", {
      color: COLOR.textGold,
      depth: 22,
    });

    attachHUD(this, () => this.save.stats);

    setSceneSnapshot({
      key: "MoonTrial",
      label: "Moon - Selenos' Trial",
      act: ACT_BY_SCENE.MoonTrial,
      zone: "Silver Water Hall",
      nodes: null,
      marker: null,
      idleTitle: "SELENOS' TRIAL",
      idleBody: "Witness. Name. Release. Do not repair the image. Let it become true.",
      footerHint: "LEFT / RIGHT SELECT VERB · A COMMIT",
      showStatsBar: true,
      showUtilityRail: true,
      showDialogueDock: true,
      showMiniMap: true,
      allowPlayerHub: true,
      showFooter: true,
    });

    this.refreshCursor();
    this.refreshStep();

    onDirection(this, (d) => {
      if (this.busy) return;
      if (d === "left") this.move(-1);
      if (d === "right") this.move(1);
    });

    onActionDown(this, "action", () => {
      if (this.busy) return;
      this.commit();
    });
    this.events.on("vinput-action", () => {
      if (this.busy) return;
      this.commit();
    });
  }

  private move(delta: number) {
    this.cursor = (this.cursor + delta + COMMANDS.length) % COMMANDS.length;
    getAudio().sfx("cursor");
    this.refreshCursor();
  }

  private refreshCursor() {
    this.cmdTexts.forEach((t, i) =>
      t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textLight),
    );
    this.cursorMark.setPosition(12 + this.cursor * 42, 118);
  }

  private refreshStep() {
    const step = STEPS[this.stepIndex];
    this.header.setText(`MOON TRIAL · ${this.stepIndex + 1}/3`);
    this.promptText.setText(step.prompt);
  }

  private commit() {
    const step = STEPS[this.stepIndex];
    const chosen = COMMANDS[this.cursor].cmd;

    if (chosen === step.correct) {
      getAudio().sfx("resolve");
      this.feedbackText.setText(step.success);

      if (step.correct === "witness") this.save.stats.clarity += 1;
      if (step.correct === "name") this.save.stats.clarity += 1;
      if (step.correct === "release") this.save.stats.compassion += 1;

      this.events.emit("stats-changed");
      writeSave(this.save);

      this.stepIndex += 1;
      if (this.stepIndex >= STEPS.length) {
        this.time.delayedCall(800, () => this.victory());
        return;
      }

      this.time.delayedCall(700, () => {
        this.refreshStep();
        this.feedbackText.setText("The water shifts. Choose again.");
      });
      return;
    }

    getAudio().sfx("miss");
    this.feedbackText.setText(step.fail);
  }

  private victory() {
    this.busy = true;
    this.feedbackText.setText(
      "Selenos yields. The Moon no longer asks you to live inside its reflection.",
    );

    this.save.flags.moon_done = true;
    this.save.flags.moon_trial_complete = true;
    this.save.garmentsReleased = {
      ...this.save.garmentsReleased,
      moon: true,
    };
    this.save.scene = "MetaxyHub";
    this.save.act = ACT_BY_SCENE.MetaxyHub;
    writeSave(this.save);

    getAudio().sfx("open");
    this.time.delayedCall(1000, () => {
      gbcWipe(this, () => this.scene.start("MetaxyHub", { save: this.save }));
    });
  }
}
