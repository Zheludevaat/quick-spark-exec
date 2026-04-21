import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, spawnMotes } from "../gbcArt";
import { writeSave, clearSave } from "../save";
import type { Command, SaveSlot } from "../types";
import { attachHUD } from "./hud";
import { mountVesselHud } from "../athanor/vessel";
import { runInquiry } from "../inquiry";
import { getAudio, SONG_BOSS, SONG_EPILOGUE } from "../audio";
import { onActionDown, onDirection } from "../controls";
import {
  openingWhisper,
  phaseTaunt,
  addressReply,
  phase3Plan,
  endingTier,
  endingParagraphs,
  sorynBark,
  narratorLine,
  type SorynEvent,
} from "../act3/harvest";
import { unlockLore, showLoreToast } from "./lore";

type Phase = "composed" | "fractured" | "exposed" | "released";

const PHASE_LABEL: Record<Phase, string> = {
  composed: "PHASE 1/3 - COMPOSED",
  fractured: "PHASE 2/3 - FRACTURED",
  exposed: "PHASE 3/3 - EXPOSED",
  released: "RELEASED",
};

const PHASE_HUE: Record<Phase, number> = {
  composed: 0xffffff,
  fractured: 0xd88080,
  exposed: 0xc0c8e8,
  released: 0xa8e8c8,
};

const PHASE_FRAME: Record<Phase, number> = { composed: 0, fractured: 4, exposed: 6, released: 8 };

const CMDS_BASE: { label: string; cmd: Command }[] = [
  { label: "OBSERVE", cmd: "observe" },
  { label: "ADDRESS", cmd: "address" },
  { label: "REMEMBER", cmd: "remember" },
  { label: "RELEASE", cmd: "release" },
];
const CMD_WITNESS: { label: string; cmd: Command } = { label: "WITNESS", cmd: "witness" };
// Hidden ASCEND command — surfaces only if goldStone is held.
const CMD_ASCEND: { label: string; cmd: Command } = {
  label: "ASCEND",
  cmd: "transmute",
};

