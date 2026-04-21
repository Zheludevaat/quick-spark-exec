/**
 * Venus — The Eternal Biennale (bespoke chapter implementation).
 *
 * Replaces the previous thin-wrapper VenusPlateau/VenusTrial classes.
 * The plateau is now a real explorable place with six adjacent zones,
 * placed NPCs, three thematic puzzles (Unfinished Work, Reconstruction,
 * Release the Audience), one cadence mini-challenge (Ladder of Lovers),
 * and the bespoke three-phase Kypria trial.
 *
 * Save compatibility:
 *  - scene keys: "VenusPlateau", "VenusTrial"
 *  - on trial pass: garmentsReleased.venus, sphereVerbs.attune, inscription
 *  - on settle: plateauSettled.venus + Epilogue
 *  - returns to MetaxyHub on cancel from atrium and on trial pass
 */
import * as Phaser from "phaser";
import type { SaveSlot } from "../../types";
import { ACT_BY_SCENE } from "../../types";
import { writeSave } from "../../save";
import { attachHUD, runDialog } from "../../scenes/hud";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  gbcWipe,
  spawnMotes,
} from "../../gbcArt";
import { getAudio } from "../../audio";
import { onActionDown, onDirection } from "../../controls";
import { venusConfig } from "../configs/venus";
import { askSphere } from "../SpherePlateauScene";

import {
  VENUS_FLAGS,
  VENUS_ZONE_LABEL,
  VENUS_ZONE_LINKS,
  type VenusZoneId,
} from "../venus/VenusData";
import {
  getVenusZone,
  setVenusZone,
  markVenusFlag,
  isVenusFlag,
  venusCrackingReady,
  venusProgressCount,
} from "../venus/VenusZoneState";
import { VENUS_NPCS, VENUS_AMBIENT_NPCS } from "../venus/VenusNpcDefs";
import {
  createAttuneTarget,
  startAttune,
  breakAttune,
  updateAttune,
  attuneProgress,
  markVenusPuzzleDone,
  isVenusPuzzleDone,
  type AttuneTarget,
} from "../venus/VenusPuzzles";
import {
  VENUS_TRIAL_PHASES,
  initialVenusTrialState,
  scoreVenusTrialResponse,
  venusTrialPassed,
  awardVenusTrialPass,
  type VenusTrialState,
} from "../venus/VenusTrialLogic";
import {
  publishVenusMinimap,
  publishVenusTrialMinimap,
} from "../venus/VenusMinimap";
import { makeAttuneRing } from "../venus/VenusUi";
import {
  createEncounterPresentation,
  type EncounterPresentationHandle,
} from "../../encounters/EncounterPresentation";
import { KYPRIA_PROFILE } from "../../encounters/profiles/governors";

// =====================================================================
// VenusPlateauScene
// =====================================================================

type Hotspot = {
  id: string;
  x: number;
  y: number;
  r: number;
  label: string;
  /** Called on A-press when player overlaps. */
  onAct: () => void;
  /** Optional gating predicate — false => greyed/inactive. */
  enabled?: () => boolean;
  /** Optional persistent tag drawn beside hotspot. */
  badge?: () => string | null;
};

type Door = {
  to: VenusZoneId;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};

const PLAYER_SPEED = 56; // px/sec
const PLAYER_R = 4;

export class VenusPlateauScene extends Phaser.Scene {
  private save!: SaveSlot;
  private zone: VenusZoneId = "atrium";
  private busy = false;
  private modal = false;

  private root!: Phaser.GameObjects.Container;
  private zoneLabel!: GBCText;
  private hint!: GBCText;
  private subtitle!: GBCText;

  private player!: Phaser.GameObjects.Arc;
  private playerVx = 0;
  private playerVy = 0;

  private hotspots: Hotspot[] = [];
  private doors: Door[] = [];
  private hotspotMarkers: Phaser.GameObjects.GameObject[] = [];

  private activeAttune: AttuneTarget | null = null;
  private attuneRing: ReturnType<typeof makeAttuneRing> | null = null;
  private lastInputDir: { x: number; y: number } = { x: 0, y: 0 };
  private prevPlayerPos = { x: 0, y: 0 };

  constructor() {
    super("VenusPlateau");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "VenusPlateau";
    this.save.act = ACT_BY_SCENE.VenusPlateau;
    writeSave(this.save);

    this.zone = getVenusZone(this.save);
    this.busy = false;
    this.modal = false;
    this.activeAttune = null;
    this.attuneRing = null;
    this.hotspots = [];
    this.doors = [];
    this.hotspotMarkers = [];
  }

