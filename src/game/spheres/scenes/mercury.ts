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
import { onActionDown } from "../../controls";
import { getAudio } from "../../audio";
import { askSphere, SpherePlateauScene } from "../SpherePlateauScene";
import { SphereTrialScene } from "../SphereTrialScene";
import { mercuryConfig } from "../configs/mercury";
import { markOpDone, opsCompleted, trialPassedKey } from "../types";
import { runInquiry } from "../../inquiry";

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

type Station = {
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

/** ============================================================
 *  MERCURY PLATEAU — fully authored explorable scene
 *  ============================================================ */
export class MercuryPlateauScene extends SpherePlateauScene {
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private inputState!: InputState;
  private hint!: GBCText;
  private interactPrompt!: GBCText;
  private stations: Station[] = [];
  private busy = false;
  private statusText!: GBCText;
  private trialGlow!: Phaser.GameObjects.Arc;
  private mSave!: SaveSlot;

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

    // First-visit dialog
    if (!this.mSave.flags.sphere_mercury_seen) {
      this.mSave.flags.sphere_mercury_seen = true;
      writeSave(this.mSave);
      this.busy = true;
      this.time.delayedCall(500, () => {
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
      visual.push(altar);
      if (ready) {
        this.tweens.add({
          targets: altar,
          alpha: 0.6,
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
      }
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
      this.interactPrompt
        .setText(`[A] ${verb}`)
        .setPosition(this.rowan.x - 12, this.rowan.y - 18);
      this.hint.setText(this.hintForStation(near)).setColor(COLOR.textGold);
    } else {
      this.interactPrompt.setText("");
      this.hint.setText("WALK   B: HUB").setColor(COLOR.textDim);
    }
  }

  private nearestStation(): Station | null {
    let best: Station | null = null;
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

  private verbForStation(st: Station): string {
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

  private hintForStation(st: Station): string {
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

  private handle(st: Station) {
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
      this.busy = false;
    });
  }

  // ---- PUZZLE 1: SYLLOGISM (Proof) ----
  // Player picks 3 premises in correct order to build a valid argument.
  private runSyllogismPuzzle(st: Station) {
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

  private syllogismRound1(st: Station) {
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
                  this.mSave.stats.clarity = Math.min(9, this.mSave.stats.clarity + 1);
                  if (st.opId) markOpDone(this.mSave, "mercury", st.opId);
                  if (st.doneFlag) this.mSave.flags[st.doneFlag] = true;
                  writeSave(this.mSave);
                  this.refreshStatus();
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
  private runRefutationPuzzle(st: Station) {
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
              this.mSave.stats.courage = Math.min(9, this.mSave.stats.courage + 1);
              this.mSave.convictions["i_can_unknow"] = true;
              if (st.opId) markOpDone(this.mSave, "mercury", st.opId);
              if (st.doneFlag) this.mSave.flags[st.doneFlag] = true;
              writeSave(this.mSave);
              this.refreshStatus();
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
  private runSilencePuzzle(st: Station) {
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

  private silenceTimer(st: Station) {
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
        this.mSave.stats.compassion = Math.min(9, this.mSave.stats.compassion + 1);
        this.mSave.convictions["silence_is_an_answer"] = true;
        if (st.opId) markOpDone(this.mSave, "mercury", st.opId);
        if (st.doneFlag) this.mSave.flags[st.doneFlag] = true;
        writeSave(this.mSave);
        this.refreshStatus();
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
  private runChalkboard(st: Station) {
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
        this.mSave.stats[op.rewardStat] = Math.min(9, this.mSave.stats[op.rewardStat] + 1);
      }
      if (st.opId) markOpDone(this.mSave, "mercury", st.opId);
      if (st.doneFlag) this.mSave.flags[st.doneFlag] = true;
      writeSave(this.mSave);
      this.refreshStatus();
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

  private refreshChamberGlow() {
    const ready =
      opsCompleted(
        this.mSave,
        "mercury",
        mercuryConfig.operations.map((o) => o.id),
      ) >= mercuryConfig.operations.length;
    if (ready) {
      // visually rebuild altar glow — find the chamber visual
      const st = this.stations.find((s) => s.kind === "crack_chamber");
      if (st && st.visual && st.visual[0]) {
        const altar = st.visual[0] as Phaser.GameObjects.Rectangle;
        altar.setFillStyle(COLD, 0.9);
        altar.setStrokeStyle(1, COLD, 0.9);
      }
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
export class MercuryTrialScene extends SphereTrialScene {
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private inputState!: InputState;
  private doors: { x: number; y: number; idx: number; done: boolean; visual: Phaser.GameObjects.Arc; label: GBCText }[] = [];
  private interactPrompt!: GBCText;
  private hint!: GBCText;
  private busy = false;
  private mScore = 0;
  private mSave!: SaveSlot;

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

    // Title
    const rawTitle = "HERMAIA'S TRIAL";
    const titleText = fitSingleLineText(rawTitle, GBC_W - 12);
    const titleX = Math.floor((GBC_W - measureText(titleText)) / 2);
    new GBCText(this, titleX, 4, titleText, {
      color: COLOR.textGold,
      depth: 50,
    });

    // Three doors arranged across the chamber
    const ys = 50;
    const xs = [32, 80, 128];
    const labels = ["DOUBT", "CERTAINTY", "SILENCE"];
    for (let i = 0; i < 3; i++) {
      const arc = this.add.circle(xs[i], ys, 10, COLD, 0.8).setDepth(10);
      arc.setStrokeStyle(2, 0xffffff, 0.6);
      // Door frame
      this.add.rectangle(xs[i], ys + 14, 18, 4, STONE_DARK).setDepth(9);
      // Pulse
      this.tweens.add({
        targets: arc,
        scale: 1.2,
        alpha: 0.5,
        duration: 1100 + i * 200,
        yoyo: true,
        repeat: -1,
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

    this.busy = true;
    this.time.delayedCall(500, () => {
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
      this.interactPrompt
        .setText("[A] NAME")
        .setPosition(this.rowan.x - 12, this.rowan.y - 18);
      this.hint.setText(`Door of ${this.doorLabel(near.idx)}`).setColor(COLOR.textGold);
    } else {
      this.interactPrompt.setText("");
      const remaining = this.doors.filter((d) => !d.done).length;
      this.hint
        .setText(remaining === 0 ? "ALL DOORS NAMED" : `${remaining} DOORS REMAIN`)
        .setColor(COLOR.textDim);
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
      door.visual.setAlpha(0.25);
      door.label.setColor(COLOR.textGold).setText("NAMED");
      getAudio().sfx("resolve");
      writeSave(this.mSave);

      const remaining = this.doors.filter((d) => !d.done).length;
      if (remaining === 0) {
        this.time.delayedCall(400, () => this.resolve());
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
