/**
 * Mars scenes — Areon's authored Arena.
 *
 * MarsPlateauScene is now a bespoke exploration scene rather than a thin
 * shared menu wrapper. The player walks through six zones (approach →
 * stands → line yard → infirmary → endurance → threshold). The three core
 * Areon lessons — THE BLOW, THE LINE, THE STANCE — are spatially embodied:
 * the player must stand still on the marked spot for a held interval, no
 * combat, no menu choices. STAND is the verb the sphere is teaching.
 *
 * MarsTrialScene remains the existing authored three-phase trial that
 * presides over the climactic decision rounds with Areon's presentation.
 */
import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  gbcWipe,
  spawnMotes,
  fitSingleLineText,
  measureText,
  drawGBCBox,
} from "../../gbcArt";
import { ACT_BY_SCENE, type SaveSlot } from "../../types";
import { writeSave } from "../../save";
import {
  attachHUD,
  runDialog,
  makeRowan,
  animateRowan,
  InputState,
} from "../../scenes/hud";
import { setSceneSnapshot } from "../../gameUiBridge";
import { onActionDown } from "../../controls";
import {
  createEncounterPresentation,
  type EncounterPresentationHandle,
} from "../../encounters/EncounterPresentation";
import {
  AREON_PROFILE,
  AREON_PHASE_SUBTITLES,
} from "../../encounters/profiles/governors";
import { askSphere } from "../SpherePlateauScene";
import { marsConfig } from "../configs/mars";
import { trialPassedKey, type SphereOption } from "../types";
import { paintMarsRoom } from "../mars/MarsRoomPainter";
import {
  MARS_ZONE_PALETTES,
  type MarsZoneKey,
} from "../mars/MarsPalette";
import {
  createHoldTarget,
  updateHoldTarget,
  type HoldTarget,
} from "../mars/MarsStandMechanics";
import {
  spawnMemoryRing,
  spawnToneOverlay,
  flashResolve,
  type AftermathHandle,
} from "../../visual/ScenicAftermath";

type MarsZone =
  | "approach"
  | "stands"
  | "line_yard"
  | "infirmary"
  | "endurance"
  | "threshold";

const ZONE_LABEL: Record<MarsZone, string> = {
  approach: "Arena Approach",
  stands: "Witness Stands",
  line_yard: "Line Yard",
  infirmary: "Infirmary of the Undefeated",
  endurance: "Chamber of Endurance",
  threshold: "Areon Threshold",
};

const ZONE_IDLE_BODY: Record<MarsZone, string> = {
  approach: "Iron sand. Empty stands. The arena waits without applause.",
  stands: "The crowd has gone home. The blow remains.",
  line_yard: "A line drawn here will outlast every reason for it.",
  infirmary: "Cots, bandages, and the people no triumph could feed.",
  endurance: "Quiet. Heavier than spectacle.",
  threshold: "Areon waits beyond. Nothing here will be impressive.",
};

const FLAG_BLOW = "mars_blow_complete";
const FLAG_LINE = "mars_line_complete";
const FLAG_BESIDE = "mars_beside_complete";