  create() {
    this.cameras.main.setBackgroundColor(venusConfig.bg);
    this.cameras.main.fadeIn(380);
    spawnMotes(this, { count: 18, color: venusConfig.accent, alpha: 0.42 });

    attachHUD(this, () => this.save.stats);

    this.zoneLabel = new GBCText(
      this,
      6,
      14,
      `VENUS - ${VENUS_ZONE_LABEL[this.zone].toUpperCase()}`,
      { color: COLOR.textGold, depth: 60, maxWidthPx: GBC_W - 12 },
    );
    this.subtitle = new GBCText(this, 6, 22, "", {
      color: COLOR.textAccent,
      depth: 60,
      maxWidthPx: GBC_W - 12,
    });
    this.hint = new GBCText(this, 6, 132, "", {
      color: COLOR.textDim,
      depth: 60,
      maxWidthPx: GBC_W - 12,
    });

    this.root = this.add.container(0, 0).setDepth(20);
    this.player = this.add.circle(GBC_W / 2, GBC_H / 2, PLAYER_R, 0xffe8d8, 1).setDepth(40);
    this.player.setStrokeStyle(1, 0x000000, 0.6);

    this.loadZone(this.zone, true);

    onDirection(this, (d) => {
      if (this.modal || this.busy) return;
      if (d === "left") this.lastInputDir = { x: -1, y: 0 };
      else if (d === "right") this.lastInputDir = { x: 1, y: 0 };
      else if (d === "up") this.lastInputDir = { x: 0, y: -1 };
      else if (d === "down") this.lastInputDir = { x: 0, y: 1 };
    });

    onActionDown(this, "action", () => {
      if (this.modal || this.busy) return;
      this.handleAction();
    });

    onActionDown(this, "cancel", () => {
      if (this.modal || this.busy) return;
      this.handleCancel();
    });

    if (!isVenusFlag(this.save, "introSeen")) {
      markVenusFlag(this.save, "introSeen");
      writeSave(this.save);
      this.modal = true;
      this.time.delayedCall(280, () =>
        runDialog(this, venusConfig.opening, () => {
          this.modal = false;
          this.refreshHint();
        }),
      );
    }
  }

  // -----------------------------------------------------------------
  // Zone build
  // -----------------------------------------------------------------

  private loadZone(zone: VenusZoneId, silent = false) {
    this.zone = zone;
    setVenusZone(this.save, zone);
    writeSave(this.save);

    // Tear down previous zone visuals
    this.root.removeAll(true);
    this.hotspots = [];
    this.doors = [];
    this.hotspotMarkers.forEach((g) => g.destroy());
    this.hotspotMarkers = [];
    this.cancelActiveAttune(true);

    this.zoneLabel.setText(`VENUS - ${VENUS_ZONE_LABEL[zone].toUpperCase()}`);
    this.subtitle.setText(this.subtitleFor(zone));
    publishVenusMinimap(zone);

    // Place player at the zone's entry point
    const entry = this.entryFor(zone);
    this.player.setPosition(entry.x, entry.y);
    this.prevPlayerPos = { x: entry.x, y: entry.y };
    this.lastInputDir = { x: 0, y: 0 };

    switch (zone) {
      case "atrium":
        this.buildAtrium();
        break;
      case "gallery":
        this.buildGallery();
        break;
      case "recognition_hall":
        this.buildRecognitionHall();
        break;
      case "reconstruction":
        this.buildReconstructionStudio();
        break;
      case "ladder":
        this.buildLadder();
        break;
      case "threshold":
        this.buildTrialThreshold();
        break;
    }

    this.drawDoors();
    this.drawHotspots();
    this.refreshHint();

    if (!silent) {
      getAudio().sfx("open");
      this.cameras.main.flash(120, 232, 200, 220, false);
    }
  }

  private entryFor(zone: VenusZoneId): { x: number; y: number } {
    // Each zone has a logical entry that places the player just inside
    // the door they came from.
    switch (zone) {
      case "atrium":
        return { x: 30, y: 80 };
      case "gallery":
        return { x: 30, y: 90 };
      case "recognition_hall":
        return { x: 30, y: 80 };
      case "reconstruction":
        return { x: 30, y: 80 };
      case "ladder":
        return { x: 30, y: 90 };
      case "threshold":
        return { x: 30, y: 80 };
    }
  }

  private subtitleFor(zone: VenusZoneId): string {
    switch (zone) {
      case "atrium":
        return "copper light. footsteps that arrive softer than expected.";
      case "gallery":
        return "frames upon frames. a pose held for years.";
      case "recognition_hall":
        return "every face here was loved by someone.";
      case "reconstruction":
        return "a beloved being rebuilt from notes.";
      case "ladder":
        return "rungs you do not climb so much as recognise.";
      case "threshold":
        return "a quiet door. it is not locked.";
    }
  }

  // -----------------------------------------------------------------
  // Zone builders — props, NPCs, hotspots, doors
  // -----------------------------------------------------------------

  private buildAtrium() {
    // Soft pillars
    for (const px of [50, 110]) {
      const pillar = this.add.rectangle(px, 70, 6, 60, 0x4a2838, 0.7).setDepth(10);
      this.root.add(pillar);
    }
    // Ambient floor pattern
    const dais = this.add.ellipse(GBC_W / 2, 80, 80, 18, 0x6a3a4e, 0.35).setDepth(8);
    this.root.add(dais);

    // Etiquette clerk NPC at center-back
    this.placeAmbientNpc(
      VENUS_AMBIENT_NPCS.etiquetteClerk,
      80,
      55,
      0xa8b8d8,
      "etiquetteHeard",
    );

    // Doors
    this.doors.push(
      { to: "gallery", x: 0, y: 50, w: 8, h: 30, label: "← GALLERY" },
      { to: "recognition_hall", x: GBC_W - 8, y: 50, w: 8, h: 30, label: "RECOGNITION →" },
      { to: "ladder", x: GBC_W - 8, y: 100, w: 8, h: 30, label: "LADDER →" },
    );

    // Hub-only: walking south to the threshold needs cracking-ready
    this.doors.push({
      to: "threshold",
      x: GBC_W / 2 - 8,
      y: GBC_H - 20,
      w: 16,
      h: 8,
      label: "THRESHOLD ↓",
    });
  }