export class CuratedSelfScene extends Phaser.Scene {
  private save!: SaveSlot;
  private phase: Phase = "composed";
  private cmds: { label: string; cmd: Command }[] = [];
  private cmdTexts: GBCText[] = [];
  private cursor = 0;
  private busy = false;
  private boss!: Phaser.GameObjects.Container;
  private bossParts: Phaser.GameObjects.Sprite[] = [];
  private logText!: GBCText;
  private stateText!: GBCText;
  private cursorMark!: GBCText;
  private shadeLabel!: GBCText;
  private addressHits = 0;
  private witnessHits = 0;
  private exposedAddressHits = 0;
  private exposedReleaseHits = 0;
  private fragments: { sprite: Phaser.GameObjects.Arc; brightness: number; idx: number }[] = [];
  private brightestIdx = 0;
  private fragOrderProgress = 0;
  private missIdx = 0;
  private brightestTimer: Phaser.Time.TimerEvent | null = null;
  private satWithShades: string[] = [];
  private shadeFaceIdx = 0;
  private faceTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("CuratedSelf");
  }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.cmdTexts = [];
    this.cmds = [];
    this.phase = this.save.flags.curated_progress_exposed ? "exposed" : "composed";
    this.cursor = 0;
    this.busy = false;
    this.addressHits = this.phase === "exposed" ? 3 : 0;
    this.witnessHits = 0;
    this.exposedAddressHits = 0;
    this.exposedReleaseHits = 0;
    this.fragments = [];
    this.fragOrderProgress = this.phase === "exposed" ? 3 : 0;
    this.missIdx = 0;
    this.satWithShades = Object.entries(this.save.shadesEncountered ?? {})
      .filter(([, v]) => v === "sat_with")
      .map(([k]) => k);
    this.shadeFaceIdx = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor("#03040a");
    this.cameras.main.fadeIn(700);
    getAudio().music.play("boss", SONG_BOSS);

    // --- ART UPGRADE: The Astral Void & Shattered Mirrors ---

    // Ensure a 1x1 pixel texture for particle emitters
    if (!this.textures.exists("pixel")) {
      const pg = this.make.graphics({ x: 0, y: 0 }, false);
      pg.fillStyle(0xffffff, 1);
      pg.fillRect(0, 0, 2, 2);
      pg.generateTexture("pixel", 2, 2);
      pg.destroy();
    }

    // 1. Deep Void Gradient
    const sky = this.add.graphics().setDepth(0);
    const bands: [number, number][] = [
      [0x03040a, 12],
      [0x080a18, 16],
      [0x0c1228, 18],
      [0x121a38, 14],
      [0x182448, 10],
    ];
    let yy = 0;
    for (const [c, h] of bands) {
      sky.fillStyle(c, 1).fillRect(0, yy, GBC_W, h);
      yy += h;
    }

    // 2. Parallax Layer 1: Distant Nebula Dust
    this.add
      .particles(0, 0, "pixel", {
        x: { min: 0, max: GBC_W },
        y: { min: 0, max: 70 },
        lifespan: { min: 4000, max: 8000 },
        speedX: { min: -2, max: 2 },
        speedY: { min: -1, max: 1 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.15, end: 0 },
        tint: [0x4a2868, 0x2a2868, 0x6a3a8a],
        blendMode: "ADD",
        frequency: 100,
        advance: 5000,
      })
      .setDepth(1);

    // 3. Parallax Layer 2: Slowly drifting shattered glass/mirrors
    const glassLayer = this.add.graphics().setDepth(2);
    const shards: { x: number; y: number; pts: number[]; speed: number; rot: number; ang: number }[] = [];
    for (let i = 0; i < 8; i++) {
      shards.push({
        x: Phaser.Math.Between(0, GBC_W),
        y: Phaser.Math.Between(10, 60),
        pts: [
          0, 0,
          Phaser.Math.Between(4, 12), Phaser.Math.Between(-8, 4),
          Phaser.Math.Between(2, 8), Phaser.Math.Between(6, 14),
        ],
        speed: Phaser.Math.FloatBetween(0.05, 0.2),
        rot: Phaser.Math.FloatBetween(-0.01, 0.01),
        ang: Math.random() * Math.PI * 2,
      });
    }
    this.events.on("update", () => {
      glassLayer.clear();
      glassLayer.lineStyle(1, 0x88c0f0, 0.3);
      glassLayer.fillStyle(0x121634, 0.8);
      for (const s of shards) {
        s.x -= s.speed;
        s.ang += s.rot;
        if (s.x < -20) {
          s.x = GBC_W + 20;
          s.y = Phaser.Math.Between(10, 60);
        }
        glassLayer.beginPath();
        for (let j = 0; j < s.pts.length; j += 2) {
          const px = s.pts[j] * Math.cos(s.ang) - s.pts[j + 1] * Math.sin(s.ang);
          const py = s.pts[j] * Math.sin(s.ang) + s.pts[j + 1] * Math.cos(s.ang);
          if (j === 0) glassLayer.moveTo(s.x + px, s.y + py);
          else glassLayer.lineTo(s.x + px, s.y + py);
        }
        glassLayer.closePath();
        glassLayer.fillPath();
        glassLayer.strokePath();
      }
    });

    // 4. Ethereal Liquid Floor
    const floor = this.add.graphics().setDepth(3);
    floor.fillStyle(0x0a0c1a, 1).fillRect(0, 66, GBC_W, 20);
    floor.fillStyle(0x1c2150, 0.8).fillRect(0, 66, GBC_W, 1);
    const reflection = this.add
      .ellipse(GBC_W / 2, 71, 100, 8, 0x4a4a98, 0.3)
      .setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: reflection,
      scaleX: 1.1,
      alpha: 0.15,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // 5. Boss Aura — symmetrical, intimidating geometric rings
    const cx = GBC_W / 2,
      cy = 46;
    const auraOuter = this.add
      .ellipse(cx, cy, 60, 60, 0xffb060, 0)
      .setStrokeStyle(1, 0xffb060, 0.15)
      .setDepth(20);
    const auraMid = this.add
      .rectangle(cx, cy, 38, 38, 0xd84a4a, 0)
      .setStrokeStyle(1, 0xd84a4a, 0.25)
      .setAngle(45)
      .setDepth(21);
    const auraCore = this.add
      .circle(cx, cy, 14, 0xffe0a0, 0.15)
      .setDepth(22)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: auraOuter,
      scale: 1.1,
      rotation: 0.5,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.tweens.add({
      targets: auraMid,
      scale: 1.2,
      rotation: Phaser.Math.DegToRad(45) - 0.5,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.tweens.add({
      targets: auraCore,
      scale: 1.3,
      alpha: 0.25,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    // --- END ART UPGRADE ---

    // Drifting motes — warm and cool
    spawnMotes(this, {
      count: 8,
      color: 0xd86a6a,
      alpha: 0.45,
      driftY: -0.012,
      driftX: 0.002,
      depth: 30,
    });
    spawnMotes(this, {
      count: 6,
      color: 0x88c0f0,
      alpha: 0.35,
      driftY: -0.008,
      driftX: -0.003,
      depth: 31,
    });

    // Vignette — corners darken, focuses attention
    const vignette = this.add.graphics().setDepth(180);
    vignette.fillStyle(0x000000, 0.45);
    vignette.fillRect(0, 0, GBC_W, 4);
    vignette.fillRect(0, GBC_H - 4, GBC_W, 4);
    vignette.fillRect(0, 0, 4, GBC_H);
    vignette.fillRect(GBC_W - 4, 0, 4, GBC_H);

    // Right-anchored "CURATED SELF" plate, sits below the global top stat bar (y=0..13)
    drawGBCBox(this, GBC_W - 76, 15, 72, 12);
    new GBCText(this, GBC_W - 72, 17, "CURATED SELF", { color: COLOR.textWarn, depth: 101 });
    // Phase label with a tiny dark backing strip for legibility on the gradient.
    this.add
      .rectangle(2, 15, 78, 11, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setDepth(100);
    this.stateText = new GBCText(this, 4, 16, PHASE_LABEL[this.phase], {
      color: COLOR.textGold,
      depth: 101,
    });

    // --- ART UPGRADE: Multi-Part Boss Rig ---
    this.boss = this.add.container(GBC_W / 2, 46).setDepth(50);

    const halo = this.add.sprite(0, -10, "boss", 8).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.sprite(0, 0, "boss", 0);
    const armorL = this.add.sprite(-8, 2, "boss", 4).setTint(0x444444);
    const armorR = this.add.sprite(8, 2, "boss", 4).setTint(0x444444);

    this.bossParts = [halo, core, armorL, armorR];
    this.boss.add(this.bossParts);
    this.applyBossPhaseVisual(this.phase, true);

    this.tweens.add({
      targets: this.boss,
      y: 44,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    // --- END ART UPGRADE ---

    // Small label under boss for shade-face cycling readability.
    this.shadeLabel = new GBCText(this, GBC_W / 2 - 30, 60, "", {
      color: COLOR.textDim,
      depth: 101,
    });

    drawGBCBox(this, 0, 72, GBC_W, 34);
    this.logText = new GBCText(this, 4, 77, phaseTaunt(this.phase, this.save), {
      color: COLOR.textAccent,
      depth: 102,
      maxWidthPx: GBC_W - 10,
    });

    drawGBCBox(this, 0, 108, GBC_W, 28);
    this.cmds = [...CMDS_BASE];
    if (this.save.verbs.witness) this.cmds.push(CMD_WITNESS);
    if (this.save.goldStone) this.cmds.push(CMD_ASCEND);
    this.cmds.forEach((c, i) => {
      const pos = this.cmdPos(i);
      const t = new GBCText(this, pos.x + 8, pos.y, c.label, {
        color: COLOR.textLight,
        depth: 101,
      });
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerdown", () => this.choose(i));
      t.obj.setData("cmd", c.cmd);
      this.cmdTexts.push(t);
    });
    this.cursorMark = new GBCText(this, 8, 112, "▶", { color: COLOR.textGold, depth: 101 });
    this.refreshCursor();
    this.refreshAvailable();

    attachHUD(this, () => this.save.stats);
    // Mount the centered vessel plate so Act 3 reflects current stones,
    // shards, stains, gold, and ALN — without replaying any gain animations.
    mountVesselHud(this, this.save);

    // Opening whisper — fading inscription line.
    this.showWhisper(openingWhisper(this.save));
    this.speak("enter");

    onDirection(this, (d) => {
      if (d === "left") this.move(-1);
      if (d === "right") this.move(1);
      if (d === "up") this.move(-2);
      if (d === "down") this.move(2);
    });
    onActionDown(this, "action", () => this.choose(this.cursor));
    this.events.on("vinput-down", (dir: string) => {
      if (dir === "left") this.move(-1);
      if (dir === "right") this.move(1);
      if (dir === "up") this.move(-2);
      if (dir === "down") this.move(2);
    });
    this.events.on("vinput-action", () => this.choose(this.cursor));
  }

  /** Floating gold whisper that fades after a few seconds. */
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
      delay: 2400,
      onComplete: () => w.destroy(),
    });
  }

  /** Soryn line, or narrator if released — shown briefly above the boss area. */
  private speak(event: SorynEvent) {
    const line = sorynBark(this.save, event) ?? narratorLine(event);
    const isNarrator = this.save.sorynReleased;
    // Sit below the phase label / "CURATED SELF" plate (which end ~y=27).
    const bg = this.add
      .rectangle(2, 28, GBC_W - 8, 10, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setDepth(159);
    const t = new GBCText(this, 4, 28, line, {
      color: isNarrator ? COLOR.textGold : COLOR.textAccent,
      depth: 160,
      maxWidthPx: GBC_W - 8,
    });
    this.tweens.add({
      targets: [t.obj, bg],
      alpha: 0,
      duration: 1400,
      delay: 1800,
      onComplete: () => {
        t.destroy();
        bg.destroy();
      },
    });
  }

  private cmdPos(i: number) {
    if (i < 4) return { x: 8 + (i % 2) * 70, y: 112 + Math.floor(i / 2) * 9 };
    if (i === 4) return { x: 56, y: 130 };
    return { x: 100, y: 130 }; // ASCEND slot
  }

  /** Greys out commands that are not valid in the current phase. */
  private refreshAvailable() {
    const valid = (cmd: Command) => {
      if (cmd === "transmute") return this.save.goldStone; // ASCEND always available if held
      if (this.phase === "composed") return cmd === "address" || cmd === "release";
      if (this.phase === "fractured") return cmd === "observe" || cmd === "release";
      if (this.phase === "exposed") {
        const plan = phase3Plan(this.save);
        if (cmd === "witness") return plan.needs.witness > 0;
        if (cmd === "address") return plan.needs.address > 0;
        if (cmd === "release") return true;
        return false;
      }
      return false;
    };
    this.cmdTexts.forEach((t, i) => {
      const cmd = this.cmds[i].cmd;
      if (i === this.cursor) return;
      const isAscend = cmd === "transmute";
      t.setColor(
        valid(cmd) ? (isAscend ? COLOR.textGold : COLOR.textLight) : COLOR.textDim,
      );
    });
  }

  private move(d: number) {
    if (this.busy) return;
    const n = this.cmds.length;
    this.cursor = (this.cursor + d + n) % n;
    getAudio().sfx("cursor");
    this.refreshCursor();
    this.refreshAvailable();
  }
  private refreshCursor() {
    this.cmdTexts.forEach((t, i) =>
      t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textLight),
    );
    const pos = this.cmdPos(this.cursor);
    this.cursorMark.setPosition(pos.x, pos.y);
  }

  // ============================================================================
  // PHASE 1 — COMPOSED: ADDRESS x3 (replies name owned convictions)
  // ============================================================================
  private handleComposed(cmd: Command) {
    if (cmd === "address") {
      this.addressHits++;
      this.cameras.main.flash(140, 200, 220, 255);
      this.sparkBurst(GBC_W / 2, 46, 0xffd070, 10);
      getAudio().sfx("resolve");
      this.logText.setText(addressReply(this.save, this.addressHits));
      this.speak("phase1_hit");
      if (this.addressHits >= 3) {
        this.time.delayedCall(900, () => this.enterPhase("fractured"));
      } else {
        this.busy = false;
      }
    } else if (cmd === "remember") {
      // REMEMBER softens the room — names a sat-with shade if you have any.
      const sat = this.satWithShades[0];
      if (sat) {
        const pretty = sat.replace(/_/g, " ").toUpperCase();
        this.logText.setText(`You remember: ${pretty}. The image flickers, less sure.`);
      } else {
        this.logText.setText("You remember nothing in particular. The pose holds.");
      }
      getAudio().sfx("confirm");
      this.busy = false;
    } else if (cmd === "release") {
      this.logText.setText("You step back. The image only steadies. ADDRESS to crack it.");
      getAudio().sfx("cancel");
      this.busy = false;
    } else {
      this.logText.setText(this.missQuip());
      this.cameras.main.shake(80, 0.003);
      getAudio().sfx("miss");
      this.busy = false;
    }
  }

  // ============================================================================
  // PHASE 2 — FRACTURED: OBSERVE the brightest; boss face cycles through sat-with shades
  // ============================================================================
  private applyBossPhaseVisual(p: Phase, immediate = false) {
    const [halo, core, armorL, armorR] = this.bossParts;
    core.setTint(PHASE_HUE[p]);

    const resetBase = () => {
      halo.setPosition(0, -10);
      halo.setScale(1);
      halo.setAlpha(0.5);
      core.setPosition(0, 0);
      core.setScale(1);
      core.setAlpha(1);
      core.setAngle(0);
      armorL.setPosition(-8, 2);
      armorL.setScale(1);
      armorL.setAlpha(1);
      armorL.setAngle(0);
      armorR.setPosition(8, 2);
      armorR.setScale(1);
      armorR.setAlpha(1);
      armorR.setAngle(0);
    };

    if (immediate) {
      resetBase();
      if (p === "fractured") {
        armorL.setPosition(-18, 2);
        armorL.setAngle(-15);
        armorR.setPosition(18, 2);
        armorR.setAngle(15);
        halo.setScale(1.5);
        halo.setAlpha(0.8);
      } else if (p === "exposed" || p === "released") {
        armorL.setPosition(-18, 150);
        armorL.setAngle(-15);
        armorL.setAlpha(0);
        armorR.setPosition(18, 150);
        armorR.setAngle(15);
        armorR.setAlpha(0);
        core.setScale(0.8);
        halo.setScale(1.5);
        halo.setAlpha(0.8);
      }
      return;
    }

    if (p === "fractured") {
      this.tweens.add({ targets: armorL, x: -18, angle: -15, duration: 800, ease: "Back.out" });
      this.tweens.add({ targets: armorR, x: 18, angle: 15, duration: 800, ease: "Back.out" });
      this.tweens.add({
        targets: halo,
        scale: 1.5,
        alpha: 0.8,
        duration: 1000,
        yoyo: true,
        repeat: -1,
      });
    } else if (p === "exposed" || p === "released") {
      this.tweens.add({
        targets: [armorL, armorR],
        y: 150,
        rotation: 2,
        alpha: 0,
        duration: 1200,
        ease: "Cubic.in",
      });
      this.tweens.add({ targets: core, scale: 0.8, duration: 800 });
      this.tweens.add({
        targets: halo,
        scale: 1.5,
        alpha: 0.8,
        duration: 1000,
        yoyo: true,
        repeat: -1,
      });
    } else {
      resetBase();
    }
  }

  private enterPhase(p: Phase) {
    this.phase = p;
    this.stateText.setText(PHASE_LABEL[p]);
    this.logText.setText(phaseTaunt(p, this.save));
    this.applyBossPhaseVisual(p, false);

    // --- ART UPGRADE: Cinematic Phase Shift ---
    // 1. Visceral hit-stop
    this.tweens.timeScale = 0.2;
    this.time.delayedCall(150, () => {
      this.tweens.timeScale = 1.0;
    });

    // 2. Heavy Screen Shake & Flash
    this.cameras.main.shake(400, 0.015);
    this.cameras.main.flash(400, 255, 255, 255);

    // 3. Violent Aura Burst
    const burst = this.add
      .circle(GBC_W / 2, 46, 4, PHASE_HUE[p], 1)
      .setDepth(150)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: burst,
      scale: 25,
      alpha: 0,
      duration: 600,
      ease: "Expo.out",
      onComplete: () => burst.destroy(),
    });

    // 4. Boss sprite impact recoil
    this.boss.setScale(0.8, 1.3);
    this.tweens.add({
      targets: this.boss,
      scaleX: 1,
      scaleY: 1,
      duration: 600,
      ease: "Elastic.out",
    });
    // --- END ART UPGRADE ---

    this.refreshAvailable();
    if (p === "fractured") this.spawnFragments();
    if (p === "exposed") {
      this.cleanupFragments();
      this.faceTimer?.remove(false);
      this.faceTimer = null;
      this.shadeLabel.setText("");
      const plan = phase3Plan(this.save);
      this.shadeLabel.setText(`PLAN: ${plan.label}`);
    }
    this.busy = false;
  }

  /** Burst of small sparks at a point — used on successful hits. */
  private sparkBurst(x: number, y: number, color = 0xffd070, n = 8) {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const sp = this.add.rectangle(x, y, 1, 1, color, 1).setDepth(80);
      this.tweens.add({
        targets: sp,
        x: x + Math.cos(ang) * 14,
        y: y + Math.sin(ang) * 14,
        alpha: 0,
        duration: 500,
        ease: "Cubic.out",
        onComplete: () => sp.destroy(),
      });
    }
  }

  private spawnFragments() {
    this.cleanupFragments();
    const cx = GBC_W / 2,
      cy = 46;
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const fx = cx + Math.cos(ang) * 16;
      const fy = cy + Math.sin(ang) * 6;
      const sprite = this.add.circle(fx, fy, 4, 0xd88080, 0.7).setDepth(45);
      this.fragments.push({ sprite, brightness: 0.5, idx: i });
    }
    this.boss.setVisible(false);
    this.cycleBrightest();
    this.cycleShadeFace();
  }

  /** Cycles the small label under the boss between sat-with shade names. */
  private cycleShadeFace() {
    if (this.phase !== "fractured") return;
    if (this.satWithShades.length === 0) {
      this.shadeLabel.setText("(no faces)");
    } else {
      const id = this.satWithShades[this.shadeFaceIdx % this.satWithShades.length];
      const pretty = id.replace(/_/g, " ").toUpperCase();
      this.shadeLabel.setText(`FACE: ${pretty}`);
      this.shadeFaceIdx++;
    }
    this.faceTimer?.remove(false);
    this.faceTimer = this.time.delayedCall(1800, () => this.cycleShadeFace());
  }

  private cycleBrightest() {
    if (this.phase !== "fractured") return;
    this.brightestIdx = Math.floor(Math.random() * 3);
    // sat_with shades shine luminous gold; others stay aggressive red.
    const luminous = this.satWithShades.length > 0;
    this.fragments.forEach((f, i) => {
      f.brightness = i === this.brightestIdx ? 1 : 0.4;
      this.tweens.add({
        targets: f.sprite,
        alpha: f.brightness,
        scale: i === this.brightestIdx ? 1.6 : 1,
        duration: 400,
      });
      f.sprite.fillColor =
        i === this.brightestIdx ? (luminous ? 0xffe098 : 0xffb060) : 0xd88080;
    });
    this.brightestTimer?.remove(false);
    this.brightestTimer = this.time.delayedCall(3000, () => this.cycleBrightest());
  }

  private cleanupFragments() {
    this.brightestTimer?.remove(false);
    this.brightestTimer = null;
    this.faceTimer?.remove(false);
    this.faceTimer = null;
    this.fragments.forEach((f) => f.sprite.destroy());
    this.fragments = [];
    this.boss.setVisible(true);
  }

  private handleFractured(cmd: Command) {
    if (cmd === "observe") {
      this.fragOrderProgress++;
      this.cameras.main.flash(140, 220, 220, 255);
      getAudio().sfx("resolve");
      const picked = this.fragments[this.brightestIdx];
      if (picked) {
        this.sparkBurst(picked.sprite.x, picked.sprite.y, 0xffe098, 10);
        this.tweens.add({ targets: picked.sprite, alpha: 0.15, scale: 0.6, duration: 500 });
      }
      this.logText.setText(
        `Fragment ${this.fragOrderProgress} witnessed. ${3 - this.fragOrderProgress} remain.`,
      );
      this.speak("phase2_hit");
      if (this.fragOrderProgress >= 3) {
        this.time.delayedCall(900, () => this.enterPhase("exposed"));
      } else {
        this.busy = false;
      }
    } else if (cmd === "release") {
      this.logText.setText("You release. The fragments hover, waiting.");
      getAudio().sfx("cancel");
      this.busy = false;
    } else {
      this.logText.setText("They re-merge briefly. OBSERVE the brightest piece.");
      this.cameras.main.shake(80, 0.003);
      this.fragments.forEach((f) =>
        this.tweens.add({ targets: f.sprite, alpha: 0.6, scale: 1, duration: 400 }),
      );
      getAudio().sfx("miss");
      this.busy = false;
    }
  }

  // ============================================================================
  // PHASE 3 — EXPOSED: verb plan keyed to weddingType
  // ============================================================================
  private handleExposed(cmd: Command) {
    const plan = phase3Plan(this.save);

    const tally = () => {
      const w = this.witnessHits >= plan.needs.witness;
      const a = this.exposedAddressHits >= plan.needs.address;
      const r = this.exposedReleaseHits >= plan.needs.release;
      return w && a && r;
    };

    if (cmd === "witness" && plan.needs.witness > 0) {
      this.witnessHits++;
      this.cameras.main.flash(220, 200, 220, 255);
      this.sparkBurst(GBC_W / 2, 46, 0xc8e0ff, 12);
      getAudio().sfx("resolve");
      this.speak("phase3_hit");
      if (this.witnessHits === 1)
        this.logText.setText("It exhales for the first time. 'Thank you.'");
      else if (this.witnessHits === 2) this.logText.setText("'Will you remember me kindly?'");
      else this.logText.setText("It is seen. It steadies.");
      if (this.witnessHits === 1 && plan.witnesses === 3) {
        this.time.delayedCall(900, () => this.askPlateauRemain());
        return;
      }
      if (tally()) return this.victory();
      this.busy = false;
    } else if (cmd === "address" && plan.needs.address > 0) {
      this.exposedAddressHits++;
      this.sparkBurst(GBC_W / 2, 46, 0xffd070, 8);
      getAudio().sfx("resolve");
      this.logText.setText("You name what it was. The image relaxes.");
      this.speak("phase3_hit");
      if (tally()) return this.victory();
      this.busy = false;
    } else if (cmd === "release" && plan.needs.release > 0) {
      this.exposedReleaseHits++;
      this.sparkBurst(GBC_W / 2, 46, 0xa8e8c8, 8);
      getAudio().sfx("resolve");
      this.logText.setText("You let go. It does not vanish; it simply rests.");
      this.speak("phase3_hit");
      if (tally()) return this.victory();
      this.busy = false;
    } else if (cmd === "release") {
      this.logText.setText(`Plan: ${plan.label}.`);
      getAudio().sfx("cancel");
      this.busy = false;
    } else {
      this.logText.setText(`Wrong verb. Plan: ${plan.label}.`);
      this.cameras.main.shake(60, 0.002);
      getAudio().sfx("miss");
      this.busy = false;
    }
  }

  private victory() {
    this.logText.setText("It dissolves into a Memory Shard. The Curated Self is at peace.");
    if (!this.save.shards.includes("curated_self")) this.save.shards.push("curated_self");
    unlockLore(this.save, "on_the_return");
    if (this.save.act2Inscription) {
      unlockLore(this.save, "on_the_inscription_returns");
      showLoreToast(this, "on_the_inscription_returns");
    }
    // Clear the mid-fight checkpoint so a future Continue doesn't reload Phase 3.
    delete this.save.flags.curated_progress_exposed;
    writeSave(this.save);
    this.speak("victory");
    this.tweens.add({
      targets: this.boss,
      alpha: 0,
      duration: 900,
      onComplete: () => this.endGame(),
    });
  }

  /**
   * The plateau "REMAIN" branch is only offered on the long-form (3-witness)
   * plan — fractured/gentle weddings already represent a kind of yielding,
   * so we don't ask the player to yield twice.
   */
  private askPlateauRemain() {
    runInquiry(
      this,
      { who: "Soryn", text: "You may stay here in the image. Comfortable. Or finish." },
      [
        { choice: "confess", label: "FINISH", reply: "Then witness twice more." },
        { choice: "silent", label: "REMAIN", reply: "The image is comfortable. We will wait." },
      ],
      (picked) => {
        if (picked.label === "REMAIN") this.endRemain();
        else this.busy = false;
      },
    );
  }

  private endRemain() {
    this.save.scene = "ImaginalRealm";
    this.save.region = "corridor";
    this.save.flags.plateau_remain = true;
    this.save.flags.curated_progress_exposed = true;
    writeSave(this.save);
    const a = getAudio();
    a.music.stop();
    this.cameras.main.fadeOut(900, 80, 100, 140);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Title"));
  }

  // ============================================================================
  // ASCEND — short white road, only when goldStone is held
  // ============================================================================
  private handleAscend() {
    runInquiry(
      this,
      {
        who: this.save.sorynReleased ? "Narrator" : "Soryn",
        text: "The gold burns at your hip. You may walk into the white now. Or finish the long seeing.",
      },
      [
        { choice: "confess", label: "ASCEND", reply: "The white opens." },
        { choice: "silent", label: "STAY", reply: "Then keep walking. The long road is real too." },
      ],
      (picked) => {
        if (picked.label === "ASCEND") this.endAscend();
        else this.busy = false;
      },
    );
  }

  private endAscend() {
    // METAXY: Ascend at the Sun is now a "settle here" choice — soft ending
    // route via Epilogue. The canonical ascent only opens after Saturn.
    this.save.flags.act3_ascended = true;
    this.save.flags.act3_complete = true;
    this.save.flags.plateau_remain = false;
    this.save.plateauSettled = { ...this.save.plateauSettled, sun: true };
    delete this.save.flags.curated_progress_exposed;
    this.save.scene = "Epilogue";
    if (!this.save.shards.includes("golden_self")) this.save.shards.push("golden_self");
    unlockLore(this.save, "on_the_ascent");
    writeSave(this.save);
    this.speak("ascend");
    const a = getAudio();
    a.music.stop();
    const flash = this.add
      .rectangle(0, 0, GBC_W, GBC_H, 0xffffff, 0)
      .setOrigin(0, 0)
      .setDepth(900);
    this.tweens.add({
      targets: flash,
      alpha: 1,
      duration: 1400,
      onComplete: () => {
        this.time.delayedCall(700, () =>
          this.scene.start("Epilogue", { save: this.save }),
        );
      },
    });
  }

  // ============================================================================
  // ROUTER
  // ============================================================================
  private choose(i: number) {
    if (this.busy) return;
    const cmd = this.cmdTexts[i].obj.getData("cmd") as Command;
    this.busy = true;
    if (cmd === "transmute" && this.save.goldStone) return this.handleAscend();
    if (this.phase === "composed") return this.handleComposed(cmd);
    if (this.phase === "fractured") return this.handleFractured(cmd);
    if (this.phase === "exposed") return this.handleExposed(cmd);
    this.busy = false;
  }

  private missQuip(): string {
    const quips = [
      "It only steadies. Try the right verb.",
      "The mask is lacquered. Words crack it. Yours.",
      "Release without sight is a shrug.",
    ];
    return quips[this.missIdx++ % quips.length];
  }

  private endGame() {
    // METAXY: Sun is no longer terminal. Return to the hub with the Sun
    // garment released; Mars portal will light next.
    this.save.flags.act3_complete = true;
    this.save.flags.plateau_remain = false;
    this.save.garmentsReleased = { ...this.save.garmentsReleased, sun: true };
    this.save.scene = "MetaxyHub";
    writeSave(this.save);
    const a = getAudio();
    a.music.stop();
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () =>
      this.scene.start("MetaxyHub", { save: this.save }),
    );
  }
}

