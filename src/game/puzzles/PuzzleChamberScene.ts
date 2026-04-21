/**
 * PuzzleChamberScene — one Phaser scene runs all hermetic exemplar rooms.
 *
 * Reads { save, roomId, returnTo } from init data, looks up the
 * PuzzleRoomDef, renders nodes via spawn helpers, and dispatches to a
 * theme-specific interaction mode. State is persisted to save.puzzleState
 * and the room's solved flag is set on completion.
 *
 * Doctrine:
 *  - one room, one principle
 *  - failure is soft (reset, no death)
 *  - solved rooms visibly calm down
 *  - back button always returns to the host scene
 */
import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  spawnMotes,
} from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot, SceneKey } from "../types";
import { attachHUD, runDialog } from "../scenes/hud";
import { onActionDown } from "../controls";
import { getPuzzleRoom } from "./rooms";
import {
  spawnHermeticGate,
  spawnNameGlyph,
  spawnResonator,
  spawnMirror,
  spawnBeamColumn,
  spawnWitnessCircle,
} from "./spawn";
import {
  getPuzzleState,
  isPuzzleSolved,
  markPuzzleSolved,
  setPuzzleNodeState,
  resetPuzzleRoom,
} from "./runtime";
import type { PuzzleRoomDef } from "./types";

type NodeView = {
  id: string;
  refresh: () => void;
};

export class PuzzleChamberScene extends Phaser.Scene {
  private save!: SaveSlot;
  private room!: PuzzleRoomDef;
  private returnTo: SceneKey = "MetaxyHub";
  private cursor = 0;
  private targets: { id: string; x: number; y: number; label: string }[] = [];
  private cursorMark!: GBCText;
  private hint!: GBCText;
  private hintText = "";
  private title!: GBCText;
  private nodeViews: NodeView[] = [];
  private busy = false;
  // sun_stand: hold timer
  private holdMs = 0;
  private holdRing?: Phaser.GameObjects.Arc;
  private holding = false;

  constructor() {
    super("PuzzleChamber");
  }