  private buildGallery() {
    // Frames along the back wall
    for (let i = 0; i < 4; i++) {
      const fx = 30 + i * 28;
      const frame = this.add.rectangle(fx, 50, 16, 18, 0x3a1a28, 1).setDepth(10);
      frame.setStrokeStyle(1, 0xc88a9a, 0.6);
      this.root.add(frame);
    }

    // The Curator NPC
    this.placeMainNpc(VENUS_NPCS.curator, 80, 75, 0xe89bb8, "curator");

    // Puzzle: Unfinished Work — an ATTUNE target near a draped easel
    const easel = this.add.rectangle(118, 85, 10, 20, 0x4a2838, 1).setDepth(10);
    easel.setStrokeStyle(1, 0x9a6a7c, 0.7);
    this.root.add(easel);

    const puzzleDone = isVenusPuzzleDone(this.save, "unfinished_work");
    this.hotspots.push({
      id: "unfinished_work",
      x: 118,
      y: 100,
      r: 8,
      label: puzzleDone ? "the work, finished by witness" : "ATTUNE: the unfinished work",
      enabled: () => true,
      badge: () => (isVenusPuzzleDone(this.save, "unfinished_work") ? "*" : null),
      onAct: () => this.tryAttune("unfinished_work", "gallery", 1800, () => {
        markVenusPuzzleDone(this.save, "unfinished_work");
        markVenusFlag(this.save, "curatorStarted");
        writeSave(this.save);
        runDialog(this, [
          { who: "?", text: "The drape settles. The painting underneath was never finished." },
          { who: "?", text: "Witnessed. Not improved." },
        ]);
      }),
    });

    this.doors.push({ to: "atrium", x: 0, y: 50, w: 8, h: 30, label: "← ATRIUM" });
    this.doors.push({ to: "recognition_hall", x: GBC_W - 8, y: 50, w: 8, h: 30, label: "RECOGNITION →" });
  }

  private buildRecognitionHall() {
    // A long bench
    const bench = this.add.rectangle(GBC_W / 2, 110, 100, 4, 0x3a1a28, 1).setDepth(10);
    bench.setStrokeStyle(1, 0x9a6a7c, 0.6);
    this.root.add(bench);

    // Mirrors flanking
    for (const mx of [40, 120]) {
      const mirror = this.add.rectangle(mx, 55, 12, 22, 0x2a1428, 1).setDepth(10);
      mirror.setStrokeStyle(1, 0xe89bb8, 0.7);
      this.root.add(mirror);
    }

    // The Critic NPC
    this.placeMainNpc(VENUS_NPCS.critic, 80, 75, 0xc8a8d8, "critic");

    this.doors.push({ to: "atrium", x: 0, y: 50, w: 8, h: 30, label: "← ATRIUM" });
    this.doors.push({ to: "gallery", x: 8, y: 100, w: 8, h: 28, label: "↙ GALLERY" });
    this.doors.push({ to: "reconstruction", x: GBC_W - 8, y: 50, w: 8, h: 30, label: "STUDIO →" });
  }

  private buildReconstructionStudio() {
    // A worktable with scattered notes
    const table = this.add.rectangle(GBC_W / 2, 95, 80, 10, 0x4a2838, 1).setDepth(10);
    table.setStrokeStyle(1, 0xc88a9a, 0.6);
    this.root.add(table);

    for (let i = 0; i < 5; i++) {
      const note = this.add.rectangle(60 + i * 12, 92, 6, 4, 0xe8d8c8, 0.85).setDepth(11);
      this.root.add(note);
    }

    // The Beloved NPC — half-formed, lower opacity
    this.placeMainNpc(VENUS_NPCS.beloved, 80, 60, 0xffd8e8, "beloved", 0.7);

    // Puzzle: Reconstruction Chamber — ATTUNE without the urge to finish
    const puzzleDone = isVenusPuzzleDone(this.save, "reconstruction_chamber");
    this.hotspots.push({
      id: "reconstruction_chamber",
      x: GBC_W / 2,
      y: 95,
      r: 10,
      label: puzzleDone ? "you let them stay incomplete" : "ATTUNE: the reconstructed beloved",
      enabled: () => true,
      badge: () => (isVenusPuzzleDone(this.save, "reconstruction_chamber") ? "*" : null),
      onAct: () => this.tryAttune("reconstruction_chamber", "reconstruction", 2200, () => {
        markVenusPuzzleDone(this.save, "reconstruction_chamber");
        markVenusFlag(this.save, "reconstructionSeen");
        writeSave(this.save);
        runDialog(this, [
          { who: "?", text: "The notes do not become a person." },
          { who: "?", text: "The person was never the notes." },
        ]);
      }),
    });

    this.doors.push({ to: "recognition_hall", x: 0, y: 50, w: 8, h: 30, label: "← RECOGNITION" });
    this.doors.push({ to: "threshold", x: GBC_W - 8, y: 50, w: 8, h: 30, label: "THRESHOLD →" });
  }

