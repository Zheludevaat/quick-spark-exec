/**
 * 2.0 — Threshold of the Athanor.
 *
 * The pivot scene from Act 1 → Act 2. Soryn leads Rowan down the spiral
 * stair. Rowan deposits her shards into the Vessel, learns the new verb
 * TRANSMUTE, and four doors open: NIGREDO, ALBEDO, CITRINITAS, RUBEDO.
 *
 * Players must complete the four operations in order, but can return here
 * between them (the four doors render as "closed/open/done" based on save
 * flags `op_nigredo_done`, `op_albedo_done`, etc.).
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, gbcWipe, spawnMotes } from "../gbcArt";
import { writeSave } from "../save";
import { ACT_BY_SCENE, type SaveSlot, type SceneKey } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog } from "./hud";
import { onActionDown } from "../controls";
import { getAudio, SONG_MOON } from "../audio";
import { deriveInventory, shardName } from "../athanor/shards";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";
import { runInquiry } from "../inquiry";
import { hasChoice } from "./imaginal/soulRunner";
import {
  createEncounterPresentation,
  type EncounterPresentationHandle,
} from "../encounters/EncounterPresentation";
import {
  VESSEL_PROFILE,
  ATHANOR_DOOR_PROFILES,
} from "../encounters/profiles/athanor";

type Door = {
  key: "nigredo" | "albedo" | "citrinitas" | "rubedo";
  label: string;
  scene: SceneKey;
  x: number;
  y: number;
  rect: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Arc;
  lamp: Phaser.GameObjects.Arc;
  lampPulse?: Phaser.Tweens.Tween;
  glowPulse?: Phaser.Tweens.Tween;
  bar?: Phaser.GameObjects.Rectangle;
  seal?: Phaser.GameObjects.Arc;
  tint: number;
};

const DOOR_DEFS: { key: Door["key"]; label: string; scene: SceneKey; tint: number }[] = [
  { key: "nigredo", label: "NIGREDO", scene: "Nigredo", tint: 0x202028 },
  { key: "albedo", label: "ALBEDO", scene: "Albedo", tint: 0xe0e0e8 },
  { key: "citrinitas", label: "CITRINITAS", scene: "Citrinitas", tint: 0xe8c860 },
  { key: "rubedo", label: "RUBEDO", scene: "Rubedo", tint: 0xb84040 },
];

/** Color of the four memory nodes orbiting the vessel — one per operation. */
const NODE_COLORS = [0x3a3a48, 0xe8e8f0, 0xe8c860, 0xd03838] as const;

/** Short return-beats spoken once per stage as the player re-enters. */
const STAGE_BEATS: Record<1 | 2 | 3 | 4, { who: string; text: string }> = {
  1: { who: "SORYN", text: "The vessel has taken the black." },
  2: { who: "SORYN", text: "The vessel brightens. Something was forgiven." },
  3: { who: "SORYN", text: "Yellow gathers along the rim. Meaning condenses." },
  4: { who: "SORYN", text: "The red has arrived. The vessel waits to be sealed." },
};

const OPENING_LINES = [
  { who: "SORYN", text: "Down the stair, Rowan. The Plateau ends here." },
  { who: "ROWAN", text: "What is this place?" },
  { who: "SORYN", text: "An Athanor. The vessel that will not break what it transmutes." },
  { who: "SORYN", text: "Bring what you carry. Put it into the glass." },
];

const TRANSMUTE_LINES = [
  { who: "SORYN", text: "There is a sixth verb. You have not used it." },
  { who: "SORYN", text: "TRANSMUTE. To turn one thing into another by attention." },
  { who: "ROWAN", text: "Like the verbs before." },
  { who: "SORYN", text: "Worse. The matter is you." },
];