export class MarsPlateauScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private inputState!: InputState;
  private hint!: GBCText;
  private interactPrompt!: GBCText;
  private busy = false;
  private zone: MarsZone = "approach";
  private roomArt?: { destroy(): void };
  private readabilityPass?: { destroy(): void };
  private aftermath: AftermathHandle[] = [];
  private toneOverlay?: AftermathHandle;
  private areonPresentation?: EncounterPresentationHandle;

  // Hold targets — spatial embodiment of THE BLOW / THE LINE / THE STANCE.
  private blowTarget!: HoldTarget;
  private lineTarget!: HoldTarget;
  private besideTarget!: HoldTarget;
  private holdRing?: Phaser.GameObjects.Arc;
  private holdMark?: Phaser.GameObjects.Arc;
  private zoneTitle?: GBCText;
  private zoneSubtitle?: GBCText;

  constructor() {
    super("MarsPlateau");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "MarsPlateau";
    this.save.act = ACT_BY_SCENE.MarsPlateau;
    writeSave(this.save);
    this.busy = false;
    this.zone = "approach";
    this.aftermath = [];
    this.blowTarget = createHoldTarget("blow", 80, 116, 12, 1200);
    this.lineTarget = createHoldTarget("line", 80, 96, 14, 1800);
    this.besideTarget = createHoldTarget("beside", 64, 116, 12, 1400);
    if (this.save.flags[FLAG_BLOW]) this.blowTarget.done = true;
    if (this.save.flags[FLAG_LINE]) this.lineTarget.done = true;
    if (this.save.flags[FLAG_BESIDE]) this.besideTarget.done = true;
  }

  create() {
    // Publish a safe snapshot immediately so the shell never stays in a dead
    // bootstrap state while Mars is being created.
    setSceneSnapshot({
      key: "MarsPlateau",
      label: "Mars - Arena of the Strong",
      act: ACT_BY_SCENE.MarsPlateau ?? 7,
      zone: ZONE_LABEL.approach,
      nodes: null,
      marker: null,
      idleTitle: ZONE_LABEL.approach.toUpperCase(),
      idleBody: ZONE_IDLE_BODY.approach,
      footerHint: null,
      showStatsBar: true,
      showUtilityRail: true,
      showDialogueDock: true,
      showMiniMap: false,
      allowPlayerHub: true,
      showFooter: true,
    });

    try {
      this.bootstrapPlateau();
    } catch (err) {
      console.error("[mars] plateau bootstrap failed", err);
      this.cleanupPlateauScene();

      // Fail safe: do not strand the player on a black screen.
      if (this.scene.manager.keys["MetaxyHub"]) {
        this.scene.start("MetaxyHub", { save: this.save });
      } else {
        this.scene.start("Title");
      }
    }
  }

  private bootstrapPlateau() {
    this.cameras.main.setBackgroundColor("#140708");
    spawnMotes(this, { count: 12, color: 0xb84848, alpha: 0.3 });

    attachHUD(this, () => this.save.stats);

    this.rowanShadow = this.add
      .ellipse(GBC_W / 2, GBC_H - 18, 10, 3, 0x000000, 0.4)
      .setDepth(19);

    this.rowan = makeRowan(this, GBC_W / 2, GBC_H - 20, "soul").setDepth(20);
    this.inputState = new InputState(this);

    this.hint = new GBCText(this, 4, GBC_H - 9, "WALK", {
      color: COLOR.textDim,
      depth: 200,
    });

    this.interactPrompt = new GBCText(this, 0, 0, "", {
      color: COLOR.textGold,
      depth: 60,
    });

    // Load zone only after the shared HUD + actor state exists.
    this.loadZone("approach");

    this.add
      .rectangle(GBC_W / 2, GBC_H - 10, 40, 1, 0xf0c0a0, 0.25)
      .setDepth(9);

    this.areonPresentation = createEncounterPresentation(
      this,
      GBC_W / 2,
      24,
      AREON_PROFILE,
    );

    onActionDown(this, "action", () => this.tryInteract());

    if (!this.save.flags.sphere_mars_seen) {
      this.save.flags.sphere_mars_seen = true;
      writeSave(this.save);
      this.busy = true;
      this.time.delayedCall(450, () => {
        this.areonPresentation?.introOnce(
          "encounter_seen_areon_plateau",
          this.save,
        );
        runDialog(
          this,
          [
            { who: "SORYN", text: "Mars. The Arena of the Strong." },
            {
              who: "AREON",
              text: "This sphere does not ask whether you can win.",
            },
            { who: "AREON", text: "It asks whether you can remain upright." },
          ],
          () => {
            this.busy = false;
          },
        );
      });
    }

    this.events.once("shutdown", () => this.cleanupPlateauScene());
    this.events.once("destroy", () => this.cleanupPlateauScene());
  }

  private cleanupPlateauScene() {
    this.clearAftermath();
    this.clearHoldVisuals();
    this.destroyZoneHeaders();

    this.readabilityPass?.destroy();
    this.readabilityPass = undefined;

    this.roomArt?.destroy();
    this.roomArt = undefined;

    this.areonPresentation?.destroy();
    this.areonPresentation = undefined;
  }

  private buildFallbackRoom(zone: MarsZone): { destroy(): void } {
    const objects: Phaser.GameObjects.GameObject[] = [];

    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      objects.push(obj);
      return obj;
    };

    add(
      this.add
        .rectangle(0, 0, GBC_W, GBC_H, 0x140708, 1)
        .setOrigin(0, 0)
        .setDepth(0),
    );

    add(
      this.add
        .rectangle(0, 18, GBC_W, 60, 0x231014, 0.9)
        .setOrigin(0, 0)
        .setDepth(0),
    );

    add(
      this.add
        .rectangle(0, 96, GBC_W, 48, 0x2b1518, 1)
        .setOrigin(0, 0)
        .setDepth(4),
    );

    if (zone === "approach" || zone === "stands" || zone === "line_yard") {
      for (let i = 0; i < 5; i++) {
        add(
          this.add
            .rectangle(i * 34 - 4, 58, 24, 24 + (i % 3) * 8, 0x402028, 1)
            .setOrigin(0, 0)
            .setDepth(1),
        );
      }
    }

    if (zone === "line_yard") {
      add(
        this.add.rectangle(80, 100, 36, 2, 0xf0c0a0, 0.85).setDepth(6),
      );
    }

    if (zone === "infirmary") {
      add(this.add.rectangle(28, 96, 20, 6, 0x503038, 1).setDepth(6));
      add(this.add.rectangle(80, 96, 20, 6, 0x503038, 1).setDepth(6));
      add(this.add.rectangle(132, 96, 20, 6, 0x503038, 1).setDepth(6));
    }

    if (zone === "threshold") {
      add(
        this.add
          .circle(80, 108, 10, 0xd86060, 0.22)
          .setStrokeStyle(1, 0xf0c0a0, 0.7)
          .setDepth(6),
      );
    }

    return {
      destroy() {
        objects.forEach((o) => o.destroy());
      },
    };
  }

  private buildReadabilityPass(zone: MarsZone): { destroy(): void } {
    const pal = MARS_ZONE_PALETTES[zone as MarsZoneKey];
    const objects: Phaser.GameObjects.GameObject[] = [];

    const color = (hex: string) =>
      Phaser.Display.Color.HexStringToColor(hex).color;

    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      objects.push(obj);
      return obj;
    };

    add(
      this.add
        .rectangle(0, 0, GBC_W, 18, color(pal.bg0), 0.35)
        .setOrigin(0, 0)
        .setDepth(2),
    );

    add(
      this.add
        .rectangle(0, 18, GBC_W, 66, color(pal.bg1), 0.18)
        .setOrigin(0, 0)
        .setDepth(2),
    );

    add(
      this.add
        .rectangle(0, 83, GBC_W, 1, color(pal.trim1), 0.45)
        .setOrigin(0, 0)
        .setDepth(7),
    );

    add(
      this.add
        .rectangle(0, 95, GBC_W, 2, color(pal.trim0), 0.65)
        .setOrigin(0, 0)
        .setDepth(7),
    );

    add(
      this.add
        .rectangle(0, 97, GBC_W, 47, color(pal.floor0), 0.14)
        .setOrigin(0, 0)
        .setDepth(5),
    );

    if (zone === "approach" || zone === "stands" || zone === "line_yard") {
      for (let i = 0; i < 5; i++) {
        add(
          this.add
            .rectangle(
              i * 34 - 4,
              54,
              22,
              26 + (i % 3) * 8,
              color(pal.bg2),
              0.22,
            )
            .setOrigin(0, 0)
            .setDepth(6),
        );
      }
    }

    if (zone === "approach") {
      add(
        this.add
          .rectangle(80, 104, 56, 10, color(pal.trim0), 0.18)
          .setDepth(8),
      );
    }

    if (zone === "stands") {
      for (let i = 0; i < 6; i++) {
        add(
          this.add
            .rectangle(14 + i * 24, 21, 6, 14, color(pal.accent0), 0.16)
            .setOrigin(0, 0)
            .setDepth(8),
        );
      }
    }

    if (zone === "line_yard") {
      add(
        this.add
          .rectangle(80, 96, 42, 2, color(pal.accent1), 0.72)
          .setDepth(9),
      );
      add(
        this.add
          .rectangle(80, 110, 42, 2, color(pal.accent1), 0.5)
          .setDepth(9),
      );
    }

    if (zone === "infirmary") {
      add(
        this.add
          .rectangle(28, 96, 22, 6, color(pal.floor1), 0.45)
          .setDepth(8),
      );
      add(
        this.add
          .rectangle(80, 96, 22, 6, color(pal.floor1), 0.45)
          .setDepth(8),
      );
      add(
        this.add
          .rectangle(132, 96, 22, 6, color(pal.floor1), 0.45)
          .setDepth(8),
      );
    }

    if (zone === "endurance") {
      add(
        this.add
          .rectangle(80, 104, 34, 10, color(pal.trim0), 0.12)
          .setDepth(8),
      );
    }

    if (zone === "threshold") {
      add(
        this.add
          .circle(80, 108, 12, color(pal.accent0), 0.08)
          .setStrokeStyle(1, color(pal.accent1), 0.78)
          .setDepth(9),
      );
    }

    return {
      destroy() {
        objects.forEach((o) => o.destroy());
      },
    };
  }


  private clearAftermath() {
    this.aftermath.forEach((h) => h.destroy());
    this.aftermath = [];
    this.toneOverlay?.destroy();
    this.toneOverlay = undefined;
  }

  private applyAftermath() {
    this.clearAftermath();
    const lessons =
      (this.save.flags[FLAG_BLOW] ? 1 : 0) +
      (this.save.flags[FLAG_LINE] ? 1 : 0) +
      (this.save.flags[FLAG_BESIDE] ? 1 : 0);

    if (lessons === 3) {
      this.toneOverlay = spawnToneOverlay(this, 0xe0a080, 0.08, 22, 122);
    } else if (lessons > 0) {
      this.toneOverlay = spawnToneOverlay(this, 0xb84848, 0.05, 22, 122);
    }

    if (this.zone === "stands" && this.save.flags[FLAG_BLOW]) {
      this.aftermath.push(spawnMemoryRing(this, 80, 116, 0xd86060, 0.22));
    }
    if (this.zone === "line_yard" && this.save.flags[FLAG_LINE]) {
      this.aftermath.push(spawnMemoryRing(this, 80, 96, 0xf0c0a0, 0.22));
    }
    if (this.zone === "infirmary" && this.save.flags[FLAG_BESIDE]) {
      this.aftermath.push(spawnMemoryRing(this, 64, 116, 0xc89090, 0.22));
    }
  }

  private clearHoldVisuals() {
    this.holdRing?.destroy();
    this.holdMark?.destroy();
    this.holdRing = undefined;
    this.holdMark = undefined;
  }

  private buildHoldVisuals() {
    this.clearHoldVisuals();
    let target: HoldTarget | null = null;
    if (this.zone === "stands" && !this.blowTarget.done) target = this.blowTarget;
    else if (this.zone === "line_yard" && !this.lineTarget.done)
      target = this.lineTarget;
    else if (this.zone === "infirmary" && !this.besideTarget.done)
      target = this.besideTarget;
    if (!target) return;

    this.holdMark = this.add
      .circle(target.x, target.y, target.radius, 0xd86060, 0.18)
      .setStrokeStyle(1, 0xf0c0a0, 0.6)
      .setDepth(7);
    this.holdRing = this.add
      .circle(target.x, target.y, 3, 0xf0c0a0, 0.85)
      .setDepth(8);
  }

  private destroyZoneHeaders() {
    this.zoneTitle?.destroy();
    this.zoneSubtitle?.destroy();
    this.zoneTitle = undefined;
    this.zoneSubtitle = undefined;
  }

  private rebuildZoneHeaders() {
    this.destroyZoneHeaders();

    const title = fitSingleLineText("ARENA OF THE STRONG", GBC_W - 12);
    const titleX = Math.floor((GBC_W - measureText(title)) / 2);
    this.zoneTitle = new GBCText(this, titleX, 2, title, {
      color: COLOR.textGold,
      depth: 50,
    });

    const sub = fitSingleLineText(ZONE_LABEL[this.zone].toUpperCase(), GBC_W - 12);
    const subX = Math.floor((GBC_W - measureText(sub)) / 2);
    this.zoneSubtitle = new GBCText(this, subX, 11, sub, {
      color: COLOR.textDim,
      depth: 50,
    });
  }

  private allLessonsComplete(): boolean {
    return (
      !!this.save.flags[FLAG_BLOW] &&
      !!this.save.flags[FLAG_LINE] &&
      !!this.save.flags[FLAG_BESIDE]
    );
  }

  private activeHoldTarget(): HoldTarget | null {
    if (this.zone === "stands" && !this.save.flags[FLAG_BLOW]) return this.blowTarget;
    if (this.zone === "line_yard" && !this.save.flags[FLAG_LINE]) return this.lineTarget;
    if (this.zone === "infirmary" && !this.save.flags[FLAG_BESIDE]) return this.besideTarget;
    return null;
  }

  private isNearTarget(target: HoldTarget, extra = 4): boolean {
    return (
      Phaser.Math.Distance.Between(this.rowan.x, this.rowan.y, target.x, target.y) <
      target.radius + extra
    );
  }

  private loadZone(zone: MarsZone) {
    this.zone = zone;

    this.roomArt?.destroy();
    this.roomArt = undefined;

    this.readabilityPass?.destroy();
    this.readabilityPass = undefined;

    try {
      this.roomArt = paintMarsRoom(this, zone as MarsZoneKey);
    } catch (err) {
      console.error("[mars] room paint failed for zone:", zone, err);
      this.roomArt = this.buildFallbackRoom(zone);
    }

    // Always add a readable structural pass after room painting.
    this.readabilityPass = this.buildReadabilityPass(zone);

    this.applyAftermath();
    this.buildHoldVisuals();

    setSceneSnapshot({
      key: "MarsPlateau",
      label: "Mars - Arena of the Strong",
      act: ACT_BY_SCENE.MarsPlateau ?? 7,
      zone: ZONE_LABEL[zone],
      nodes: null,
      marker: null,
      idleTitle: ZONE_LABEL[zone].toUpperCase(),
      idleBody: ZONE_IDLE_BODY[zone],
      footerHint: null,
      showStatsBar: true,
      showUtilityRail: true,
      showDialogueDock: true,
      showMiniMap: false,
      allowPlayerHub: true,
      showFooter: true,
    });

    this.rebuildZoneHeaders();

    if (this.rowan) {
      this.rowan.setPosition(GBC_W / 2, GBC_H - 24);
    }
  }

  update(_t: number, dt: number) {
    if (this.busy) {
      this.interactPrompt.setText("");
      return;
    }
    if (!this.rowan) return;

    const speed = 0.04 * dt;
    const i = this.inputState.poll();
    let dx = 0;
    let dy = 0;
    if (i.left) dx -= speed;
    if (i.right) dx += speed;
    if (i.up) dy -= speed;
    if (i.down) dy += speed;

    this.rowan.x = Phaser.Math.Clamp(this.rowan.x + dx, 8, GBC_W - 8);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y + dy, 28, GBC_H - 14);
    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    const stable = Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01;

    this.tickHold(this.zone === "stands" ? this.blowTarget : null, dt, stable, () =>
      this.resolveLesson(
        FLAG_BLOW,
        [{ who: "AREON", text: "Taking a blow is not the same as collapsing." }],
        "line_yard",
      ),
    );
    this.tickHold(
      this.zone === "line_yard" ? this.lineTarget : null,
      dt,
      stable,
      () =>
        this.resolveLesson(
          FLAG_LINE,
          [
            {
              who: "AREON",
              text: "A line means nothing if you cross it to feel alive.",
            },
          ],
          "infirmary",
        ),
    );
    this.tickHold(
      this.zone === "infirmary" ? this.besideTarget : null,
      dt,
      stable,
      () =>
        this.resolveLesson(
          FLAG_BESIDE,
          [
            {
              who: "AREON",
              text: "To stand beside is harder than to stand against.",
            },
          ],
          "endurance",
        ),
    );

    const promptText = this.currentPrompt();
    this.interactPrompt.setText(promptText);
    if (promptText) {
      this.interactPrompt.setPosition(this.rowan.x - 14, this.rowan.y - 22);
    }
    this.hint.setText(this.currentHint());
  }

  private tickHold(
    target: HoldTarget | null,
    dt: number,
    stable: boolean,
    onComplete: () => void,
  ) {
    if (!target || target.done) return;
    const inRange =
      Phaser.Math.Distance.Between(this.rowan.x, this.rowan.y, target.x, target.y) <
      target.radius;
    if (this.holdRing) {
      const fill = Phaser.Math.Clamp(target.holdMs / target.needMs, 0, 1);
      this.holdRing.setRadius(2 + fill * (target.radius - 3));
      this.holdRing.setFillStyle(0xf0c0a0, 0.4 + fill * 0.5);
    }
    if (updateHoldTarget(target, dt, inRange, stable)) {
      onComplete();
    }
  }

  private resolveLesson(
    flag: string,
    lines: { who: string; text: string }[],
    nextZone: MarsZone,
  ) {
    if (this.save.flags[flag]) return;
    this.save.flags[flag] = true;
    writeSave(this.save);
    this.busy = true;
    flashResolve(this, this.rowan.x, this.rowan.y, 0xf0c0a0);
    this.areonPresentation?.pulse();
    runDialog(this, lines, () => {
      this.busy = false;
      this.loadZone(nextZone);
    });
  }

  private currentPrompt(): string {
    if (this.zone === "approach") return "[A] ENTER";

    const target = this.activeHoldTarget();
    if (target && this.isNearTarget(target)) {
      if (this.zone === "stands") return "BE STILL";
      if (this.zone === "line_yard") return "HOLD";
      if (this.zone === "infirmary") return "STAND BESIDE";
    }

    if (this.zone === "endurance") return "[A] CONTINUE";
    if (this.zone === "threshold") return "[A] FACE AREON";
    return "";
  }

  private currentHint(): string {
    if (this.zone === "approach") return "APPROACH THE ARENA";
    if (this.zone === "stands") return "TAKE THE BLOW WITHOUT RETALIATION";
    if (this.zone === "line_yard") return "HOLD THE LINE";
    if (this.zone === "infirmary") return "STAND BESIDE, NOT AGAINST";
    if (this.zone === "endurance") return "BREATHE. THIS IS THE LESSON.";
    if (this.zone === "threshold") return "AREON WAITS";
    return "WALK";
  }

  private tryInteract() {
    if (this.busy) return;

    if (this.zone === "approach") {
      this.loadZone("stands");
      return;
    }

    if (this.zone === "endurance") {
      this.loadZone("threshold");
      return;
    }

    if (this.zone === "threshold") {
      if (!this.allLessonsComplete()) {
        this.busy = true;
        runDialog(
          this,
          [
            {
              who: "AREON",
              text: "You have not yet stood through all three lessons.",
            },
          ],
          () => {
            this.busy = false;
          },
        );
        return;
      }

      this.busy = true;
      this.areonPresentation?.pulse();
      runDialog(
        this,
        [
          { who: "AREON", text: "THE BLOW." },
          { who: "AREON", text: "THE LINE." },
          { who: "AREON", text: "THE STANCE." },
          {
            who: "AREON",
            text: "Three blows. Stand, fall, or step aside. I will not be confused.",
          },
        ],
        () => {
          this.save.scene = "MarsTrial";
          writeSave(this.save);
          gbcWipe(this, () =>
            this.scene.start("MarsTrial", { save: this.save }),
          );
        },
      );
    }
  }
}

