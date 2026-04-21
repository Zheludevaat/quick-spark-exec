/**
 * Mercury — Tower of Reasons.
 *
 * This is NOT a thin shell over the template. It is a fully authored act
 * built around exploration, NPC presence, and three Mercury-specific
 * puzzle/minigame mechanics. The shared SphereConfig is used only for
 * save/progression state (op flags, cracking flag, verb unlock, inscription).
 *
 * Layout of the Tower (top-down, GBC 160x144):
 *   - Top tier: Cracking Chamber (HERMAIA's question) + locked Trial door
 *   - Mid tier: 3 puzzle stations (Syllogism, Refutation, Silence)
 *   - Lower tier: 3 NPC alcoves (Defender, Pedant, Casuist)
 *   - Bottom: stairs down (exit to MetaxyHub)
 *   - Environmental: chalkboard, broken statue, scattered scrolls
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
import { attachHUD, runDialog, makeRowan, animateRowan, InputState } from "../../scenes/hud";
import { setSceneSnapshot } from "../../gameUiBridge";
import { onActionDown } from "../../controls";
import { getAudio } from "../../audio";
import { askSphere } from "../SpherePlateauScene";
import { mercuryConfig } from "../configs/mercury";
import { markOpDone, opsCompleted, trialPassedKey } from "../types";
import { runInquiry } from "../../inquiry";
import {
  createEncounterPresentation,
  type EncounterPresentationHandle,
} from "../../encounters/EncounterPresentation";
import { HERMAIA_PROFILE } from "../../encounters/profiles/governors";

type StationKind =
  | "npc_defender"
  | "npc_pedant"
  | "npc_casuist"
  | "puzzle_syllogism"
  | "puzzle_refutation"
  | "puzzle_silence"
  | "chalkboard"
  | "statue"
  | "scrolls"
  | "crack_chamber"
  | "trial_door"
  | "exit_stairs";

type MStation = {
  kind: StationKind;
  x: number;
  y: number;
  label: string;
  doneFlag?: string; // op flag to mark on completion
  opId?: string; // for ops counted toward cracking
  visual?: Phaser.GameObjects.GameObject[];
};

const COLD = 0xa8c8e8;
const STONE = 0x4a5468;
const STONE_DARK = 0x2a3040;
const INK = 0x88a4c8;
const WARM = 0xe8c890; // ignition / named accent

/**
 * Ambient bark lines per soul kind. Used by the plateau's bark loop to
 * make the Tower feel inhabited even when the player is just walking.
 */
const MERCURY_BARKS: Record<"npc_defender" | "npc_pedant" | "npc_casuist", string[]> = {
  npc_defender: [
    "NO. THE STRUCTURE MATTERS.",
    "I PAID FOR BEING RIGHT.",
    "THE COST WAS NOT THE ARGUMENT.",
  ],
  npc_pedant: [
    "DEFINE IT AGAIN.",
    "A SHAPE IS ALSO A CAGE.",
    "YOU HIDE INSIDE THE TERM.",
  ],
  npc_casuist: [
    "I CAN DEFEAT EITHER SIDE.",
    "WITHDRAWAL IS SOMETIMES HONEST.",
    "BOTH SIDES WANT TO WIN.",
  ],
};

/** True names revealed once Mercury is cracked. NAME made local. */
const MERCURY_TRUE_NAMES: { kind: StationKind; name: string; dy: number }[] = [
  { kind: "statue", name: "VICTORY WITHOUT RELATION", dy: 14 },
  { kind: "scrolls", name: "THE UNSAID", dy: 8 },
  { kind: "chalkboard", name: "ASSUMPTION", dy: 12 },
];

/** ============================================================
 *  MERCURY PLATEAU — fully authored explorable scene
 *  ============================================================ */
export class MercuryPlateauScene extends Phaser.Scene {
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private inputState!: InputState;
  private hint!: GBCText;
  private interactPrompt!: GBCText;
  private stations: MStation[] = [];
  private busy = false;
  private statusText!: GBCText;
  private trialGlow!: Phaser.GameObjects.Arc;
  private mSave!: SaveSlot;
  private chamberAltar?: Phaser.GameObjects.Rectangle;
  private chamberSigil?: Phaser.GameObjects.GameObject[];
  private chamberReadyShown = false;
  private chamberPulseTween?: Phaser.Tweens.Tween;
  private trialDoorHumTween?: Phaser.Tweens.Tween;
  private ambientBarkEvent?: Phaser.Time.TimerEvent;
  private activeBark?: GBCText;
  private trueNameLabels: GBCText[] = [];
  private hermaiaPresentation?: EncounterPresentationHandle;

  constructor() {
    super("MercuryPlateau");
  }

  init(data: { save: SaveSlot }) {
    // Bypass template init — we own this scene.
    this.mSave = data.save;
    this.mSave.scene = "MercuryPlateau";
    this.mSave.act = ACT_BY_SCENE.MercuryPlateau;
    writeSave(this.mSave);
    this.stations = [];
    this.busy = false;
  }

  create() {
    this.cameras.main.setBackgroundColor(mercuryConfig.bg);
    this.cameras.main.fadeIn(500);

    this.buildTower();
    spawnMotes(this, { count: 14, color: mercuryConfig.accent, alpha: 0.4 });
    this.buildStations();

    attachHUD(this, () => this.mSave.stats);
    setSceneSnapshot({
      key: "MercuryPlateau",
      label: "Mercury — Tower of Reasons",
      act: ACT_BY_SCENE.MercuryPlateau ?? 4,
      zone: "Tower of Reasons",
      nodes: null,
      marker: null,
    });

    // Title strip — width-safe
    const titleText = fitSingleLineText("TOWER OF REASONS", GBC_W - 12);
    const titleX = Math.floor((GBC_W - measureText(titleText)) / 2);
    new GBCText(this, titleX, 2, titleText, {
      color: COLOR.textGold,
      depth: 50,
    });

    // Player at the bottom (just inside from stairs)
    this.rowanShadow = this.add.ellipse(GBC_W / 2, GBC_H - 18, 10, 3, 0x000000, 0.4).setDepth(19);
    this.rowan = makeRowan(this, GBC_W / 2, GBC_H - 20, "soul").setDepth(20);
    this.inputState = new InputState(this);

    // Bottom hint band
    this.add.rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85).setOrigin(0, 0).setDepth(199);
    this.hint = new GBCText(this, 4, GBC_H - 9, "WALK", {
      color: COLOR.textDim,
      depth: 200,
    });

    // Floating interact prompt above rowan
    this.interactPrompt = new GBCText(this, 0, 0, "", {
      color: COLOR.textGold,
      depth: 60,
    });

    // Status (top-right pip count)
    this.statusText = new GBCText(this, GBC_W - 38, 11, "", {
      color: COLOR.textDim,
      depth: 50,
    });

    onActionDown(this, "action", () => this.tryInteract());
    this.events.on("vinput-action", () => this.tryInteract());
    onActionDown(this, "cancel", () => this.toHub());

    this.refreshStatus();