  private buildLadder() {
    // Vertical "rungs" — the cadence ladder
    for (let i = 0; i < 5; i++) {
      const ry = 50 + i * 14;
      const rung = this.add.rectangle(GBC_W / 2, ry, 60, 2, 0xc88a9a, 0.7).setDepth(10);
      this.root.add(rung);
    }
    const post1 = this.add.rectangle(GBC_W / 2 - 30, 80, 2, 70, 0x4a2838, 1).setDepth(9);
    const post2 = this.add.rectangle(GBC_W / 2 + 30, 80, 2, 70, 0x4a2838, 1).setDepth(9);
    this.root.add(post1);
    this.root.add(post2);

    // Anniversary keeper
    this.placeAmbientNpc(
      VENUS_AMBIENT_NPCS.anniversaryKeeper,
      35,
      70,
      0xa890b8,
      "anniversaryHeard",
    );

    // Cadence challenge hotspot
    const ladderDone = isVenusFlag(this.save, "ladderDone");
    this.hotspots.push({
      id: "ladder_challenge",
      x: GBC_W / 2,
      y: 80,
      r: 14,
      label: ladderDone ? "you climbed without grasping" : "BEGIN: the ladder cadence",
      enabled: () => true,
      badge: () => (isVenusFlag(this.save, "ladderDone") ? "*" : null),
      onAct: () => this.runLadderChallenge(),
    });

    this.doors.push({ to: "atrium", x: 0, y: 50, w: 8, h: 30, label: "← ATRIUM" });
    this.doors.push({ to: "threshold", x: GBC_W - 8, y: 50, w: 8, h: 30, label: "THRESHOLD →" });
  }