export class EpilogueScene extends Phaser.Scene {
  private save!: SaveSlot;
  private cursor = 0;
  private optionTexts: GBCText[] = [];
  private cursorMark!: GBCText;
  private options: { label: string; action: "ngplus" | "ascend" | "erase" }[] = [];

  constructor() {
    super("Epilogue");
  }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.cursor = 0;
    this.optionTexts = [];
  }

  create() {
    this.cameras.main.setBackgroundColor("#05060f");
    this.cameras.main.fadeIn(900);
    getAudio().music.play("epilogue", SONG_EPILOGUE);

    const tier = endingTier(this.save);
    const TIER_TINT: Record<string, [number, number, number]> = {
      ascent: [0xfff5d0, 0xffe098, 0xc8b070],
      gold: [0xffe098, 0xd8a060, 0x8a5028],
      silver: [0xc8d0e8, 0x88a0c8, 0x4a5878],
      iron: [0xa8b0c0, 0x687088, 0x2a3048],
      brittle: [0x9088a0, 0x584860, 0x1a1428],
    };
    const tint = TIER_TINT[tier];

    // Deep gradient background tinted by tier
    const bg = this.add.graphics().setDepth(0);
    const bandsBg: [number, number][] = [
      [0x05060f, 30],
      [tint[2], 40],
      [tint[1], 50],
      [tint[0], 24],
    ];
    let yy = 0;
    for (const [c, h] of bandsBg) {
      bg.fillStyle(c, 0.55);
      bg.fillRect(0, yy, GBC_W, h);
      yy += h;
    }

    // Stars (denser, twinkling)
    for (let i = 0; i < 70; i++) {
      const s = this.add
        .rectangle(
          Phaser.Math.Between(0, GBC_W),
          Phaser.Math.Between(0, GBC_H),
          1,
          1,
          0xdde6f5,
          Phaser.Math.FloatBetween(0.3, 1),
        )
        .setDepth(1);
      this.tweens.add({
        targets: s,
        alpha: 0.1,
        duration: Phaser.Math.Between(700, 2200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    // Aurora ribbons — slow, sine-driven
    const ribbons = [tint[0], tint[1], 0x88c0f0, 0xa8e8c8, 0xc8a8e8];
    for (let b = 0; b < ribbons.length; b++) {
      const band = this.add
        .rectangle(GBC_W / 2, 18 + b * 7, GBC_W * 1.6, 2, ribbons[b], 0.22)
        .setDepth(2);
      this.tweens.add({
        targets: band,
        x: GBC_W / 2 + (b % 2 === 0 ? 18 : -18),
        alpha: 0.06,
        scaleX: 1.15,
        duration: 3400 + b * 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }

    // Halo behind title (lowered to clear the global top stat bar)
    const halo = this.add.circle(GBC_W / 2, 24, 24, tint[0], 0.18).setDepth(3);
    this.tweens.add({
      targets: halo,
      scale: 1.3,
      alpha: 0.05,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // Drifting motes
    spawnMotes(this, { count: 12, color: tint[0], alpha: 0.4, driftY: -0.01, depth: 4 });

    this.cameras.main.zoomTo(1.04, 4000, "Sine.inOut", true);

    const tierLabel: Record<string, string> = {
      ascent: "ASCENT",
      gold: "GOLD",
      silver: "SILVER",
      iron: "IRON",
      brittle: "BRITTLE",
    };
    new GBCText(this, GBC_W / 2 - 22, 16, "ACT THREE", { color: COLOR.textAccent, depth: 10 });
    new GBCText(this, GBC_W / 2 - 26, 26, `ENDING: ${tierLabel[tier]}`, {
      color: COLOR.textGold,
      depth: 10,
    });

    // Vignette
    const vignette = this.add.graphics().setDepth(180);
    vignette.fillStyle(0x000000, 0.5);
    vignette.fillRect(0, 0, GBC_W, 4);
    vignette.fillRect(0, GBC_H - 4, GBC_W, 4);
    vignette.fillRect(0, 0, 4, GBC_H);
    vignette.fillRect(GBC_W - 4, 0, 4, GBC_H);

    // Paragraph box: tighter line spacing, max 3 entries, append overflow to last.
    drawGBCBox(this, 8, 38, GBC_W - 16, 64);
    const allParas = endingParagraphs(this.save);
    const paragraphs =
      allParas.length <= 3 ? allParas : [...allParas.slice(0, 2), `${allParas[2]} ${allParas.slice(3).join(" ")}`];
    let y = 42;
    for (const para of paragraphs) {
      new GBCText(this, 12, y, para, {
        color: COLOR.textLight,
        depth: 110,
        maxWidthPx: GBC_W - 24,
      });
      y += 14;
    }
    // Stats line tucked at the bottom of the paragraph box.
    const ng = this.save.flags.ng_plus ? " ★" : "";
    new GBCText(
      this,
      12,
      94,
      `C:${this.save.stats.clarity} K:${this.save.stats.compassion} V:${this.save.stats.courage} ◆${this.save.shards.length}${ng}`,
      { color: COLOR.textDim, depth: 110 },
    );

    // Build option list per tier
    this.options = [];
    if (tier === "ascent" || this.save.goldStone) {
      this.options.push({ label: "ASCEND (NG+ ★)", action: "ascend" });
    }
    this.options.push({ label: "WALK AGAIN (NG+)", action: "ngplus" });
    this.options.push({ label: "ERASE RESTART", action: "erase" });

    this.add
      .rectangle(0, GBC_H - 40, GBC_W, 40, 0x05070d, 0.92)
      .setOrigin(0, 0)
      .setDepth(199);
    this.optionTexts = this.options.map(
      (o, i) =>
        new GBCText(this, 18, GBC_H - 34 + i * 10, o.label, {
          color: i === 0 ? COLOR.textGold : COLOR.textDim,
          depth: 200,
        }),
    );
    this.cursorMark = new GBCText(this, 8, GBC_H - 34, "▶", {
      color: COLOR.textGold,
      depth: 200,
    });
    this.optionTexts.forEach((t, i) => {
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerdown", () => {
        this.cursor = i;
        this.refreshCursor();
        this.choose();
      });
    });
    this.refreshCursor();

    attachHUD(this, () => this.save.stats);

    const move = (d: number) => {
      this.cursor = (this.cursor + d + this.options.length) % this.options.length;
      getAudio().sfx("cursor");
      this.refreshCursor();
    };
    onDirection(this, (d) => {
      if (d === "up") move(-1);
      else if (d === "down") move(1);
    });
    onActionDown(this, "action", () => this.choose());
    this.events.on("vinput-down", (dir: string) => {
      if (dir === "up") move(-1);
      if (dir === "down") move(1);
    });
    this.events.on("vinput-action", () => this.choose());
  }

  private refreshCursor() {
    this.optionTexts.forEach((t, i) =>
      t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textDim),
    );
    this.cursorMark.setPosition(8, GBC_H - 34 + this.cursor * 10);
  }

  private choose() {
    const a = getAudio();
    a.sfx("confirm");
    const opt = this.options[this.cursor];
    if (opt.action === "ngplus") {
      this.save.flags.ng_plus = true;
      // Reset to start so Continue doesn't dump the player back into the Epilogue.
      this.save.scene = "LastDay";
      this.save.flags.curated_progress_exposed = false;
      writeSave(this.save);
      a.music.stop();
      this.scene.start("Title");
      return;
    }
    if (opt.action === "ascend") {
      this.save.flags.ng_plus = true;
      this.save.flags.ng_plus_ascended = true;
      // Reset to start; ascended NG+ begins from the Last Day with a gold mark.
      this.save.scene = "LastDay";
      this.save.flags.curated_progress_exposed = false;
      writeSave(this.save);
      // Brief white closer with single sentence.
      const flash = this.add
        .rectangle(0, 0, GBC_W, GBC_H, 0xffffff, 0)
        .setOrigin(0, 0)
        .setDepth(900);
      const line = new GBCText(this, GBC_W / 2 - 60, GBC_H / 2 - 4, "AND BEGIN AGAIN, GOLDEN.", {
        color: "#1a1a1a",
        depth: 901,
      });
      line.obj.setAlpha(0);
      this.tweens.add({ targets: flash, alpha: 1, duration: 1200 });
      this.tweens.add({
        targets: line.obj,
        alpha: 1,
        duration: 1200,
        delay: 600,
        onComplete: () => {
          this.time.delayedCall(1400, () => {
            a.music.stop();
            this.scene.start("Title");
          });
        },
      });
      return;
    }
    // ERASE — 2-step confirm
    runInquiry(
      this,
      { who: "Soryn", text: "Erase the entire journey? This cannot be undone." },
      [
        { choice: "silent", label: "KEEP IT", reply: "We keep it. The shards remain." },
        { choice: "confess", label: "ERASE", reply: "The slate is bare. Begin again, kindly." },
      ],
      (picked) => {
        if (picked.label === "ERASE") {
          clearSave();
          a.music.stop();
          this.scene.start("Title");
        }
      },
    );
  }
}