export class AthanorThresholdScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private input2!: InputState;
  private hint!: GBCText;
  private vesselHud!: VesselHud;
  private vessel!: Phaser.GameObjects.Arc;
  private vesselFill!: Phaser.GameObjects.Rectangle;
  private vesselCoreGlow!: Phaser.GameObjects.Arc;
  private vesselRing!: Phaser.GameObjects.Arc;
  private vesselNodes: Phaser.GameObjects.Arc[] = [];
  private workStatus!: GBCText;
  private doors: Door[] = [];
  private busy = false;
  private depositedThisVisit = 0;
  private thresholdStage = 0;
  private vesselPresentation?: EncounterPresentationHandle;
  private doorPresentations: Partial<Record<Door["key"], EncounterPresentationHandle>> = {};

  constructor() {
    super("AthanorThreshold");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "AthanorThreshold";
    // Canonical act mapping — was hard-coded to 2 before.
    this.save.act = ACT_BY_SCENE.AthanorThreshold;
    writeSave(this.save);
  }

  /** How many of the four operations have been completed. */
  private opDoneCount(): number {
    return (["nigredo", "albedo", "citrinitas", "rubedo"] as const).filter(
      (k) => !!this.save.flags[`op_${k}_done`],
    ).length;
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a0e0a");
    spawnMotes(this, { count: 18, color: 0x6a3a2a, alpha: 0.4 });

    // Floor: warm amber radial with checker tile shading
    const floor = this.add.rectangle(GBC_W / 2, GBC_H / 2, GBC_W, GBC_H, 0x2a1810).setDepth(-10);
    void floor;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        if (((r + c) & 1) === 0) continue;
        this.add
          .rectangle(8 + c * 16, 80 + r * 14, 14, 12, 0x3a2218, 0.55)
          .setDepth(-9);
      }
    }
    // Soft warm pool under the vessel
    this.add.ellipse(GBC_W / 2, GBC_H / 2 + 10, 56, 18, 0x6a3010, 0.35).setDepth(-8);

    // Central vessel (alembic glyph). Built in layers so the threshold can
    // physically reflect each completed operation as a memory anchor.
    const vx = GBC_W / 2;
    const vy = GBC_H / 2 + 8;
    // Outer ring: brightens as operations complete.
    this.vesselRing = this.add
      .circle(vx, vy, 13, 0x000000, 0)
      .setStrokeStyle(1, 0x6a4020, 0.55)
      .setDepth(4);
    // Soft core glow: warms up + tints with the latest stage's color.
    this.vesselCoreGlow = this.add.circle(vx, vy + 2, 7, 0x6a3010, 0.25).setDepth(4);
    this.vessel = this.add
      .circle(vx, vy, 9, 0x000000, 0)
      .setStrokeStyle(1, 0xc8a060)
      .setDepth(5);
    this.vesselFill = this.add
      .rectangle(vx, vy + 4, 12, 1, 0x6a3010)
      .setDepth(4)
      .setOrigin(0.5, 1);
    this.refreshVesselFill();
    new GBCText(this, vx - 14, vy - 14, "VESSEL", { color: COLOR.textGold, depth: 5 });

    // Four memory nodes orbiting the vessel — one per completed operation.
    // They all start dim; applyThresholdState() lights them in order.
    NODE_COLORS.forEach((color, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI) / 2; // top, right, bottom, left
      const nx = vx + Math.cos(angle) * 17;
      const ny = vy + Math.sin(angle) * 17;
      const node = this.add
        .circle(nx, ny, 2, color, 0.18)
        .setStrokeStyle(0.5, 0x6a4020, 0.6)
        .setDepth(6);
      this.vesselNodes.push(node);
    });

    // Drifting embers rising from the vessel
    for (let i = 0; i < 6; i++) {
      const ember = this.add
        .circle(vx + (i - 3) * 3, vy - 2, 1, 0xe8a040, 0.85)
        .setDepth(6);
      this.tweens.add({
        targets: ember,
        y: vy - 32,
        alpha: { from: 0.9, to: 0 },
        duration: 1800 + i * 200,
        delay: i * 280,
        repeat: -1,
        ease: "Sine.out",
      });
    }

    // Four doors along the top, color-coded, each with a hanging chain lamp.
    // applyDoorState() handles the visual differentiation between
    // SEALED / AVAILABLE / DONE so the player can read door progress at a glance.
    DOOR_DEFS.forEach((d, i) => {
      const x = 24 + i * 28;
      const y = 24;
      // Chain from the ceiling
      this.add.rectangle(x, 4, 1, 8, 0x6a4020, 0.7).setDepth(2);
      const lamp = this.add
        .circle(x, 10, 2, d.tint, 0.9)
        .setStrokeStyle(0.5, 0xc8a060)
        .setDepth(3);
      const rect = this.add
        .rectangle(x, y, 18, 22, d.tint, 1)
        .setStrokeStyle(1, 0xc8a060)
        .setDepth(3);
      const glow = this.add.circle(x, y + 14, 3, 0xc8a060, 0.6).setDepth(4);
      // Sealed doors get a horizontal chain bar drawn across their face.
      const bar = this.add
        .rectangle(x, y, 20, 2, 0x2a1a10, 0.85)
        .setStrokeStyle(0.5, 0x6a4020, 0.8)
        .setDepth(4)
        .setVisible(false);
      // Done doors get a small seal pip glowing under the lamp.
      const seal = this.add
        .circle(x, y - 8, 2, 0xc8a060, 0)
        .setStrokeStyle(0.5, 0xffe098, 0)
        .setDepth(4);
      const lbl = new GBCText(this, x - 8, y + 14, d.label.slice(0, 4), {
        color: COLOR.textDim,
        depth: 5,
      });
      void lbl;
      this.doors.push({
        key: d.key,
        label: d.label,
        scene: d.scene,
        x,
        y,
        rect,
        glow,
        lamp,
        bar,
        seal,
        tint: d.tint,
      });
    });

    // Work-stage status indicator near the top edge.
    this.workStatus = new GBCText(this, GBC_W - 36, 4, "", {
      color: COLOR.textDim,
      depth: 100,
    });

    // Initialize threshold memory state from current save flags.
    this.thresholdStage = this.opDoneCount();
    this.applyThresholdState(true);

    // Rowan
    this.rowan = makeRowan(this, GBC_W / 2, GBC_H - 24);
    this.input2 = new InputState(this);

    attachHUD(this, () => this.save.stats);
    this.vesselHud = mountVesselHud(this, this.save);
    this.hint = new GBCText(this, 4, GBC_H - 22, "", { color: COLOR.textDim, depth: 100 });

    // Bind action
    onActionDown(this, "action", () => this.tryInteract());

    // Always derive on entry — covers first visit AND returning after each
    // operation when new shards may have become available (e.g. salvage).
    deriveInventory(this.save);
    this.refreshVesselFill();
    this.vesselHud.refresh();

    // Echo at top of stair if she's been unlocked.
    if (this.save.flags.echo_follower_unlocked) {
      const echo = this.add
        .circle(GBC_W - 14, GBC_H - 26, 3, 0xa0c8e8, 0.85)
        .setStrokeStyle(0.5, 0xffffff);
      this.tweens.add({
        targets: echo,
        alpha: 0.4,
        duration: 1400,
        yoyo: true,
        repeat: -1,
      });
      new GBCText(this, GBC_W - 24, GBC_H - 20, "ECHO", {
        color: COLOR.textAccent,
        depth: 5,
      });
    }

    // First visit only — opening dialog (with apology gate variant).
    if (!this.save.flags.athanor_visited) {
      this.save.flags.athanor_visited = true;
      writeSave(this.save);
      this.busy = true;
      const intro = this.openingLines();
      runDialog(this, intro, () => {
        if (hasChoice(this.save, "walking_saint", "forced") && !this.save.flags.act2_apology) {
          this.runApologyGate();
        } else {
          this.busy = false;
        }
      });
    }

    // Salvage hint on return: if quest is active and we're back at threshold,
    // the bath remembers — point them at Albedo.
    if (
      this.save.sideQuests["salvage_a_shard"] === "active" &&
      !this.save.flags.salvage_hinted_athanor
    ) {
      this.save.flags.salvage_hinted_athanor = true;
      writeSave(this.save);
      this.time.delayedCall(900, () => {
        if (this.busy) return;
        this.busy = true;
        runDialog(
          this,
          [
            { who: "SORYN", text: "The bath kept something. The water always does." },
          ],
          () => (this.busy = false),
        );
      });
    }

    // Stage return-beat: the first time the player walks back into the
    // threshold with N completed operations, Soryn (or Rowan, alone)
    // acknowledges it once. After that the room remembers silently.
    const stage = this.thresholdStage as 0 | 1 | 2 | 3 | 4;
    if (stage >= 1 && !this.save.flags[`athanor_stage_${stage}_seen`]) {
      this.time.delayedCall(900, () => {
        if (this.busy) return;
        this.save.flags[`athanor_stage_${stage}_seen`] = true;
        writeSave(this.save);
        this.busy = true;
        const beat = STAGE_BEATS[stage as 1 | 2 | 3 | 4];
        const line = this.save.sorynReleased
          ? { who: "ROWAN", text: beat.text }
          : beat;
        runDialog(this, [line], () => {
          this.busy = false;
        });
      });
    }

    // If all four operations are done and player returns, prompt the seal.
    if (
      this.save.flags.op_nigredo_done &&
      this.save.flags.op_albedo_done &&
      this.save.flags.op_citrinitas_done &&
      this.save.flags.op_rubedo_done &&
      !this.save.act2Inscription
    ) {
      this.time.delayedCall(stage >= 4 ? 2400 : 600, () => {
        if (this.busy) return;
        this.busy = true;
        runDialog(
          this,
          [{ who: this.save.sorynReleased ? "ROWAN" : "SORYN", text: "All four are done. The vessel waits to be sealed." }],
          () => {
            this.busy = false;
            this.gotoSealedVessel();
          },
        );
      });
    }

    // Music
    getAudio().music.play("athanor", SONG_MOON);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.vesselHud.destroy();
    });
  }

  update(_t: number, dt: number) {
    if (this.busy) return;
    const speed = 0.04 * dt;
    const ax = this.input2.poll();
    let dx = 0;
    let dy = 0;
    if (ax.left) dx -= 1;
    if (ax.right) dx += 1;
    if (ax.up) dy -= 1;
    if (ax.down) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      this.rowan.x = Phaser.Math.Clamp(this.rowan.x + (dx / len) * speed, 8, GBC_W - 8);
      this.rowan.y = Phaser.Math.Clamp(this.rowan.y + (dy / len) * speed, 30, GBC_H - 12);
      animateRowan(this.rowan, dx, dy);
    }
    this.refreshHint();
  }

  private nearestDoor(): Door | null {
    let best: Door | null = null;
    let bd = 18;
    for (const d of this.doors) {
      const dist = Math.hypot(this.rowan.x - d.x, this.rowan.y - d.y);
      if (dist < bd) {
        bd = dist;
        best = d;
      }
    }
    return best;
  }

  private nearVessel(): boolean {
    return Math.hypot(this.rowan.x - GBC_W / 2, this.rowan.y - (GBC_H / 2 + 8)) < 16;
  }

  private refreshHint() {
    if (this.busy) return;
    const door = this.nearestDoor();
    if (door) {
      const status = this.doorStatus(door);
      this.hint.setText(`${door.label} - ${status}`);
      return;
    }
    if (this.nearVessel()) {
      const n = this.save.shardInventory.length;
      if (n > 0) this.hint.setText(`A: TRANSMUTE  (${n} SHARDS)`);
      else this.hint.setText("VESSEL");
      return;
    }
    this.hint.setText("");
  }

  private doorStatus(d: Door): string {
    if (this.save.flags[`op_${d.key}_done`]) return "DONE";
    // Door order gating: nigredo first, then each requires the prior.
    const order: Door["key"][] = ["nigredo", "albedo", "citrinitas", "rubedo"];
    const idx = order.indexOf(d.key);
    for (let i = 0; i < idx; i++) {
      if (!this.save.flags[`op_${order[i]}_done`]) return "SEALED";
    }
    if (!this.save.verbs.transmute) return "NEEDS TRANSMUTE";
    return "A: ENTER";
  }

  private tryInteract() {
    if (this.busy) return;
    const door = this.nearestDoor();
    if (door) {
      this.tryEnterDoor(door);
      return;
    }
    if (this.nearVessel()) {
      this.tryDeposit();
      return;
    }
    // Coda: if all four operations done, show seal prompt
    if (
      this.save.flags.op_nigredo_done &&
      this.save.flags.op_albedo_done &&
      this.save.flags.op_citrinitas_done &&
      this.save.flags.op_rubedo_done
    ) {
      this.gotoSealedVessel();
    }
  }

  private tryDeposit() {
    if (this.save.shardInventory.length === 0) {
      this.busy = true;
      runDialog(this, [{ who: "SORYN", text: "The vessel is full enough. Walk." }], () => {
        this.busy = false;
      });
      return;
    }
    // First deposit unlocks TRANSMUTE
    if (!this.save.verbs.transmute) {
      this.busy = true;
      runDialog(this, TRANSMUTE_LINES, () => {
        this.save.verbs.transmute = true;
        unlockLore(this.save, "on_the_athanor");
        showLoreToast(this, "on_the_athanor");
        this.depositRound();
      });
      return;
    }
    this.depositRound();
  }

  /** Deposit: just animates a name floating into the vessel; shards remain in
   * inventory (operations consume them). The vessel "fills" cosmetically based
   * on stones produced, not shards deposited. */
  private depositRound() {
    const shard = this.save.shardInventory[this.depositedThisVisit % this.save.shardInventory.length];
    const t = new GBCText(this, GBC_W / 2 - 24, GBC_H / 2 - 18, shardName(shard), {
      color: COLOR.textGold,
      depth: 50,
    });
    this.tweens.add({
      targets: t.obj,
      y: GBC_H / 2 + 6,
      alpha: 0,
      duration: 1100,
      onComplete: () => {
        t.destroy();
        this.busy = false;
        this.depositedThisVisit++;
        this.refreshVesselFill();
      },
    });
    getAudio().sfx("confirm");
    this.busy = true;
  }

  private tryEnterDoor(d: Door) {
    const status = this.doorStatus(d);
    if (status === "SEALED") {
      this.busy = true;
      runDialog(
        this,
        [{ who: "SORYN", text: "Not yet. The order matters here." }],
        () => (this.busy = false),
      );
      return;
    }
    if (status === "NEEDS TRANSMUTE") {
      this.busy = true;
      runDialog(
        this,
        [{ who: "SORYN", text: "First, the vessel. Then the door." }],
        () => (this.busy = false),
      );
      return;
    }
    if (status === "DONE") {
      this.busy = true;
      runDialog(
        this,
        [{ who: "SORYN", text: "That work is finished. Look at the vessel." }],
        () => (this.busy = false),
      );
      return;
    }
    this.save.scene = d.scene;
    writeSave(this.save);
    gbcWipe(this, () => this.scene.start(d.scene, { save: this.save }));
  }

  private gotoSealedVessel() {
    this.save.scene = "SealedVessel";
    writeSave(this.save);
    gbcWipe(this, () => this.scene.start("SealedVessel", { save: this.save }));
  }

  private refreshVesselFill() {
    const total =
      this.save.blackStones + this.save.whiteStones + this.save.yellowStones + this.save.redStones;
    const h = Math.max(1, Math.min(16, total * 1.5));
    this.vesselFill.height = h;
  }

  /** Pick the right opening lines based on save state (Soryn-released, etc.). */
  private openingLines(): { who: string; text: string }[] {
    if (this.save.sorynReleased) {
      return [
        { who: "ROWAN", text: "Down the stair. The Plateau ends here." },
        { who: "ROWAN", text: "An Athanor. The vessel that won't break what it transmutes." },
        { who: "ROWAN", text: "Into the glass with all of it." },
      ];
    }
    return OPENING_LINES;
  }

  /** Soryn refuses to descend until Rowan sits with what she did to the Saint. */
  private runApologyGate() {
    runInquiry(
      this,
      { who: "SORYN", text: "Before the stair — the saint. You forced her hand." },
      [
        {
          choice: "confess",
          label: "I KNOW. I'M SORRY.",
          reply: "Good. Carry that down with you.",
        },
        {
          choice: "ask",
          label: "SHE'LL FORGET.",
          reply: "She won't. Neither will you. Bring it anyway.",
        },
        {
          choice: "silent",
          label: "(SAY NOTHING. STEP DOWN.)",
          reply: "...as you like. The stair holds no opinions.",
        },
      ],
      (p) => {
        this.save.flags.act2_apology = true;
        if (p.choice === "confess") this.save.stats.compassion += 1;
        writeSave(this.save);
        this.busy = false;
      },
    );
  }

  /**
   * Update vessel atmosphere + memory nodes + door states to reflect the
   * current threshold stage (= number of completed operations, 0..4).
   *
   * Called on scene entry and after any door's status changes.
   * @param initial true on first call from create() — skips re-tweens.
   */
  private applyThresholdState(initial = false): void {
    const stage = (this.thresholdStage = this.opDoneCount());
    this.workStatus.setText(`WORK ${stage}/4`);

    // Vessel core glow tint + alpha follow the most recent stage's color.
    const stageColors = [0x6a3010, 0x3a3a48, 0xa0a0b8, 0xe8c860, 0xd03838];
    const stageAlphas = [0.25, 0.4, 0.55, 0.7, 0.85];
    this.vesselCoreGlow.setFillStyle(stageColors[stage], stageAlphas[stage]);

    // Vessel ring brightens with stage.
    const ringStrokeAlpha = 0.55 + stage * 0.1;
    this.vesselRing.setStrokeStyle(1, 0xc8a060, Math.min(1, ringStrokeAlpha));
    if (stage >= 4 && !initial) {
      this.tweens.add({
        targets: this.vesselRing,
        scale: { from: 1, to: 1.15 },
        duration: 700,
        yoyo: true,
        ease: "Sine.inOut",
      });
    }

    // Light up the first `stage` memory nodes.
    this.vesselNodes.forEach((node, i) => {
      if (i < stage) {
        node.setFillStyle(NODE_COLORS[i], 0.95);
        node.setStrokeStyle(0.5, 0xffe098, 0.85);
        // A gentle node pulse when the room first acknowledges its stage.
        if (!initial && i === stage - 1) {
          this.tweens.add({
            targets: node,
            scale: { from: 1, to: 1.6 },
            alpha: { from: 1, to: 0.7 },
            duration: 600,
            yoyo: true,
            ease: "Sine.inOut",
          });
        }
      } else {
        node.setFillStyle(NODE_COLORS[i], 0.15);
        node.setStrokeStyle(0.5, 0x6a4020, 0.55);
      }
    });

    // Reapply door states so SEALED/AVAILABLE/DONE all read at a glance.
    for (const d of this.doors) this.applyDoorState(d);
  }

  /**
   * Visual state of one door based on the same status logic used by
   * doorStatus(). Sealed = chain bar + dim. Available = warm pulse.
   * Done = calmer glow + lit seal pip.
   */
  private applyDoorState(d: Door): void {
    const status = this.doorStatus(d);
    // Reset any prior tweens so we don't stack them across stage changes.
    if (d.lampPulse) {
      d.lampPulse.stop();
      d.lampPulse = undefined;
    }
    if (d.glowPulse) {
      d.glowPulse.stop();
      d.glowPulse = undefined;
    }

    if (status === "DONE") {
      d.rect.setAlpha(0.85);
      d.glow.setFillStyle(d.tint, 0.5);
      d.glow.setScale(1);
      d.lamp.setAlpha(0.6);
      if (d.bar) d.bar.setVisible(false);
      if (d.seal) {
        d.seal.setFillStyle(0xc8a060, 0.95);
        d.seal.setStrokeStyle(0.5, 0xffe098, 0.9);
      }
      // Calm steady glow — work remembered, not active.
      d.glowPulse = this.tweens.add({
        targets: d.glow,
        alpha: { from: 0.5, to: 0.25 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    } else if (status === "SEALED" || status === "NEEDS TRANSMUTE") {
      d.rect.setAlpha(0.55);
      d.glow.setFillStyle(0x2a1a10, 0.4);
      d.lamp.setAlpha(0.35);
      if (d.bar) d.bar.setVisible(true);
      if (d.seal) {
        d.seal.setFillStyle(0xc8a060, 0);
        d.seal.setStrokeStyle(0.5, 0xffe098, 0);
      }
    } else {
      // AVAILABLE — active warm pulse on lamp + glow.
      d.rect.setAlpha(1);
      d.glow.setFillStyle(0xc8a060, 0.6);
      d.lamp.setAlpha(0.9);
      if (d.bar) d.bar.setVisible(false);
      if (d.seal) {
        d.seal.setFillStyle(0xc8a060, 0);
        d.seal.setStrokeStyle(0.5, 0xffe098, 0);
      }
      d.lampPulse = this.tweens.add({
        targets: d.lamp,
        alpha: { from: 0.9, to: 0.45 },
        duration: 1100,
        yoyo: true,
        repeat: -1,
      });
      d.glowPulse = this.tweens.add({
        targets: d.glow,
        alpha: { from: 0.6, to: 0.2 },
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
    }
  }
}