  private buildTrialThreshold() {
    // A single pale doorway
    const door = this.add.rectangle(GBC_W / 2, 70, 24, 50, 0x2a1428, 1).setDepth(10);
    door.setStrokeStyle(1, 0xe89bb8, 0.9);
    this.root.add(door);

    // Glow if ready
    if (venusCrackingReady(this.save)) {
      const glow = this.add.circle(GBC_W / 2, 70, 18, 0xe89bb8, 0.18).setDepth(11);
      this.root.add(glow);
      this.tweens.add({
        targets: glow,
        alpha: 0.05,
        scale: 1.4,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }

    // Release-the-Audience puzzle: an ATTUNE in the empty room
    const releaseDone = isVenusPuzzleDone(this.save, "release_audience");
    this.hotspots.push({
      id: "release_audience",
      x: GBC_W / 2,
      y: 110,
      r: 10,
      label: releaseDone ? "the audience is released" : "ATTUNE: release the audience",
      enabled: () => true,
      badge: () => (isVenusPuzzleDone(this.save, "release_audience") ? "*" : null),
      onAct: () => this.tryAttune("release_audience", "threshold", 2400, () => {
        markVenusPuzzleDone(this.save, "release_audience");
        markVenusFlag(this.save, "audienceReleased");
        writeSave(this.save);
        runDialog(this, [
          { who: "?", text: "You realise no one is watching." },
          { who: "?", text: "You stay anyway." },
        ]);
      }),
    });

    // Trial entry hotspot
    this.hotspots.push({
      id: "enter_trial",
      x: GBC_W / 2,
      y: 70,
      r: 14,
      label: venusCrackingReady(this.save) ? "FACE KYPRIA" : "more seeing is needed",
      enabled: () => venusCrackingReady(this.save),
      onAct: () => this.enterTrial(),
    });

    this.doors.push({ to: "atrium", x: 0, y: 50, w: 8, h: 30, label: "← ATRIUM" });
    this.doors.push({ to: "ladder", x: GBC_W - 8, y: 50, w: 8, h: 30, label: "LADDER →" });
  }

  // -----------------------------------------------------------------
  // NPC placement helpers
  // -----------------------------------------------------------------

  private placeMainNpc(
    npc: { id: string; name: string; intro: { who: string; text: string }; options: typeof VENUS_NPCS.curator.options },
    x: number,
    y: number,
    color: number,
    questKey: "curator" | "critic" | "beloved",
    alpha = 1,
  ) {
    const body = this.add.rectangle(x, y, 8, 14, color, alpha).setDepth(20);
    body.setStrokeStyle(1, 0x000000, 0.55);
    const head = this.add.circle(x, y - 9, 3, color, alpha).setDepth(21);
    head.setStrokeStyle(1, 0x000000, 0.55);
    const tag = new GBCText(this, x - 18, y - 22, npc.name, {
      color: COLOR.textAccent,
      depth: 22,
    });
    this.root.add(body);
    this.root.add(head);
    this.root.add(tag.obj);

    const doneFlagKey = `${questKey}Done` as const;
    if (isVenusFlag(this.save, doneFlagKey)) {
      body.setAlpha(alpha * 0.55);
      head.setAlpha(alpha * 0.55);
    }

    this.hotspots.push({
      id: `npc_${npc.id}`,
      x,
      y,
      r: 12,
      label: isVenusFlag(this.save, doneFlagKey)
        ? `${npc.name.toLowerCase()} — quiet now`
        : `SPEAK: ${npc.name}`,
      onAct: () => this.runMainNpc(npc, questKey),
    });
  }

  private placeAmbientNpc(
    npc: { id: string; name: string; ambient: string[] },
    x: number,
    y: number,
    color: number,
    flagKey: "etiquetteHeard" | "anniversaryHeard",
  ) {
    const body = this.add.rectangle(x, y, 7, 12, color, 0.85).setDepth(20);
    body.setStrokeStyle(1, 0x000000, 0.55);
    const head = this.add.circle(x, y - 8, 3, color, 0.85).setDepth(21);
    head.setStrokeStyle(1, 0x000000, 0.55);
    const tag = new GBCText(this, x - 26, y - 20, npc.name, {
      color: COLOR.textDim,
      depth: 22,
    });
    this.root.add(body);
    this.root.add(head);
    this.root.add(tag.obj);

    this.hotspots.push({
      id: `amb_${npc.id}`,
      x,
      y,
      r: 11,
      label: `LISTEN: ${npc.name}`,
      onAct: () => {
        markVenusFlag(this.save, flagKey);
        writeSave(this.save);
        const lines = npc.ambient.map((t) => ({ who: npc.name, text: t }));
        this.modal = true;
        runDialog(this, lines, () => {
          this.modal = false;
          this.refreshHint();
        });
      },
    });
  }

  // -----------------------------------------------------------------
  // Door / hotspot rendering
  // -----------------------------------------------------------------

  private drawDoors() {
    for (const d of this.doors) {
      const r = this.add.rectangle(d.x + d.w / 2, d.y + d.h / 2, d.w, d.h, 0xe89bb8, 0.18).setDepth(12);
      r.setStrokeStyle(1, 0xe89bb8, 0.55);
      const t = new GBCText(this, d.x + 4, d.y + d.h + 1, d.label, {
        color: COLOR.textDim,
        depth: 13,
      });
      this.root.add(r);
      this.root.add(t.obj);
    }
  }

  private drawHotspots() {
    for (const h of this.hotspots) {
      const enabled = h.enabled ? h.enabled() : true;
      const color = enabled ? 0xffe098 : 0x6a4a4a;
      const ring = this.add.circle(h.x, h.y, h.r, color, 0.0).setDepth(15);
      ring.setStrokeStyle(1, color, 0.55);
      this.root.add(ring);
      this.hotspotMarkers.push(ring);
      const badgeText = h.badge?.() ?? null;
      if (badgeText) {
        const b = new GBCText(this, h.x + h.r, h.y - h.r, badgeText, {
          color: COLOR.textGold,
          depth: 16,
        });
        this.root.add(b.obj);
        this.hotspotMarkers.push(b.obj);
      }
    }
  }

  // -----------------------------------------------------------------
  // Movement + per-frame loop
  // -----------------------------------------------------------------

  update(_time: number, deltaMs: number) {
    if (this.modal || this.busy) {
      // While modal, dampen velocity so re-entry doesn't slide
      this.playerVx = 0;
      this.playerVy = 0;
      return;
    }

    const dt = deltaMs / 1000;

    // Resolve input
    const target = this.lastInputDir;
    // Decay direction so a single dpad tick = one nudge but holding the
    // controls keyboard helper (which fires on every interval) keeps motion
    this.playerVx = target.x * PLAYER_SPEED;
    this.playerVy = target.y * PLAYER_SPEED;
    this.lastInputDir = { x: 0, y: 0 };

    // Move player (clamped)
    const oldX = this.player.x;
    const oldY = this.player.y;
    const nx = Phaser.Math.Clamp(this.player.x + this.playerVx * dt, 8, GBC_W - 8);
    const ny = Phaser.Math.Clamp(this.player.y + this.playerVy * dt, 30, GBC_H - 16);
    this.player.setPosition(nx, ny);
    const moved = Math.abs(nx - oldX) > 0.1 || Math.abs(ny - oldY) > 0.1;

    // ATTUNE: any movement breaks attune (unless explicitly allowed)
    if (this.activeAttune) {
      if (moved && !this.activeAttune.allowMoveWhileAttuning) {
        this.cancelActiveAttune(false);
      } else {
        const completed = updateAttune(this.activeAttune, deltaMs);
        if (this.attuneRing) this.attuneRing.update(attuneProgress(this.activeAttune));
        if (completed) {
          const onDone = this.activeAttune.onComplete;
          this.cancelActiveAttune(true, /*keepRing*/ false);
          // onComplete already fired inside updateAttune via target.onComplete
          void onDone;
        }
      }
    }

    // Door overlap → transition
    for (const d of this.doors) {
      if (
        nx >= d.x &&
        nx <= d.x + d.w &&
        ny >= d.y &&
        ny <= d.y + d.h
      ) {
        const link = VENUS_ZONE_LINKS[this.zone];
        if (link.includes(d.to)) {
          if (d.to === "threshold" && !venusCrackingReady(this.save) && this.zone === "atrium") {
            // Atrium → threshold from south door requires readiness; otherwise
            // bounce them back with a hint
            this.player.setPosition(oldX, oldY);
            this.flashHint("the threshold is not yet for you.");
            return;
          }
          gbcWipe(this, () => this.loadZone(d.to));
          return;
        }
      }
    }

    // Hotspot proximity → update hint
    this.refreshHintForProximity();
  }

  // -----------------------------------------------------------------
  // Action dispatch
  // -----------------------------------------------------------------

  private handleAction() {
    const h = this.findHotspotInRange();
    if (h) {
      if (h.enabled && !h.enabled()) {
        getAudio().sfx("cancel");
        this.flashHint(h.label);
        return;
      }
      getAudio().sfx("confirm");
      h.onAct();
    }
  }

  private handleCancel() {
    if (this.activeAttune) {
      this.cancelActiveAttune(false);
      return;
    }
    if (this.zone === "atrium") {
      this.toHub();
      return;
    }
    gbcWipe(this, () => this.loadZone("atrium"));
  }

  private findHotspotInRange(): Hotspot | null {
    for (const h of this.hotspots) {
      const dx = this.player.x - h.x;
      const dy = this.player.y - h.y;
      if (dx * dx + dy * dy <= (h.r + PLAYER_R) * (h.r + PLAYER_R)) {
        return h;
      }
    }
    return null;
  }

  // -----------------------------------------------------------------
  // Quest runners
  // -----------------------------------------------------------------

  private runMainNpc(
    npc: { id: string; name: string; intro: { who: string; text: string }; options: typeof VENUS_NPCS.curator.options },
    questKey: "curator" | "critic" | "beloved",
  ) {
    this.modal = true;
    const startedKey = `${questKey}Started` as const;
    const doneKey = `${questKey}Done` as const;
    if (!isVenusFlag(this.save, startedKey)) {
      markVenusFlag(this.save, startedKey);
      writeSave(this.save);
    }
    askSphere(this, npc.intro, npc.options, (picked) => {
      if (picked.flag) this.save.flags[picked.flag] = true;
      if (picked.conviction) this.save.convictions[picked.conviction] = true;
      if (picked.weight >= 3) {
        markVenusFlag(this.save, doneKey);
      }
      writeSave(this.save);
      this.modal = false;
      // Refresh visual state
      gbcWipe(this, () => this.loadZone(this.zone, true));
    });
  }

  private runLadderChallenge() {
    if (isVenusFlag(this.save, "ladderDone")) {
      this.modal = true;
      runDialog(
        this,
        [{ who: "?", text: "The ladder is quiet now. So are you." }],
        () => {
          this.modal = false;
          this.refreshHint();
        },
      );
      return;
    }

    markVenusFlag(this.save, "ladderStarted");
    writeSave(this.save);
    this.modal = true;
    // A small cadence sequence: three rungs to ATTUNE in turn, with
    // brief gaps. Forcing through (rapid A-presses) breaks cadence.
    runDialog(
      this,
      [
        { who: "?", text: "The ladder does not ask to be climbed quickly." },
        { who: "?", text: "Three rungs. Stand still on each. Do not reach." },
      ],
      () => this.startLadderRung(0, 0),
    );
  }

  private startLadderRung(idx: number, score: number) {
    if (idx >= 3) {
      // Resolve
      if (score >= 2) {
        markVenusFlag(this.save, "ladderDone");
        markVenusPuzzleDone(this.save, "ladder_step_3");
        writeSave(this.save);
        runDialog(
          this,
          [
            { who: "?", text: "You climbed without owning the rung above." },
            { who: "?", text: "Counted." },
          ],
          () => {
            this.modal = false;
            gbcWipe(this, () => this.loadZone(this.zone, true));
          },
        );
      } else {
        runDialog(
          this,
          [
            { who: "?", text: "You climbed by reaching. The rungs noticed." },
            { who: "?", text: "Try again when the wanting is quieter." },
          ],
          () => {
            this.modal = false;
            this.refreshHint();
          },
        );
      }
      return;
    }

    // Build a small in-place ATTUNE ring for the rung
    const cx = GBC_W / 2;
    const cy = 60 + idx * 14;
    const ring = makeAttuneRing(this, cx, cy, 8, 0xe89bb8);
    let elapsed = 0;
    const requiredMs = 1100;
    const failWindow = 600; // pressing/moving in this window after start = greedy
    let resolved = false;
    let cleanupAct: (() => void) | null = null;

    const tick = this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        elapsed += 30;
        ring.update(Math.min(1, elapsed / requiredMs));
        if (elapsed >= requiredMs && !resolved) {
          resolved = true;
          tick.remove(false);
          ring.destroy();
          cleanupAct?.();
          this.startLadderRung(idx + 1, score + 1);
        }
      },
    });