/**
 * Bespoke Mars trial — three rounds presided by Areon, each introduced by
 * a phase strip (THE BLOW / THE LINE / THE STANCE). Pass = STAND verb +
 * inscription + return to hub. Fail = -15 coherence + return to plateau.
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

    setSceneSnapshot({
      key: "MarsTrial",
      label: "Mars - Areon's Trial",
      act: ACT_BY_SCENE.MarsTrial ?? 6,
      zone: "Trial of STAND",
      nodes: null,
      marker: null,
      idleTitle: "AREON'S TRIAL",
      idleBody: "Three blows. No applause. Only where you place your weight.",
      footerHint: null,
      showStatsBar: true,
      showUtilityRail: false,
      showDialogueDock: true,
      showMiniMap: false,
      allowPlayerHub: false,
      showFooter: false,
    });

    const rawTitle = `${marsConfig.governor}'S TRIAL`;
    const titleText = fitSingleLineText(rawTitle, GBC_W - 12);
    const titleX = Math.floor((GBC_W - measureText(titleText)) / 2);
    new GBCText(this, titleX, 16, titleText, {
      color: COLOR.textGold,
      depth: 10,
    });

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

    box.img.setAlpha(0);
    round.obj.setAlpha(0);
    phase.obj.setAlpha(0);
    this.tweens.add({
      targets: [box.img, round.obj, phase.obj],
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