  init(data: { save: SaveSlot; roomId: string; returnTo: SceneKey }) {
    this.save = data.save;
    const room = getPuzzleRoom(data.roomId);
    if (!room) throw new Error(`PuzzleChamber: unknown room ${data.roomId}`);
    this.room = room;
    this.returnTo = data.returnTo;
    this.cursor = 0;
    this.busy = false;
    this.holdMs = 0;
    this.holding = false;
    this.targets = [];
    this.nodeViews = [];
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0e18");
    spawnMotes(this, { count: 14, color: 0xa0b0d0, alpha: 0.18 });

    this.title = new GBCText(this, 4, 4, this.room.title ?? "CHAMBER", {
      color: COLOR.textGold,
      depth: 100,
    });
    new GBCText(this, GBC_W - 30, 4, "B BACK", { color: COLOR.textDim, depth: 100 });

    attachHUD(this, () => this.save.stats);

    this.renderRoom();

    this.cursorMark = new GBCText(this, 0, 0, ">", { color: COLOR.textLight, depth: 50 });
    this.cursorMark.setVisible(false);

    this.hint = new GBCText(this, 4, GBC_H - 22, "", { color: COLOR.textDim, depth: 100 });

    onActionDown(this, "cancel", () => this.exit());

    if (isPuzzleSolved(this.save, this.room)) {
      this.refreshHint();
      return;
    }

    onActionDown(this, "action", () => this.tryAct());
    this.input.keyboard?.on("keydown-LEFT", () => this.move(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.move(1));
    this.input.keyboard?.on("keydown-UP", () => this.move(-1));
    this.input.keyboard?.on("keydown-DOWN", () => this.move(1));

    // Sun-stand: A held = standing
    if (this.room.theme === "solar_truth") {
      this.input.keyboard?.on("keydown-Z", () => (this.holding = true));
      this.input.keyboard?.on("keyup-Z", () => (this.holding = false));
      this.input.keyboard?.on("keydown-SPACE", () => (this.holding = true));
      this.input.keyboard?.on("keyup-SPACE", () => (this.holding = false));
    }

    if (this.room.intro && this.room.intro.length > 0) {
      this.busy = true;
      runDialog(
        this,
        this.room.intro.map((text) => ({ who: "CHAMBER", text })),
        () => {
          this.busy = false;
          this.refreshCursor();
          this.refreshHint();
        },
      );
    } else {
      this.refreshCursor();
      this.refreshHint();
    }
  }

  update(_t: number, dt: number) {
    if (this.room.theme !== "solar_truth") return;
    if (isPuzzleSolved(this.save, this.room) || this.busy) return;
    if (!this.holdRing) return;
    const required = 1500;
    if (this.holding) {
      this.holdMs = Math.min(required, this.holdMs + dt);
      const r = 8 + (this.holdMs / required) * 6;
      this.holdRing.setRadius(r);
      this.holdRing.setFillStyle(0xfff0a8, 0.18 + (this.holdMs / required) * 0.4);
      if (this.holdMs >= required) {
        this.holdMs = 0;
        this.holding = false;
        this.solveSun();
      }
    } else if (this.holdMs > 0) {
      this.holdMs = Math.max(0, this.holdMs - dt * 1.5);
      this.holdRing.setRadius(8);
      this.holdRing.setFillStyle(0xdde6f5, 0.06);
    }
  }

  // ---- rendering ----

  private renderRoom() {
    const state = getPuzzleState(this.save, this.room).nodeState;

    for (const node of this.room.nodes) {
      switch (node.kind) {
        case "mirror": {
          const v = spawnMirror(this, node.x, node.y, !!state[node.id]);
          this.targets.push({ id: node.id, x: node.x, y: node.y, label: "WITNESS" });
          this.nodeViews.push({
            id: node.id,
            refresh: () => {
              const lit = !!getPuzzleState(this.save, this.room).nodeState[node.id];
              v.body.setFillStyle(lit ? 0xe0e8f0 : 0x4a5060, 1);
              v.halo.setFillStyle(0xc8d8f0, lit ? 0.25 : 0.08);
            },
          });
          break;
        }
        case "beam": {
          const v = spawnBeamColumn(this, node.x, node.y, !!state[node.id]);
          // basin/column is interactable in lunar_reflection (final witness)
          if (this.room.theme === "lunar_reflection") {
            this.targets.push({ id: node.id, x: node.x, y: node.y, label: "WITNESS" });
          }
          this.nodeViews.push({
            id: node.id,
            refresh: () => {
              const lit = !!getPuzzleState(this.save, this.room).nodeState[node.id];
              v.beam.setFillStyle(lit ? 0xf0e8c8 : 0x4a4838, lit ? 0.85 : 0.3);
              v.cap.setFillStyle(lit ? 0xfff0a8 : 0x584828, lit ? 0.9 : 0.35);
            },
          });
          break;
        }
        case "name_glyph": {
          const v = spawnNameGlyph(this, node.x, node.y, !!state[node.id]);
          this.targets.push({ id: node.id, x: node.x, y: node.y, label: "NAME" });
          this.nodeViews.push({
            id: node.id,
            refresh: () => {
              const lit = !!getPuzzleState(this.save, this.room).nodeState[node.id];
              v.glyph.setFillStyle(lit ? 0xc8a060 : 0x2a221a, lit ? 0.85 : 0.4);
              v.glyph.setStrokeStyle(1, lit ? 0xf0d088 : 0x5a4828, lit ? 0.9 : 0.5);
            },
          });
          break;
        }
        case "resonator": {
          const v = spawnResonator(this, node.x, node.y, !!state[node.id]);
          this.targets.push({ id: node.id, x: node.x, y: node.y, label: "ATTUNE" });
          this.nodeViews.push({
            id: node.id,
            refresh: () => {
              const active = !!getPuzzleState(this.save, this.room).nodeState[node.id];
              v.orb.setFillStyle(active ? 0xf0c8d8 : 0x584858, active ? 0.85 : 0.35);
              v.halo.setFillStyle(active ? 0xf0c8d8 : 0x584858, active ? 0.2 : 0.08);
            },
          });
          break;
        }
        case "witness_circle": {
          const v = spawnWitnessCircle(this, node.x, node.y);
          this.holdRing = v.ring;
          this.nodeViews.push({
            id: node.id,
            refresh: () => {
              const solved = isPuzzleSolved(this.save, this.room);
              v.ring.setStrokeStyle(1, 0xa8c8e8, solved ? 0.95 : 0.5);
            },
          });
          break;
        }
        case "gate":
        case "seal": {
          const open = isPuzzleSolved(this.save, this.room);
          const v = spawnHermeticGate(this, node.x, node.y, node.label ?? "GATE", open);
          this.nodeViews.push({
            id: node.id,
            refresh: () => {
              const o = isPuzzleSolved(this.save, this.room);
              v.base.setFillStyle(o ? 0x243248 : 0x1a1410, 1);
              v.base.setStrokeStyle(1, o ? 0xc8d8f0 : 0x4a3828, 0.7);
              v.seal.setFillStyle(o ? 0xc8d8f0 : 0xc8a060, o ? 0.15 : 0.55);
              v.text.setColor(o ? COLOR.textDim : COLOR.textGold);
            },
          });
          break;
        }
        default:
          break;
      }
    }
  }

  // ---- selection ----

  private move(d: number) {
    if (this.busy || this.targets.length === 0) return;
    if (isPuzzleSolved(this.save, this.room)) return;
    this.cursor = (this.cursor + d + this.targets.length) % this.targets.length;
    this.refreshCursor();
    this.refreshHint();
  }

  private refreshCursor() {
    if (this.targets.length === 0 || isPuzzleSolved(this.save, this.room)) {
      this.cursorMark.setVisible(false);
      return;
    }
    const t = this.targets[this.cursor];
    this.cursorMark.setPosition(t.x - 12, t.y - 4);
    this.cursorMark.setVisible(true);
  }

  private refreshHint() {
    let text: string;
    if (isPuzzleSolved(this.save, this.room)) {
      text = "SOLVED. B: LEAVE";
    } else if (this.room.theme === "solar_truth") {
      text = "HOLD A: STAND. B: LEAVE";
    } else if (this.targets.length === 0) {
      text = "B: LEAVE";
    } else {
      const t = this.targets[this.cursor];
      text = `A: ${t.label}  </>  B: LEAVE`;
    }
    this.hintText = text;
    this.hint.setText(text);
  }

  // ---- interaction dispatch ----

  private tryAct() {
    if (this.busy) return;
    if (isPuzzleSolved(this.save, this.room)) return this.exit();

    switch (this.room.theme) {
      case "lunar_reflection":
        return this.actLunar();
      case "mercurial_naming":
        return this.actMercury();
      case "venusian_harmony":
        return this.actVenus();
      case "solar_truth":
        // handled via hold-update
        return;
      default:
        return;
    }
  }

  // Moon: align both mirrors, then witness the basin.
  private actLunar() {
    const t = this.targets[this.cursor];
    const ns = getPuzzleState(this.save, this.room).nodeState;

    if (t.id === "basin") {
      const both = !!ns.mirror_a && !!ns.mirror_b;
      if (!both) {
        this.softFail("THE BASIN IS DARK.");
        return;
      }
      setPuzzleNodeState(this.save, this.room.id, "basin", true);
      this.refreshAllNodes();
      this.solveAndExit();
      return;
    }

    // mirror_a / mirror_b → toggle aligned (witness the reflection)
    const cur = !!ns[t.id];
    setPuzzleNodeState(this.save, this.room.id, t.id, !cur);
    this.flash(t.x, t.y, 0xc8d8f0);
    this.refreshAllNodes();
  }

  // Mercury: name the true glyph; wrong names dim the seal briefly (soft fail).
  private actMercury() {
    const t = this.targets[this.cursor];
    const node = this.room.nodes.find((n) => n.id === t.id);
    if (!node) return;
    const isTrue = node.data?.true === true;

    if (!isTrue) {
      // dim all glyphs visually for a moment
      this.softFail("THE NAME WAS WRONG. THE SEAL DIMS.");
      for (const n of this.room.nodes) {
        if (n.kind === "name_glyph") {
          setPuzzleNodeState(this.save, this.room.id, n.id, false);
        }
      }
      this.refreshAllNodes();
      return;
    }

    // light the true one; dim the others
    for (const n of this.room.nodes) {
      if (n.kind === "name_glyph") {
        setPuzzleNodeState(this.save, this.room.id, n.id, n.id === t.id);
      }
    }
    this.flash(t.x, t.y, 0xf0d088);
    this.refreshAllNodes();
    this.time.delayedCall(280, () => this.solveAndExit());
  }

  // Venus: attune both resonators (toggle each on); concord opens bridge.
  private actVenus() {
    const t = this.targets[this.cursor];
    const ns = getPuzzleState(this.save, this.room).nodeState;
    const cur = !!ns[t.id];
    setPuzzleNodeState(this.save, this.room.id, t.id, !cur);
    this.flash(t.x, t.y, 0xf0c8d8);
    this.refreshAllNodes();

    const after = getPuzzleState(this.save, this.room).nodeState;
    if (!!after.pair_a && !!after.pair_b) {
      this.time.delayedCall(280, () => this.solveAndExit());
    }
  }

  // Sun: completed by the hold-update loop.
  private solveSun() {
    this.flash(80, 78, 0xfff0a8);
    this.solveAndExit();
  }

  // ---- shared ----

  private refreshAllNodes() {
    for (const v of this.nodeViews) v.refresh();
  }

  private flash(x: number, y: number, color: number) {
    const c = this.add.circle(x, y, 4, color, 0.8).setDepth(60);
    this.tweens.add({
      targets: c,
      radius: 14,
      alpha: 0,
      duration: 320,
      onComplete: () => c.destroy(),
    });
  }

  private softFail(msg: string) {
    this.busy = true;
    const old = this.hintText;
    this.hint.setText(msg, COLOR.textGold);
    this.cameras.main.shake(140, 0.002);
    this.time.delayedCall(900, () => {
      this.hint.setText(old, COLOR.textDim);
      this.busy = false;
      this.refreshHint();
    });
  }

  private solveAndExit() {
    this.busy = true;
    markPuzzleSolved(this.save, this.room);
    this.refreshAllNodes();
    this.cursorMark.setVisible(false);

    const lines = (this.room.solveLines ?? ["The chamber settles."]).map((text) => ({
      who: "CHAMBER",
      text,
    }));

    runDialog(this, lines, () => {
      this.exit();
    });
  }

  private exit() {
    if (this.busy && !isPuzzleSolved(this.save, this.room)) {
      // allow leaving mid-attempt; reset volatile node state for non-persistent rooms
      if (!this.room.persistent) resetPuzzleRoom(this.save, this.room);
    }
    this.save.scene = this.returnTo;
    writeSave(this.save);
    this.scene.start(this.returnTo, { save: this.save });
  }
}

/** Map sphere → exemplar room id. Used by host scenes to launch the right chamber. */
export const EXEMPLAR_ROOM: Record<"moon" | "mercury" | "venus" | "sun", string> = {
  moon: "moon_reflection_01",
  mercury: "mercury_name_01",
  venus: "venus_attunement_01",
  sun: "sun_stand_01",
};