    cleanupAct = onActionDown(this, "action", () => {
      if (resolved) return;
      resolved = true;
      tick.remove(false);
      ring.destroy();
      cleanupAct?.();
      // Greedy press = counted as 0
      this.flashHint("reached. counted as zero.");
      this.startLadderRung(idx + 1, elapsed < failWindow ? score : score + 1);
    });
  }

  // -----------------------------------------------------------------
  // ATTUNE wrapper for in-zone hotspots
  // -----------------------------------------------------------------

  private tryAttune(
    id: string,
    zone: string,
    requiredMs: number,
    onComplete: () => void,
  ) {
    if (this.activeAttune) {
      this.cancelActiveAttune(false);
    }
    const target = createAttuneTarget(id, zone, requiredMs, {
      onStart: () => {},
      onBreak: () => {
        this.flashHint("attune broken. you reached.");
      },
      onComplete: () => {
        getAudio().sfx("resolve");
        onComplete();
        this.modal = false;
        // Refresh zone to update labels/badges
        this.time.delayedCall(900, () => gbcWipe(this, () => this.loadZone(this.zone, true)));
      },
    });
    startAttune(target);
    this.activeAttune = target;
    // Show ring at player position
    const ring = makeAttuneRing(this, this.player.x, this.player.y - 8, 6, 0xe89bb8);
    this.attuneRing = ring;
    this.flashHint("attune. do not move.");
  }

  private cancelActiveAttune(silent: boolean, keepRing = false) {
    if (this.activeAttune && this.activeAttune.state === "active" && !silent) {
      breakAttune(this.activeAttune);
    }
    this.activeAttune = null;
    if (!keepRing && this.attuneRing) {
      this.attuneRing.destroy();
      this.attuneRing = null;
    } else if (keepRing && this.attuneRing) {
      // Leave the ring, will be cleaned by zone reload
      this.attuneRing = null;
    }
  }

  // -----------------------------------------------------------------
  // Trial entry / hub return / hint refresh
  // -----------------------------------------------------------------

  private enterTrial() {
    if (!venusCrackingReady(this.save)) {
      getAudio().sfx("cancel");
      this.flashHint("more seeing is needed.");
      return;
    }
    markVenusFlag(this.save, "trialThresholdSeen");
    writeSave(this.save);
    gbcWipe(this, () => this.scene.start("VenusTrial", { save: this.save }));
  }

  private toHub() {
    this.save.scene = "MetaxyHub";
    writeSave(this.save);
    gbcWipe(this, () => this.scene.start("MetaxyHub", { save: this.save }));
  }

  private refreshHint() {
    const { done, total } = venusProgressCount(this.save);
    if (this.zone === "atrium") {
      this.hint.setText(`A: act   B: hub   (${done}/${total} seen)`);
      return;
    }
    if (this.zone === "threshold") {
      this.hint.setText(
        venusCrackingReady(this.save)
          ? `A: face Kypria   (${done}/${total})`
          : `A: act   more seeing needed (${done}/${total})`,
      );
      return;
    }
    this.hint.setText(`A: act   B: atrium   (${done}/${total})`);
  }

  private refreshHintForProximity() {
    const h = this.findHotspotInRange();
    if (!h) {
      this.refreshHint();
      return;
    }
    const enabled = h.enabled ? h.enabled() : true;
    const prefix = enabled ? "A: " : "(locked) ";
    this.hint.setText(`${prefix}${h.label}`);
  }

  private flashHint(text: string) {
    this.hint.setText(text);
    this.time.delayedCall(1400, () => this.refreshHint());
  }
}