    // If the chamber is already ignited from a prior session, mark its
    // ceremony as already shown so we don't replay the Soryn beat.
    if (this.mSave.flags.sphere_mercury_cracked) this.chamberReadyShown = true;
    this.refreshChamberGlow(true);

    // If Mercury is cracked, hidden true names become visible immediately.
    if (this.mSave.flags.sphere_mercury_cracked) {
      this.revealTrueNames();
    }

    // Start ambient soul barks — gives the room continuous life.
    this.startAmbientBarks();

    // Hermaia presentation — anchored at the upper chamber altar.
    this.hermaiaPresentation = createEncounterPresentation(
      this,
      GBC_W / 2,
      24,
      HERMAIA_PROFILE,
    );

    // First-visit dialog
    if (!this.mSave.flags.sphere_mercury_seen) {
      this.mSave.flags.sphere_mercury_seen = true;
      writeSave(this.mSave);
      this.busy = true;
      this.time.delayedCall(500, () => {
        this.hermaiaPresentation?.introOnce(
          "encounter_seen_hermaia_plateau",
          this.mSave,
        );
        runDialog(this, mercuryConfig.opening, () => {
          this.busy = false;
        });
      });
    }
  }

  /** ============================================================
   *  ENVIRONMENT — Tower architecture
   *  ============================================================ */
  private buildTower() {
    // Stone floor
    this.add.rectangle(0, 0, GBC_W, GBC_H, 0x0a1220).setOrigin(0).setDepth(0);

    // --- Distant tower silhouettes — suggest infinite reasoning-halls ---
    // Two faint, low-contrast spires behind the playable architecture.
    this.add
      .triangle(36, 90, 0, 60, 12, 0, 24, 60, 0x1a2238, 0.55)
      .setDepth(0)
      .setOrigin(0, 0);
    this.add
      .triangle(120, 90, 0, 60, 14, 0, 28, 60, 0x1a2238, 0.45)
      .setDepth(0)
      .setOrigin(0, 0);
    this.add
      .triangle(GBC_W / 2 - 10, 96, 0, 70, 10, 0, 20, 70, 0x12182c, 0.4)
      .setDepth(0)
      .setOrigin(0, 0);

    // --- Hanging proof-rails (faint glyph architecture) ---
    // Two horizontal chalk rails and one vertical, all dim — they imply
    // logical scaffolding without competing with the chamber.
    this.add.rectangle(0, 32, GBC_W, 1, INK, 0.18).setOrigin(0, 0).setDepth(1);
    this.add.rectangle(0, 36, GBC_W, 1, INK, 0.12).setOrigin(0, 0).setDepth(1);
    // Vertical proof line behind the chamber
    this.add.rectangle(GBC_W / 2, 26, 1, 16, INK, 0.22).setOrigin(0.5, 0).setDepth(1);

    // Three vertical pillars suggesting a tower interior
    for (const px of [22, 80, 138]) {
      this.add.rectangle(px, 70, 6, 100, STONE_DARK).setOrigin(0.5).setDepth(1);
      this.add.rectangle(px, 22, 8, 4, STONE).setOrigin(0.5).setDepth(1);
      this.add.rectangle(px, 118, 8, 4, STONE).setOrigin(0.5).setDepth(1);
    }

    // Upper chamber outline (where Cracking Question lives)
    const chamberY = 24;
    this.add.rectangle(GBC_W / 2, chamberY, 70, 16, STONE_DARK, 0.6).setDepth(1);
    this.add.rectangle(GBC_W / 2, chamberY, 70, 16).setStrokeStyle(1, COLD, 0.5).setDepth(1);

    // --- Mercury sigil above the chamber: caduceus shorthand ---
    // Stem + two crescents + small wings. Iconic at 160x144.
    const sigilX = GBC_W / 2;
    const sigilY = 8;
    const stem = this.add.rectangle(sigilX, sigilY, 1, 8, COLD, 0.85).setDepth(4);
    const orb = this.add.circle(sigilX, sigilY - 4, 2, COLD, 0.9).setDepth(4);
    orb.setStrokeStyle(1, WARM, 0.6);
    const wingL = this.add.triangle(sigilX - 3, sigilY - 3, 0, 0, -3, -2, 0, 2, COLD, 0.7).setDepth(4);
    const wingR = this.add.triangle(sigilX + 3, sigilY - 3, 0, 0, 3, -2, 0, 2, COLD, 0.7).setDepth(4);
    this.chamberSigil = [stem, orb, wingL, wingR];
    // Subtle sigil pulse — visual memory anchor of the act.
    this.tweens.add({
      targets: orb,
      alpha: 0.6,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // Trial door — top center (locked until cracked)
    this.add.rectangle(GBC_W / 2, 14, 16, 14, 0x000000, 0.8).setDepth(2);
    this.trialGlow = this.add
      .circle(GBC_W / 2, 14, 5, COLD, 0.0)
      .setStrokeStyle(1, COLD, 0.4)
      .setDepth(3);

    // Stairs down (bottom)
    for (let i = 0; i < 3; i++) {
      this.add
        .rectangle(GBC_W / 2 - 12 + i * 12, GBC_H - 6, 8, 2, STONE, 0.7)
        .setDepth(1);
    }

    // Floor seams suggesting tiers
    this.add.rectangle(0, 50, GBC_W, 1, INK, 0.2).setOrigin(0, 0).setDepth(1);
    this.add.rectangle(0, 86, GBC_W, 1, INK, 0.2).setOrigin(0, 0).setDepth(1);

    // --- Alcove shape language for each NPC station ---
    // Defender (left) — squared, rigid plinth. The frame of someone
    // who has built a fort out of being right.
    this.add.rectangle(26, 104, 18, 2, STONE, 0.7).setDepth(2);
    this.add.rectangle(17, 100, 2, 8, STONE_DARK, 0.85).setDepth(2);
    this.add.rectangle(35, 100, 2, 8, STONE_DARK, 0.85).setDepth(2);
    // Pedant (center) — narrow vertical order, like a card catalog.
    this.add.rectangle(80, 108, 12, 1, INK, 0.5).setDepth(2);
    this.add.rectangle(75, 90, 1, 18, INK, 0.4).setDepth(2);
    this.add.rectangle(85, 90, 1, 18, INK, 0.4).setDepth(2);
    this.add.rectangle(80, 92, 8, 1, INK, 0.4).setDepth(2);
    // Casuist (right) — slightly skewed, doubled outline. Two stances at once.
    this.add.rectangle(132, 104, 18, 2, STONE, 0.6).setDepth(2);
    this.add.rectangle(132, 102, 14, 1, STONE_DARK, 0.55).setDepth(2);
    this.add.line(0, 0, 124, 90, 138, 104, 0x90c8a8, 0.35).setOrigin(0, 0).setDepth(2);
    this.add.line(0, 0, 144, 90, 130, 104, 0x90c8a8, 0.35).setOrigin(0, 0).setDepth(2);
  }

  /** ============================================================
   *  STATIONS — placed objects the player walks up to
   *  ============================================================ */
  private buildStations() {
    // -- NPCs (lower tier, y ~ 96-104) --
    this.placeStation(
      "npc_defender",
      26,
      96,
      "DEFENDER",
      `sphere_mercury_soul_${mercuryConfig.souls[0].id}`,
      0xc89090,
    );
    this.placeStation(
      "npc_pedant",
      80,
      100,
      "PEDANT",
      `sphere_mercury_soul_${mercuryConfig.souls[1].id}`,
      0xc8c890,
    );
    this.placeStation(
      "npc_casuist",
      134,
      96,
      "CASUIST",
      `sphere_mercury_soul_${mercuryConfig.souls[2].id}`,
      0x90c8a8,
    );

    // -- Puzzle stations (mid tier, y ~ 60-72) --
    // Op id maps directly to mercuryConfig.operations[i].id
    this.placeStation(
      "puzzle_syllogism",
      28,
      62,
      "PROOF",
      `sphere_mercury_op_proof`,
      COLD,
      "proof",
    );
    this.placeStation(
      "puzzle_refutation",
      80,
      66,
      "REFUTATION",
      `sphere_mercury_op_refutation`,
      0xe89090,
      "refutation",
    );
    this.placeStation(
      "puzzle_silence",
      132,
      62,
      "SILENCE",
      `sphere_mercury_op_silence`,
      0xa8a8c8,
      "silence",
    );

    // -- Environmental (the 4th op = "argument" lives at the chalkboard) --
    this.placeStation(
      "chalkboard",
      22,
      40,
      "CHALKBOARD",
      `sphere_mercury_op_argument`,
      0x88c0a0,
      "argument",
    );
    this.placeStation("statue", 138, 40, "STATUE");
    this.placeStation("scrolls", 80, 44, "SCROLLS");

    // -- Cracking chamber + trial door (top) --
    this.placeStation("crack_chamber", GBC_W / 2, 24, "CHAMBER", `sphere_mercury_cracked`);
    this.placeStation("trial_door", GBC_W / 2, 14, "TRIAL");

    // -- Exit (bottom) --
    this.placeStation("exit_stairs", GBC_W / 2, GBC_H - 6, "STAIRS");
  }

  private placeStation(
    kind: StationKind,
    x: number,
    y: number,
    label: string,
    doneFlag?: string,
    color: number = INK,
    opId?: string,
  ) {
    const visual: Phaser.GameObjects.GameObject[] = [];
    const done = doneFlag ? !!this.mSave.flags[doneFlag] : false;

    if (kind.startsWith("npc_")) {
      // NPC sprite: small standing figure
      const body = this.add.rectangle(x, y, 6, 10, color).setDepth(15);
      const head = this.add.circle(x, y - 7, 3, color).setDepth(15);
      visual.push(body, head);
      if (done) {
        body.setAlpha(0.55);
        head.setAlpha(0.55);
      }
      // Idle bob
      this.tweens.add({
        targets: [body, head],
        y: "+=1",
        duration: 1200 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    } else if (kind === "puzzle_syllogism" || kind === "puzzle_refutation" || kind === "puzzle_silence") {
      // Puzzle plinth
      const plinth = this.add.rectangle(x, y, 14, 6, STONE_DARK).setDepth(10);
      const top = this.add.rectangle(x, y - 4, 12, 3, color, done ? 0.3 : 0.9).setDepth(11);
      visual.push(plinth, top);
      if (!done) {
        this.tweens.add({
          targets: top,
          alpha: 0.5,
          duration: 900,
          yoyo: true,
          repeat: -1,
        });
      }
    } else if (kind === "chalkboard") {
      const board = this.add.rectangle(x, y, 18, 14, 0x1a2030).setDepth(8);
      board.setStrokeStyle(1, 0x886040);
      // Crossed-out lines
      this.add.line(x, y, -6, -3, 6, 3, 0xc8c8c8, 0.6).setDepth(9);
      this.add.line(x, y, -6, 0, 6, 0, 0xc8c8c8, 0.6).setDepth(9);
      this.add.line(x, y, -6, 3, 4, 1, 0xe89090, 0.7).setDepth(9); // crossed
      visual.push(board);
      if (done) board.setAlpha(0.5);
    } else if (kind === "statue") {
      // Broken debater
      const base = this.add.rectangle(x, y + 4, 12, 4, STONE).setDepth(8);
      const torso = this.add.rectangle(x, y - 3, 6, 10, STONE).setDepth(8);
      // Missing head — just a jagged top
      this.add.triangle(x, y - 8, -3, 0, 3, 0, -1, -3, STONE).setDepth(8);
      visual.push(base, torso);
    } else if (kind === "scrolls") {
      const s1 = this.add.rectangle(x - 4, y, 6, 2, 0xc8b888).setDepth(8);
      const s2 = this.add.rectangle(x + 3, y + 1, 5, 2, 0xc8b888).setDepth(8);
      const s3 = this.add.rectangle(x, y - 2, 4, 2, 0xc8b888).setDepth(8);
      visual.push(s1, s2, s3);
    } else if (kind === "crack_chamber") {
      // The question altar — glows when ops complete
      const ready =
        opsCompleted(
          this.mSave,
          "mercury",
          mercuryConfig.operations.map((o) => o.id),
        ) >= mercuryConfig.operations.length;
      const altar = this.add.rectangle(x, y, 12, 8, ready ? COLD : STONE_DARK, 0.9).setDepth(8);
      altar.setStrokeStyle(1, COLD, ready ? 0.9 : 0.3);
      this.chamberAltar = altar;
      visual.push(altar);
      // Persistent pulse is applied by refreshChamberGlow() once ready.
    } else if (kind === "trial_door") {
      // glow handled separately; refresh later
    } else if (kind === "exit_stairs") {
      // already drawn in buildTower; just register the hotspot
    }

    this.stations.push({ kind, x, y, label, doneFlag, opId, visual });
  }

  /** ============================================================
   *  UPDATE LOOP — movement + proximity hint
   *  ============================================================ */
  update(_t: number, delta: number) {
    if (this.busy) {
      this.interactPrompt.setText("");
      return;
    }
    const speed = 0.04 * delta;
    const i = this.inputState.poll();
    let dx = 0;
    let dy = 0;
    if (i.left) dx -= speed;
    if (i.right) dx += speed;
    if (i.up) dy -= speed;
    if (i.down) dy += speed;

    this.rowan.x = Phaser.Math.Clamp(this.rowan.x + dx, 8, GBC_W - 8);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y + dy, 32, GBC_H - 14);

    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    // Trial door pulse if cracked
    const cracked = !!this.mSave.flags.sphere_mercury_cracked;
    if (cracked) {
      this.trialGlow.setFillStyle(COLD, 0.8 + Math.sin(this.time.now * 0.004) * 0.2);
    }

    const near = this.nearestStation();
    if (near) {
      const verb = this.verbForStation(near);
      this.interactPrompt.setText(`[A] ${verb}`);
      this.interactPrompt.setPosition(this.rowan.x - 12, this.rowan.y - 18);
      this.hint.setText(this.hintForStation(near));
      this.hint.setColor(COLOR.textGold);
    } else {
      this.interactPrompt.setText("");
      this.hint.setText("WALK   B: HUB");
      this.hint.setColor(COLOR.textDim);
    }
  }

  private nearestStation(): MStation | null {
    let best: MStation | null = null;
    let bestD = 18;
    for (const st of this.stations) {
      const d = Phaser.Math.Distance.Between(this.rowan.x, this.rowan.y, st.x, st.y);
      if (d < bestD) {
        best = st;
        bestD = d;
      }
    }
    return best;
  }

  private verbForStation(st: MStation): string {
    if (st.kind.startsWith("npc_")) return "SPEAK";
    if (st.kind === "chalkboard") return "READ";
    if (st.kind === "statue") return "INSPECT";
    if (st.kind === "scrolls") return "STUDY";
    if (st.kind === "puzzle_syllogism") return "PROVE";
    if (st.kind === "puzzle_refutation") return "REFUTE";
    if (st.kind === "puzzle_silence") return "SIT";
    if (st.kind === "crack_chamber") return "FACE";
    if (st.kind === "trial_door") return "ENTER";
    if (st.kind === "exit_stairs") return "DESCEND";
    return "INTERACT";
  }

  private hintForStation(st: MStation): string {
    if (st.doneFlag && this.mSave.flags[st.doneFlag]) {
      return `${st.label} (done)`;
    }
    if (st.kind === "trial_door") {
      return this.mSave.flags.sphere_mercury_cracked ? "Trial Door — open" : "Trial Door — sealed";
    }
    if (st.kind === "crack_chamber") {
      const done = opsCompleted(
        this.mSave,
        "mercury",
        mercuryConfig.operations.map((o) => o.id),
      );
      const need = mercuryConfig.operations.length;
      return done >= need ? "The Question waits" : `Question (${done}/${need})`;
    }
    return st.label;
  }

  private refreshStatus() {
    const done = opsCompleted(
      this.mSave,
      "mercury",
      mercuryConfig.operations.map((o) => o.id),
    );
    this.statusText.setText(`OPS ${done}/${mercuryConfig.operations.length}`);
  }

  /** ============================================================
   *  INTERACTIONS
   *  ============================================================ */
  private tryInteract() {
    if (this.busy) return;
    const st = this.nearestStation();
    if (!st) return;
    this.busy = true;
    this.interactPrompt.setText("");
    this.handle(st);
  }

  private handle(st: MStation) {
    switch (st.kind) {
      case "npc_defender":
        return this.runSoul(0, st.doneFlag!);
      case "npc_pedant":
        return this.runSoul(1, st.doneFlag!);
      case "npc_casuist":
        return this.runSoul(2, st.doneFlag!);
      case "puzzle_syllogism":
        return this.runSyllogismPuzzle(st);
      case "puzzle_refutation":
        return this.runRefutationPuzzle(st);
      case "puzzle_silence":
        return this.runSilencePuzzle(st);
      case "chalkboard":
        return this.runChalkboard(st);
      case "statue":
        return this.runStatue();
      case "scrolls":
        return this.runScrolls();
      case "crack_chamber":
        return this.runCrack();
      case "trial_door":
        return this.tryEnterTrial();
      case "exit_stairs":
        return this.toHub();
    }
  }

  // ---- Soul case (uses config dialog) ----
  private runSoul(i: number, doneFlag: string) {
    if (this.mSave.flags[doneFlag]) {
      runDialog(
        this,
        [{ who: mercuryConfig.souls[i].name, text: "I have nothing more for you today." }],
        () => {
          this.busy = false;
        },
      );
      return;
    }
    const soul = mercuryConfig.souls[i];
    askSphere(this, soul.prompt, soul.options, (picked) => {
      if (picked.flag) this.mSave.flags[picked.flag] = true;
      if (picked.conviction) this.mSave.convictions[picked.conviction] = true;
      this.mSave.flags[doneFlag] = true;
      writeSave(this.mSave);
      const st = this.stations.find((s) => s.doneFlag === doneFlag);
      if (st) this.markStationResolved(st);
      this.busy = false;
    });
  }

  // ---- PUZZLE 1: SYLLOGISM (Proof) ----
  // Player picks 3 premises in correct order to build a valid argument.
  private runSyllogismPuzzle(st: MStation) {
    if (st.doneFlag && this.mSave.flags[st.doneFlag]) {
      runDialog(this, [{ who: "?", text: "The proof stands. Mercury is satisfied." }], () => {
        this.busy = false;
      });
      return;
    }
    runDialog(
      this,
      [
        { who: "?", text: "A scaffold of premises stands waiting." },
        { who: "?", text: "Build a syllogism: MAJOR → MINOR → CONCLUSION." },
      ],
      () => this.syllogismRound1(st),
    );
  }

  private syllogismRound1(st: MStation) {
    runInquiry(
      this,
      { who: "?", text: "PICK THE MAJOR PREMISE" },
      [
        { choice: "ask", label: "All souls forget.", reply: "A wide claim. It will hold or break." },
        { choice: "ask", label: "I am tired.", reply: "Personal. Not a major premise." },
        { choice: "ask", label: "Towers are tall.", reply: "True. Useless here." },
      ],
      (p1) => {
        const p1ok = p1.label === "All souls forget.";
        runInquiry(
          this,
          { who: "?", text: "PICK THE MINOR PREMISE" },
          [
            { choice: "ask", label: "I am a soul.", reply: "Connects to the major." },
            { choice: "ask", label: "I remember everything.", reply: "Contradicts the major." },
            { choice: "ask", label: "Mercury is cold.", reply: "Unrelated." },
          ],
          (p2) => {
            const p2ok = p2.label === "I am a soul.";
            runInquiry(
              this,
              { who: "?", text: "DRAW THE CONCLUSION" },
              [
                { choice: "ask", label: "Therefore I forget.", reply: "Clean. The proof closes." },
                { choice: "ask", label: "Therefore I am cold.", reply: "Non sequitur." },
                { choice: "ask", label: "Therefore Mercury forgets me.", reply: "Reversed." },
              ],
              (p3) => {
                const p3ok = p3.label === "Therefore I forget.";
                const valid = p1ok && p2ok && p3ok;
                if (valid) {
                  this.mSave.stats.clarity += 1;
                  if (st.opId) markOpDone(this.mSave, "mercury", st.opId);
                  if (st.doneFlag) this.mSave.flags[st.doneFlag] = true;
                  writeSave(this.mSave);
                  this.refreshStatus();
                  this.markStationResolved(st);
                  this.refreshChamberGlow();
                  getAudio().sfx("resolve");
                  runDialog(
                    this,
                    [
                      { who: "?", text: "The syllogism completes. The Tower exhales." },
                      { who: "SORYN", text: "And yet — the major premise was an assumption." },
                    ],
                    () => {
                      this.busy = false;
                    },
                  );
                } else {
                  getAudio().sfx("cancel");
                  runDialog(
                    this,
                    [
                      { who: "?", text: "The proof collapses. The premises were misaligned." },
                      { who: "?", text: "Try again when you can read the joints." },
                    ],
                    () => {
                      this.busy = false;
                    },
                  );
                }
              },
            );
          },
        );
      },
    );
  }

  // ---- PUZZLE 2: REFUTATION ----
  // Player must locate the broken joint in a flawed argument.
  private runRefutationPuzzle(st: MStation) {
    if (st.doneFlag && this.mSave.flags[st.doneFlag]) {
      runDialog(this, [{ who: "?", text: "You have already pulled this argument apart." }], () => {
        this.busy = false;
      });
      return;
    }
    runDialog(
      this,
      [
        { who: "?", text: "An argument hangs in the air, suspiciously confident." },
        { who: "?", text: '"I am always honest. I just told you I am always honest. Therefore I am honest."' },
        { who: "?", text: "Find the broken joint." },
      ],
      () =>
        runInquiry(
          this,
          { who: "?", text: "WHERE DOES IT FAIL?" },
          [
            { choice: "ask", label: "It assumes its conclusion.", reply: "Yes — circular. The joint snaps." },
            { choice: "ask", label: "It uses the word 'always'.", reply: "A symptom, not the joint." },
            { choice: "ask", label: "It is too short.", reply: "Length is not the flaw." },
            { choice: "ask", label: "Nothing — it is fine.", reply: "Then it owns you." },
          ],
          (picked) => {
            const ok = picked.label.startsWith("It assumes");
            if (ok) {
              this.mSave.stats.courage += 1;
              this.mSave.convictions["i_can_unknow"] = true;
              if (st.opId) markOpDone(this.mSave, "mercury", st.opId);
              if (st.doneFlag) this.mSave.flags[st.doneFlag] = true;
              writeSave(this.mSave);
              this.refreshStatus();
              this.markStationResolved(st);
              this.refreshChamberGlow();
              getAudio().sfx("resolve");
              runDialog(
                this,
                [{ who: "?", text: "The argument falls. You wobble afterward — that is honest." }],
                () => {
                  this.busy = false;
                },
              );
            } else {
              getAudio().sfx("cancel");
              runDialog(this, [{ who: "?", text: "The argument keeps standing. So do you." }], () => {
                this.busy = false;
              });
            }
          },
        ),
    );
  }

  // ---- PUZZLE 3: SILENCE ----
  // The player must NOT press anything for ~5 seconds. Movement breaks it.
  private runSilencePuzzle(st: MStation) {
    if (st.doneFlag && this.mSave.flags[st.doneFlag]) {
      runDialog(this, [{ who: "?", text: "You already sat. The Tower remembers." }], () => {
        this.busy = false;
      });
      return;
    }
    runDialog(
      this,
      [
        { who: "?", text: "Sit. Do not press. Do not speak." },
        { who: "?", text: "Hold for five breaths." },
      ],
      () => this.silenceTimer(st),
    );
  }

  private silenceTimer(st: MStation) {
    const total = 5000;
    const startX = this.rowan.x;
    const startY = this.rowan.y;

    // UI box
    const box = drawGBCBox(this, 30, 60, 100, 28, 220);
    const label = new GBCText(this, 36, 64, "SIT IN SILENCE", {
      color: COLOR.textGold,
      depth: 221,
    });
    const bar = this.add.rectangle(36, 78, 0, 4, COLD).setOrigin(0, 0).setDepth(221);
    this.add
      .rectangle(36, 78, 88, 4)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLD, 0.5)
      .setDepth(221);
    const sub = new GBCText(this, 36, 84, "DO NOT MOVE OR PRESS", {
      color: COLOR.textDim,
      depth: 221,
    });

    const elapsed = { v: 0 };
    let broke = false;

    const onBreak = () => {
      if (broke) return;
      broke = true;
      cleanup(false);
    };

    // Any input breaks silence
    const downHandler = () => onBreak();
    this.input.keyboard?.on("keydown", downHandler);
    this.events.on("vinput-action", onBreak);
    this.events.on("vinput-down", onBreak);

    const cleanup = (success: boolean) => {
      this.input.keyboard?.off("keydown", downHandler);
      this.events.off("vinput-action", onBreak);
      this.events.off("vinput-down", onBreak);
      box.destroy();
      label.destroy();
      bar.destroy();
      sub.destroy();
      timer.remove();
      if (success) {
        this.mSave.stats.compassion += 1;
        this.mSave.convictions["silence_is_an_answer"] = true;
        if (st.opId) markOpDone(this.mSave, "mercury", st.opId);
        if (st.doneFlag) this.mSave.flags[st.doneFlag] = true;
        writeSave(this.mSave);
        this.refreshStatus();
        this.markStationResolved(st);
        this.refreshChamberGlow();
        getAudio().sfx("resolve");
        runDialog(
          this,
          [
            { who: "?", text: "You sat. The Tower stopped arguing for a moment." },
            { who: "SORYN", text: "Silence is also a position." },
          ],
          () => {
            this.busy = false;
          },
        );
      } else {
        getAudio().sfx("cancel");
        runDialog(
          this,
          [{ who: "?", text: "You moved. The argument resumes inside you." }],
          () => {
            this.busy = false;
          },
        );
      }
    };

    const timer = this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (broke) return;
        // Movement also breaks silence
        if (
          Math.abs(this.rowan.x - startX) > 0.5 ||
          Math.abs(this.rowan.y - startY) > 0.5
        ) {
          onBreak();
          return;
        }
        elapsed.v += 80;
        bar.width = Math.min(88, (elapsed.v / total) * 88);
        if (elapsed.v >= total) {
          cleanup(true);
        }
      },
    });
  }

  // ---- 4th OP: CHALKBOARD ARGUMENT ----
  // Doubles as the "argument" op. Reads the crossed-out proofs.
  private runChalkboard(st: MStation) {
    if (st.doneFlag && this.mSave.flags[st.doneFlag]) {
      runDialog(
        this,
        [{ who: "?", text: "Old proofs. All crossed out. None of them yours." }],
        () => {
          this.busy = false;
        },
      );
      return;
    }
    const op = mercuryConfig.operations.find((o) => o.id === "argument")!;
    askSphere(this, op.prompt, op.options, (picked) => {
      if (picked.flag) this.mSave.flags[picked.flag] = true;
      if (picked.conviction) this.mSave.convictions[picked.conviction] = true;
      if (op.rewardStat && picked.weight >= 2) {
        this.mSave.stats[op.rewardStat] += 1;
      }
      if (st.opId) markOpDone(this.mSave, "mercury", st.opId);
      if (st.doneFlag) this.mSave.flags[st.doneFlag] = true;
      writeSave(this.mSave);
      this.refreshStatus();
      this.markStationResolved(st);
      this.refreshChamberGlow();
      this.busy = false;
    });
  }

  // ---- ENV: STATUE (lore) ----
  private runStatue() {
    runDialog(
      this,
      [
        { who: "?", text: "A statue of a debater. The head is missing." },
        { who: "?", text: "An inscription at the base: 'HE WON EVERY ARGUMENT.'" },
        { who: "SORYN", text: "And lost everything else." },
      ],
      () => {
        this.busy = false;
      },
    );
  }

  // ---- ENV: SCROLLS (lore) ----
  private runScrolls() {
    runDialog(
      this,
      [
        { who: "?", text: "Scrolls. Most are unfinished sentences." },
        { who: "?", text: "One reads: 'I CAN NAME WHAT I DO NOT—'" },
        { who: "?", text: "The rest is torn." },
      ],
      () => {
        this.busy = false;
      },
    );
  }

  // ---- CRACKING QUESTION ----
  private runCrack() {
    if (this.mSave.flags.sphere_mercury_cracked) {
      runDialog(this, [{ who: "HERMAIA", text: "You have answered. The door is open." }], () => {
        this.busy = false;
      });
      return;
    }
    const need = mercuryConfig.operations.length;
    const done = opsCompleted(
      this.mSave,
      "mercury",
      mercuryConfig.operations.map((o) => o.id),
    );
    if (done < need) {
      getAudio().sfx("cancel");
      runDialog(
        this,
        [
          { who: "SORYN", text: `Not yet. Sit with more of the work first. (${done}/${need})` },
        ],
        () => {
          this.busy = false;
        },
      );
      return;
    }
    const cq = mercuryConfig.crackingQuestion;
    askSphere(this, cq.prompt, cq.options, (picked) => {
      if (picked.flag) this.mSave.flags[picked.flag] = true;
      if (picked.conviction) this.mSave.convictions[picked.conviction] = true;
      this.mSave.flags.sphere_mercury_cracked = true;
      writeSave(this.mSave);
      this.revealTrueNames();
      runDialog(
        this,
        [
          { who: "HERMAIA", text: "Named. The Trial door is unsealed." },
          { who: "SORYN", text: "When you are ready. The door hums above." },
        ],
        () => {
          this.busy = false;
        },
      );
    });
  }

  /**
   * Update chamber readiness visuals. When readiness flips for the first
   * time this visit, run a one-shot ignition sequence (altar bloom, sigil
   * warm-up, trial-door hum, Soryn beat). After that, keep the persistent
   * altar pulse and trial-door hum alive.
   *
   * @param force  Allow the routine to run on initial create() even if no
   *               op was just completed.
   */
  private refreshChamberGlow(force = false) {
    const ready =
      opsCompleted(
        this.mSave,
        "mercury",
        mercuryConfig.operations.map((o) => o.id),
      ) >= mercuryConfig.operations.length;
    if (!ready) return;
    if (!this.chamberAltar) return;

    // First-time ignition: ceremonial.
    if (!this.chamberReadyShown) {
      this.chamberReadyShown = true;

      // Sharp bloom on the altar.
      this.chamberAltar.setFillStyle(COLD, 1);
      this.chamberAltar.setStrokeStyle(2, WARM, 1);
      const burst = this.add
        .circle(this.chamberAltar.x, this.chamberAltar.y, 6, WARM, 0.5)
        .setDepth(9);
      this.tweens.add({
        targets: burst,
        scale: 5,
        alpha: 0,
        duration: 600,
        onComplete: () => burst.destroy(),
      });

      // Sigil warms up to gold for one breath.
      this.chamberSigil?.forEach((g) => {
        const anyG = g as Phaser.GameObjects.Shape;
        if ("setFillStyle" in anyG) {
          (anyG as Phaser.GameObjects.Rectangle).setFillStyle(WARM, 0.95);
        }
      });
      this.time.delayedCall(900, () => {
        this.chamberSigil?.forEach((g) => {
          const anyG = g as Phaser.GameObjects.Shape;
          if ("setFillStyle" in anyG) {
            (anyG as Phaser.GameObjects.Rectangle).setFillStyle(COLD, 0.85);
          }
        });
      });

      getAudio().sfx("resolve");

      // Persistent altar pulse — slow and stable.
      this.chamberPulseTween?.stop();
      this.chamberPulseTween = this.tweens.add({
        targets: this.chamberAltar,
        alpha: 0.65,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });

      // Trial door gains a stronger hum.
      this.trialDoorHumTween?.stop();
      this.trialGlow.setFillStyle(COLD, 0.6);
      this.trialDoorHumTween = this.tweens.add({
        targets: this.trialGlow,
        scale: 1.6,
        alpha: 0.85,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });

      // Soryn beat — only on actual ignition, not on revisit.
      if (!force && !this.busy) {
        this.busy = true;
        this.time.delayedCall(700, () => {
          runDialog(
            this,
            [
              { who: "SORYN", text: "The Tower has finished arranging its premise." },
              { who: "SORYN", text: "The Question is ready. The door above remembers." },
            ],
            () => {
              this.busy = false;
            },
          );
        });
      }
      return;
    }

    // Already-ignited revisit: keep persistent pulses alive if missing.
    if (!this.chamberPulseTween && this.chamberAltar) {
      this.chamberPulseTween = this.tweens.add({
        targets: this.chamberAltar,
        alpha: 0.65,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
    if (!this.trialDoorHumTween && this.trialGlow) {
      this.trialGlow.setFillStyle(COLD, 0.6);
      this.trialDoorHumTween = this.tweens.add({
        targets: this.trialGlow,
        scale: 1.6,
        alpha: 0.85,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
  }

  /**
   * Visually mark a station as resolved immediately on success — no scene
   * reload required. Each station type gets its own settled feel.
   */
  private markStationResolved(st: MStation) {
    if (!st.visual?.length) return;
    for (const v of st.visual) {
      const anyV = v as Phaser.GameObjects.Shape;
      if ("setAlpha" in anyV) (anyV as Phaser.GameObjects.Rectangle).setAlpha(0.55);
    }
    const flash = this.add.circle(st.x, st.y - 4, 4, COLD, 0.5).setDepth(30);
    this.tweens.add({
      targets: flash,
      scale: 4,
      alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy(),
    });

    // Chalkboard gets a visible "resolved" mark — a bright underline.
    if (st.kind === "chalkboard") {
      this.add
        .rectangle(st.x, st.y + 5, 12, 1, WARM, 1)
        .setDepth(11);
    }
    // Puzzle plinths leave a quiet residual top mark.
    if (
      st.kind === "puzzle_syllogism" ||
      st.kind === "puzzle_refutation" ||
      st.kind === "puzzle_silence"
    ) {
      this.add.circle(st.x, st.y - 4, 1, WARM, 0.9).setDepth(12);
    }
    // NPC stations get a brief settled halo.
    if (st.kind.startsWith("npc_")) {
      const halo = this.add
        .circle(st.x, st.y - 2, 8, COLD, 0.0)
        .setStrokeStyle(1, COLD, 0.5)
        .setDepth(14);
      this.tweens.add({
        targets: halo,
        scale: 1.6,
        alpha: { from: 0.6, to: 0 },
        duration: 1000,
        onComplete: () => halo.destroy(),
      });
    }
  }

  /**
   * Lightweight ambient bark loop. One bark on screen at a time, only
   * fires while the player is not busy and the soul is still unsolved.
   */
  private startAmbientBarks() {
    this.ambientBarkEvent?.remove(false);
    this.ambientBarkEvent = this.time.addEvent({
      delay: Phaser.Math.Between(5000, 8000),
      loop: true,
      callback: () => {
        if (this.busy || this.activeBark) return;
        const souls = this.stations.filter(
          (s) =>
            (s.kind === "npc_defender" ||
              s.kind === "npc_pedant" ||
              s.kind === "npc_casuist") &&
            !(s.doneFlag && this.mSave.flags[s.doneFlag]),
        );
        if (!souls.length) return;
        const st = Phaser.Utils.Array.GetRandom(souls) as MStation;
        const lines =
          MERCURY_BARKS[st.kind as "npc_defender" | "npc_pedant" | "npc_casuist"];
        const line = Phaser.Utils.Array.GetRandom(lines);
        const bark = new GBCText(this, st.x - 22, st.y - 20, line, {
          color: COLOR.textDim,
          depth: 40,
          maxWidthPx: 64,
        });
        this.activeBark = bark;
        this.tweens.add({
          targets: bark.obj,
          alpha: 0,
          y: st.y - 30,
          duration: 1800,
          onComplete: () => {
            bark.destroy();
            if (this.activeBark === bark) this.activeBark = undefined;
          },
        });
      },
    });
  }

  /**
   * Reveal hidden true-name captions next to the room's nameable objects.
   * Triggered when Mercury is cracked. This is the local payoff for NAME:
   * the verb makes hidden conceptual structure visible inside the act.
   */
  private revealTrueNames() {
    if (this.trueNameLabels.length) return; // idempotent
    for (const tn of MERCURY_TRUE_NAMES) {
      const st = this.stations.find((s) => s.kind === tn.kind);
      if (!st) continue;
      const label = new GBCText(this, st.x - 28, st.y + tn.dy, tn.name, {
        color: COLOR.textGold,
        depth: 18,
        maxWidthPx: 60,
      });
      label.obj.setAlpha(0);
      this.tweens.add({
        targets: label.obj,
        alpha: 0.85,
        duration: 900,
        ease: "Sine.inOut",
      });
      this.trueNameLabels.push(label);
    }
  }

  private tryEnterTrial() {
    if (!this.mSave.flags.sphere_mercury_cracked) {
      getAudio().sfx("cancel");
      runDialog(
        this,
        [
          { who: "SORYN", text: "The door is sealed. Face the question first." },
        ],
        () => {
          this.busy = false;
        },
      );
      return;
    }
    getAudio().sfx("confirm");
    gbcWipe(this, () =>
      this.scene.start("MercuryTrial", { save: this.mSave }),
    );
  }

  private toHub() {
    if (this.busy) return;
    this.mSave.scene = "MetaxyHub";
    writeSave(this.mSave);
    gbcWipe(this, () => this.scene.start("MetaxyHub", { save: this.mSave }));
  }
}

/** ============================================================
 *  MERCURY TRIAL — Three Doors of Naming
 *  ============================================================
 *  Hand-authored over the SphereTrialScene contract:
 *  Three glowing doors stand in HERMAIA's chamber. Each door, when
 *  approached, presents one trial round (a thing arriving wearing a
 *  face). The player walks to each in turn. After all three are named,
 *  Hermaia weighs the score.
 */
export class MercuryTrialScene extends Phaser.Scene {
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private inputState!: InputState;
  private doors: { x: number; y: number; idx: number; done: boolean; visual: Phaser.GameObjects.Arc; label: GBCText }[] = [];
  private interactPrompt!: GBCText;
  private hint!: GBCText;
  private busy = false;
  private mScore = 0;
  private mSave!: SaveSlot;
  private chamberSigilSegs: Phaser.GameObjects.Rectangle[] = [];
  private hermaiaPresentation?: EncounterPresentationHandle;

  constructor() {
    super("MercuryTrial");
  }

  init(data: { save: SaveSlot }) {
    this.mSave = data.save;
    this.mSave.scene = "MercuryTrial";
    this.mSave.act = ACT_BY_SCENE.MercuryTrial;
    writeSave(this.mSave);
    this.doors = [];
    this.busy = false;
    this.mScore = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor(mercuryConfig.bg);
    this.cameras.main.fadeIn(500);
    spawnMotes(this, { count: 18, color: mercuryConfig.accent, alpha: 0.5 });

    attachHUD(this, () => this.mSave.stats);
    setSceneSnapshot({
      key: "MercuryTrial",
      label: "Mercury — Hermaia's Trial",
      act: ACT_BY_SCENE.MercuryTrial ?? 4,
      zone: "Hermaia's Trial",
      nodes: null,
      marker: null,
    });

    // Title
    const rawTitle = "HERMAIA'S TRIAL";
    const titleText = fitSingleLineText(rawTitle, GBC_W - 12);
    const titleX = Math.floor((GBC_W - measureText(titleText)) / 2);
    new GBCText(this, titleX, 4, titleText, {
      color: COLOR.textGold,
      depth: 50,
    });

    // Cumulative chamber sigil — gains a segment per door named.
    this.chamberSigilSegs = [];
    for (let s = 0; s < 3; s++) {
      const seg = this.add
        .rectangle(GBC_W / 2 - 12 + s * 12, 22, 8, 2, COLD, 0.18)
        .setDepth(8);
      this.chamberSigilSegs.push(seg);
    }

    // Three doors — each carries its own visual character.
    // Doubt: cool, flickering, unstable.
    // Certainty: rigid, solid, stronger glow.
    // Silence: dimmer, slower, quieter.
    const ys = 50;
    const xs = [32, 80, 128];
    const labels = ["DOUBT", "CERTAINTY", "SILENCE"];
    const colors = [0x88a8d8, 0xe8c890, 0x8090b0];
    const alphas = [0.7, 0.95, 0.55];
    const pulseDur = [700, 1400, 1900];
    const easings = ["Sine.inOut", "Quad.inOut", "Sine.inOut"];
    for (let i = 0; i < 3; i++) {
      const arc = this.add.circle(xs[i], ys, 10, colors[i], alphas[i]).setDepth(10);
      arc.setStrokeStyle(i === 1 ? 2 : 1, 0xffffff, i === 1 ? 0.8 : 0.5);
      // Door frame — Certainty's frame is heavier.
      this.add
        .rectangle(xs[i], ys + 14, 18, i === 1 ? 5 : 4, STONE_DARK)
        .setDepth(9);
      // Pulse — flicker for Doubt, slow breath for Silence.
      this.tweens.add({
        targets: arc,
        scale: i === 0 ? 1.35 : i === 1 ? 1.1 : 1.05,
        alpha: i === 0 ? 0.35 : i === 1 ? 0.7 : 0.35,
        duration: pulseDur[i],
        yoyo: true,
        repeat: -1,
        ease: easings[i],
      });
      const lbl = new GBCText(this, xs[i] - 14, ys + 18, labels[i], {
        color: COLOR.textDim,
        depth: 11,
      });
      this.doors.push({ x: xs[i], y: ys, idx: i, done: false, visual: arc, label: lbl });
    }

    // Player
    this.rowanShadow = this.add.ellipse(GBC_W / 2, GBC_H - 22, 10, 3, 0x000000, 0.4).setDepth(19);
    this.rowan = makeRowan(this, GBC_W / 2, GBC_H - 24, "soul").setDepth(20);
    this.inputState = new InputState(this);

    // Hint band
    this.add.rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85).setOrigin(0, 0).setDepth(199);
    this.hint = new GBCText(this, 4, GBC_H - 9, "WALK TO A DOOR", {
      color: COLOR.textDim,
      depth: 200,
    });
    this.interactPrompt = new GBCText(this, 0, 0, "", {
      color: COLOR.textGold,
      depth: 60,
    });

    onActionDown(this, "action", () => this.tryInteract());
    this.events.on("vinput-action", () => this.tryInteract());

    // Hermaia presence presides over the trial chamber from the top center.
    this.hermaiaPresentation = createEncounterPresentation(
      this,
      GBC_W / 2,
      22,
      HERMAIA_PROFILE,
    );

    this.busy = true;
    this.time.delayedCall(500, () => {
      this.hermaiaPresentation?.introOnce(
        "encounter_seen_hermaia_trial",
        this.mSave,
      );
      runDialog(this, mercuryConfig.trialOpening, () => {
        this.busy = false;
      });
    });
  }

  update(_t: number, delta: number) {
    if (this.busy) {
      this.interactPrompt.setText("");
      return;
    }
    const speed = 0.04 * delta;
    const i = this.inputState.poll();
    let dx = 0;
    let dy = 0;
    if (i.left) dx -= speed;
    if (i.right) dx += speed;
    if (i.up) dy -= speed;
    if (i.down) dy += speed;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x + dx, 8, GBC_W - 8);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y + dy, 30, GBC_H - 14);
    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    const near = this.nearestDoor();
    if (near && !near.done) {
      this.interactPrompt.setText("[A] NAME");
      this.interactPrompt.setPosition(this.rowan.x - 12, this.rowan.y - 18);
      this.hint.setText(`Door of ${this.doorLabel(near.idx)}`);
      this.hint.setColor(COLOR.textGold);
    } else {
      this.interactPrompt.setText("");
      const remaining = this.doors.filter((d) => !d.done).length;
      this.hint.setText(remaining === 0 ? "ALL DOORS NAMED" : `${remaining} DOORS REMAIN`);
      this.hint.setColor(COLOR.textDim);
    }
  }

  private doorLabel(idx: number): string {
    return ["Doubt", "Certainty", "Silence"][idx];
  }

  private nearestDoor() {
    let best: typeof this.doors[number] | null = null;
    let bestD = 18;
    for (const d of this.doors) {
      if (d.done) continue;
      const dist = Phaser.Math.Distance.Between(this.rowan.x, this.rowan.y, d.x, d.y);
      if (dist < bestD) {
        best = d;
        bestD = dist;
      }
    }
    return best;
  }

  private tryInteract() {
    if (this.busy) return;
    const door = this.nearestDoor();
    if (!door) return;
    this.busy = true;
    this.interactPrompt.setText("");
    this.runDoorRound(door);
  }

  private runDoorRound(door: { idx: number; done: boolean; visual: Phaser.GameObjects.Arc; label: GBCText }) {
    const round = mercuryConfig.trialRounds[door.idx];
    askSphere(this, round.prompt, round.options, (picked) => {
      if (picked.flag) this.mSave.flags[picked.flag] = true;
      if (picked.conviction) this.mSave.convictions[picked.conviction] = true;
      this.mScore += picked.weight;
      door.done = true;

      // Brief collapse/exhale on the door, then leave a quiet seal ring.
      this.tweens.add({
        targets: door.visual,
        scale: 0.6,
        alpha: 0.18,
        duration: 350,
        ease: "Quad.in",
      });
      const seal = this.add
        .circle(door.visual.x, door.visual.y, 8, COLD, 0)
        .setStrokeStyle(1, COLOR.textGold === "#e8c890" ? 0xe8c890 : 0xffd070, 0.7)
        .setDepth(11);
      this.tweens.add({
        targets: seal,
        scale: 1.4,
        alpha: { from: 0.9, to: 0.4 },
        duration: 600,
      });

      door.label.setColor(COLOR.textGold);
      door.label.setText("NAMED");
      getAudio().sfx("resolve");

      // Cumulative chamber indicator — light one sigil segment per name.
      const namedCount = this.doors.filter((d) => d.done).length;
      const seg = this.chamberSigilSegs[namedCount - 1];
      if (seg) {
        seg.setFillStyle(0xe8c890, 0.95);
        this.tweens.add({
          targets: seg,
          scale: { from: 1.5, to: 1 },
          duration: 500,
          ease: "Back.out",
        });
      }

      writeSave(this.mSave);

      const remaining = this.doors.filter((d) => !d.done).length;
      if (remaining === 0) {
        // Brief ceremonial weighing beat before pass/fail.
        this.time.delayedCall(500, () => {
          runDialog(
            this,
            [
              { who: "HERMAIA", text: "Three names. I weigh them." },
            ],
            () => this.resolve(),
          );
        });
      } else {
        this.busy = false;
      }
    });
  }

  private resolve() {
    const max = mercuryConfig.trialRounds.length * 3;
    const threshold = Math.ceil(max * 0.5);
    if (this.mScore >= threshold) return this.pass();
    return this.fail();
  }

  private pass() {
    this.mSave.flags[trialPassedKey("mercury")] = true;
    this.mSave.garmentsReleased = { ...this.mSave.garmentsReleased, mercury: true };
    this.mSave.sphereVerbs = { ...this.mSave.sphereVerbs, name: true };
    if (!this.mSave.relics.includes(mercuryConfig.inscription)) {
      this.mSave.relics.push(mercuryConfig.inscription);
    }
    writeSave(this.mSave);

    // Mercury seal mark — a quiet expanding ring left at the chamber center
    // so the trial space remembers Hermaia's verdict, not just the dialog.
    this.hermaiaPresentation?.pulse();
    const seal = this.add
      .circle(GBC_W / 2, 22, 5, HERMAIA_PROFILE.palette.primary, 0.22)
      .setStrokeStyle(1, HERMAIA_PROFILE.palette.glow, 0.6)
      .setDepth(40);
    this.tweens.add({
      targets: seal,
      scale: { from: 1, to: 2.4 },
      alpha: { from: 0.22, to: 0.05 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    runDialog(this, mercuryConfig.trialPass, () => {
      gbcWipe(this, () => this.scene.start("MetaxyHub", { save: this.mSave }));
    });
  }

  private fail() {
    this.mSave.coherence = Math.max(0, this.mSave.coherence - 15);
    writeSave(this.mSave);
    runDialog(this, mercuryConfig.trialFail, () => {
      gbcWipe(this, () =>
        this.scene.start("MercuryPlateau", { save: this.mSave }),
      );
    });
  }
}
