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
import type { SaveSlot, SceneKey } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog } from "./hud";
import { onActionDown } from "../controls";
import { getAudio, SONG_MOON } from "../audio";
import { deriveInventory, shardName } from "../athanor/shards";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";

type Door = {
  key: "nigredo" | "albedo" | "citrinitas" | "rubedo";
  label: string;
  scene: SceneKey;
  x: number;
  y: number;
  rect: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Arc;
};

const DOOR_DEFS: { key: Door["key"]; label: string; scene: SceneKey; tint: number }[] = [
  { key: "nigredo", label: "NIGREDO", scene: "Nigredo", tint: 0x202028 },
  { key: "albedo", label: "ALBEDO", scene: "Albedo", tint: 0xe0e0e8 },
  { key: "citrinitas", label: "CITRINITAS", scene: "Citrinitas", tint: 0xe8c860 },
  { key: "rubedo", label: "RUBEDO", scene: "Rubedo", tint: 0xb84040 },
];

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
  private doors: Door[] = [];
  private busy = false;
  private depositedThisVisit = 0;

  constructor() {
    super("AthanorThreshold");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "AthanorThreshold";
    this.save.act = 2;
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a0e0a");
    spawnMotes(this, { count: 18, color: 0x6a3a2a, alpha: 0.4 });

    // Floor: warm amber radial
    const floor = this.add.rectangle(GBC_W / 2, GBC_H / 2, GBC_W, GBC_H, 0x2a1810).setDepth(-10);
    void floor;

    // Central vessel (alembic glyph)
    this.vessel = this.add.circle(GBC_W / 2, GBC_H / 2 + 8, 9, 0x000000, 0).setStrokeStyle(1, 0xc8a060).setDepth(5);
    this.vesselFill = this.add
      .rectangle(GBC_W / 2, GBC_H / 2 + 12, 12, 1, 0x6a3010)
      .setDepth(4)
      .setOrigin(0.5, 1);
    this.refreshVesselFill();
    new GBCText(this, GBC_W / 2 - 14, GBC_H / 2 - 6, "VESSEL", { color: COLOR.textGold, depth: 5 });

    // Four doors along the top, color-coded
    DOOR_DEFS.forEach((d, i) => {
      const x = 24 + i * 28;
      const y = 18;
      const rect = this.add.rectangle(x, y, 18, 22, d.tint, 1).setStrokeStyle(1, 0xc8a060).setDepth(3);
      const glow = this.add.circle(x, y + 14, 3, 0xc8a060, 0.6).setDepth(4);
      this.tweens.add({ targets: glow, alpha: 0.2, duration: 900, yoyo: true, repeat: -1 });
      const lbl = new GBCText(this, x - 8, y + 14, d.label.slice(0, 4), {
        color: COLOR.textDim,
        depth: 5,
      });
      void lbl;
      this.doors.push({ key: d.key, label: d.label, scene: d.scene, x, y, rect, glow });
    });

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

    // First visit only — opening dialog
    if (!this.save.flags.athanor_visited) {
      this.save.flags.athanor_visited = true;
      writeSave(this.save);
      this.busy = true;
      runDialog(this, OPENING_LINES, () => {
        this.busy = false;
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
      this.time.delayedCall(600, () => {
        if (this.busy) return;
        this.busy = true;
        runDialog(
          this,
          [{ who: "SORYN", text: "All four are done. The vessel waits to be sealed." }],
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
}