// =====================================================================
// VenusTrialScene — bespoke three-phase Kypria encounter
// =====================================================================

type TrialChoice = {
  id: string;
  label: string;
  reply: string;
  attuned: boolean;
  truthful: boolean;
  nonPerformative: boolean;
};

const TRIAL_CHOICES: Record<string, TrialChoice[]> = {
  beauty_without_witness: [
    { id: "receive_silence", label: "Receive it in silence.", reply: "Attuned.", attuned: true, truthful: true, nonPerformative: true },
    { id: "match_quiet", label: "Match its quiet.", reply: "Attuned, gently.", attuned: true, truthful: true, nonPerformative: true },
    { id: "praise_well", label: "Praise it well.", reply: "Praise is also distance.", attuned: false, truthful: true, nonPerformative: false },
    { id: "photograph", label: "Photograph it.", reply: "Captured. Not attuned.", attuned: false, truthful: false, nonPerformative: false },
  ],
  beloved_without_recognition: [
    { id: "greet_anyway", label: "Greet them anyway.", reply: "Attuned.", attuned: true, truthful: true, nonPerformative: true },
    { id: "stay_quiet", label: "Stay nearby. Quietly.", reply: "Attuned, with grief.", attuned: true, truthful: true, nonPerformative: true },
    { id: "walk_past", label: "Walk past.", reply: "Honest. Counted.", attuned: false, truthful: true, nonPerformative: true },
    { id: "demand_memory", label: "Demand to be remembered.", reply: "The room cools.", attuned: false, truthful: false, nonPerformative: false },
  ],
  ugliness_that_is_own: [
    { id: "look_at_it", label: "Look at it.", reply: "Attuned.", attuned: true, truthful: true, nonPerformative: true },
    { id: "sit_beside", label: "Sit beside it.", reply: "Attuned, with kindness.", attuned: true, truthful: true, nonPerformative: true },
    { id: "frame_as_art", label: "Frame it as art.", reply: "Performance. Counted as one.", attuned: false, truthful: false, nonPerformative: false },
    { id: "turn_away", label: "Turn away.", reply: "It will follow you.", attuned: false, truthful: false, nonPerformative: true },
  ],
};

export class VenusTrialScene extends Phaser.Scene {
  private save!: SaveSlot;
  private state: VenusTrialState = initialVenusTrialState();
  private busy = false;

  constructor() {
    super("VenusTrial");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "VenusTrial";
    this.save.act = ACT_BY_SCENE.VenusTrial;
    writeSave(this.save);
    this.state = initialVenusTrialState();
    this.busy = false;
  }

  create() {
    this.cameras.main.setBackgroundColor(venusConfig.bg);
    this.cameras.main.fadeIn(420);
    spawnMotes(this, { count: 14, color: venusConfig.accent, alpha: 0.55 });

    attachHUD(this, () => this.save.stats);
    publishVenusTrialMinimap("Kypria's Trial");

    new GBCText(this, GBC_W / 2 - 36, 16, "KYPRIA'S TRIAL", {
      color: COLOR.textGold,
      depth: 30,
    });

    this.time.delayedCall(280, () =>
      runDialog(this, venusConfig.trialOpening, () => this.runPhase()),
    );
  }

  private runPhase() {
    if (this.state.phaseIndex >= VENUS_TRIAL_PHASES.length) {
      this.resolveTrial();
      return;
    }

    const phase = VENUS_TRIAL_PHASES[this.state.phaseIndex];
    publishVenusTrialMinimap(phase.title);

    // Phase 1: ATTUNE-then-respond
    runDialog(
      this,
      [
        { who: "KYPRIA", text: phase.title.toUpperCase() + "." },
        { who: "KYPRIA", text: phase.prompt },
      ],
      () => this.runPhaseAttune(phase.id),
    );
  }

  private runPhaseAttune(phaseId: string) {
    // A small ATTUNE prompt before the choice — holding non-action for a
    // beat earns "attuned" weighting on the response.
    const cx = GBC_W / 2;
    const cy = 70;
    const box = drawGBCBox(this, cx - 60, cy - 14, 120, 28, 30);
    const label = new GBCText(this, cx - 56, cy - 10, "HOLD STILL. DO NOTHING.", {
      color: COLOR.textAccent,
      depth: 31,
    });
    const ring = makeAttuneRing(this, cx, cy + 4, 6, 0xe89bb8);

    let elapsed = 0;
    const requiredMs = 1400;
    let resolved = false;
    let attuned = false;
    let cleanupAct: (() => void) | null = null;

    const tick = this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        elapsed += 30;
        ring.update(Math.min(1, elapsed / requiredMs));
        if (elapsed >= requiredMs && !resolved) {
          resolved = true;
          attuned = true;
          tick.remove(false);
          ring.destroy();
          box.destroy();
          label.destroy();
          cleanupAct?.();
          this.runPhaseChoice(phaseId, attuned);
        }
      },
    });

    cleanupAct = onActionDown(this, "action", () => {
      if (resolved) return;
      resolved = true;
      attuned = false;
      tick.remove(false);
      ring.destroy();
      box.destroy();
      label.destroy();
      cleanupAct?.();
      this.runPhaseChoice(phaseId, attuned);
    });
  }

  private runPhaseChoice(phaseId: string, attuned: boolean) {
    const choices = TRIAL_CHOICES[phaseId];
    const phase = VENUS_TRIAL_PHASES[this.state.phaseIndex];
    askSphere(
      this,
      { who: "KYPRIA", text: phase.prompt },
      choices.map((c) => ({
        id: c.id,
        label: c.label,
        reply: c.reply,
        weight: (c.attuned ? 1 : 0) + (c.truthful ? 1 : 0) + (c.nonPerformative ? 1 : 0),
      })),
      (picked) => {
        const choice = choices.find((c) => c.id === picked.id) ?? choices[0];
        const phaseScore = scoreVenusTrialResponse({
          attuned: choice.attuned && attuned,
          truthful: choice.truthful,
          nonPerformative: choice.nonPerformative,
        });
        this.state.score += phaseScore;
        this.state.attuneScores.push(phaseScore);
        this.state.phaseIndex += 1;
        this.runPhase();
      },
    );
  }

  private resolveTrial() {
    if (venusTrialPassed(this.state)) {
      awardVenusTrialPass(this.save, venusConfig.inscription);
      writeSave(this.save);
      runDialog(this, venusConfig.trialPass, () => {
        gbcWipe(this, () => this.scene.start("MetaxyHub", { save: this.save }));
      });
      return;
    }
    this.save.coherence = Math.max(0, this.save.coherence - 15);
    writeSave(this.save);
    runDialog(this, venusConfig.trialFail, () => {
      gbcWipe(this, () => this.scene.start("VenusPlateau", { save: this.save }));
    });
  }
}
