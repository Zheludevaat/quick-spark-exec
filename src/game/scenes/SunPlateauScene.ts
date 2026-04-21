/**
 * SunPlateauScene — Act 6 plateau before the Helion trial.
 *
 * PHASE 1 REBUILD (Mercury parity): the six sub-zones (vestibule, testimony,
 * archive, mirrors, warmth, threshold) are no longer separate scenes joined
 * by travel doors. They are ONE continuous Hall the player walks through,
 * with stations placed at fixed positions across the room.
 *
 * Stations (all live simultaneously):
 *   - witness arcs (3) — biographer / betrayed / accomplice
 *   - operations (4)   — light / margin / contradiction / dim
 *   - environmental reads (~12) — plaques / banners / pages / keepsakes / pillars
 *   - cracking question, trial gate, settle — at the right-end threshold
 *
 * Movement: free 2D walking inside the GBC playfield. Proximity activation
 * surfaces the nearest station as an "[A] VERB" prompt above Rowan, mirroring
 * the Mercury walker. The player's current sub-zone is derived from x and
 * drives the per-zone aftermath repaint + snapshot label.
 *
 * Trial entry remains gated by `sunTrialReady`. All save flags, witness
 * heard / op done bookkeeping, and settle behaviour are preserved.
 */

import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, gbcWipe, spawnMotes } from "../gbcArt";
import type { SaveSlot } from "../types";
import { ACT_BY_SCENE } from "../types";
import { writeSave } from "../save";
import {
  attachHUD,
  makeRowan,
  animateRowan,
  runDialog,
  InputState,
} from "./hud";
import { onActionDown } from "../controls";
import { runInquiry } from "../inquiry";
import { setSceneSnapshot } from "../gameUiBridge";
import {
  SUN_ZONE_LABEL,
  SUN_MINIMAP_NODES,
  SUN_FLAGS,
  type SunZoneId,
} from "../sun/SunData";
import { SUN_WITNESSES, type SunWitness } from "../sun/SunNpcDefs";
import {
  SUN_OPERATIONS,
  sunCrackingQuestion,
  sunTrialReady,
  type SunOperation,
} from "../sun/SunContent";
import {
  makeSunHint,
  makeSunSubtitle,
  makeSunZoneLabel,
} from "../sun/SunUi";
import {
  buildSunHallBackdrop,
  addSunHallForeground,
  addSunHallAftermath,
} from "../sun/SunArt";
import { SUN_ENV_READS, sunZoneAftermath } from "../sun/SunPlateauProps";

const HALL_FINISHED_FLAG = "sun_hall_finished_beat";

/**
 * Horizontal anchor (in GBC pixels, 0..160) at which each sub-zone is
 * "centred". The Hall reads left→right as a single procession from the
 * vestibule to the threshold, matching the canonical minimap order.
 */
const ZONE_ANCHOR_X: Record<SunZoneId, number> = {
  vestibule: 18,
  testimony: 46,
  archive: 70,
  mirrors: 94,
  warmth: 120,
  threshold: 146,
};

const ZONE_ORDER: SunZoneId[] = [
  "vestibule",
  "testimony",
  "archive",
  "mirrors",
  "warmth",
  "threshold",
];

const WARM = 0xd8b060;
const COLD = 0xb87838;

type StationKind =
  | "witness"
  | "operation"
  | "env"
  | "crack"
  | "trial"
  | "settle";

type Station = {
  id: string;
  kind: StationKind;
  zone: SunZoneId;
  x: number;
  y: number;
  /** Used by proximity prompt + idle hint */
  label: string;
  /** Save flag toggled true once the station has been "completed/seen" */
  doneFlag?: string;
  onUse: () => void;
};

export class SunPlateauScene extends Phaser.Scene {
  private save!: SaveSlot;
  /** Sub-zone derived from Rowan's x position. */
  private zone!: SunZoneId;
  private root!: Phaser.GameObjects.Container;
  private aftermathLayer?: Phaser.GameObjects.Container;
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private inputState!: InputState;
  private zoneLabel!: GBCText;
  private subtitle!: GBCText;
  private hint!: GBCText;
  private interactPrompt!: GBCText;
  private stationFocus!: Phaser.GameObjects.Arc;
  private stations: Station[] = [];
  private nameplates: GBCText[] = [];
  private gatePulse?: Phaser.GameObjects.Arc;
  private gatePulseTween?: Phaser.Tweens.Tween;
  private ambientBarkEvent?: Phaser.Time.TimerEvent;
  private activeBark?: GBCText;
  private busy = false;
  private lastDx = 0;
  private lastDy = 0;
  private hallFinishedShown = false;

  constructor() {
    super("SunPlateau");
  }

  init(data: { save: SaveSlot; zone?: SunZoneId }) {
    this.save = data.save;
    // `zone` is now a *spawn hint*: where Rowan first appears in the Hall.
    this.zone = data.zone ?? this.save.sunZone ?? "vestibule";
    this.save.scene = "SunPlateau";
    this.save.sunZone = this.zone;
    this.save.act = ACT_BY_SCENE.SunPlateau;
    writeSave(this.save);
    this.stations = [];
    this.busy = false;
    this.hallFinishedShown = !!this.save.flags[HALL_FINISHED_FLAG];
  }

  create() {
    this.cameras.main.setBackgroundColor("#08070c");
    this.cameras.main.fadeIn(500);

    this.root = this.add.container(0, 0);
    // Phase 2: paint the Hall as a single continuous room.
    buildSunHallBackdrop(this, this.root);
    spawnMotes(this, { count: 16, color: WARM, alpha: 0.25, depth: 8 });
    this.aftermathLayer = this.add.container(0, 0);
    this.root.add(this.aftermathLayer);
    this.repaintAftermath();
    addSunHallForeground(this, this.root);

    this.zoneLabel = makeSunZoneLabel(this, SUN_ZONE_LABEL[this.zone]);
    this.subtitle = makeSunSubtitle(this, this.zoneSubtitle(this.zone));
    this.hint = makeSunHint(this, "WALK · A INTERACT");
    void this.zoneLabel;
    void this.subtitle;
    attachHUD(this, () => this.save.stats);

    // Spawn Rowan at the current sub-zone's anchor.
    const spawnX = ZONE_ANCHOR_X[this.zone];
    this.rowanShadow = this.add
      .ellipse(spawnX, GBC_H - 18, 10, 3, 0x000000, 0.4)
      .setDepth(19);
    this.rowan = makeRowan(this, spawnX, GBC_H - 22, "soul").setDepth(40);
    this.inputState = new InputState(this);

    this.interactPrompt = new GBCText(this, 0, 0, "", {
      color: COLOR.textGold,
      depth: 60,
    });

    this.stationFocus = this.add
      .circle(0, 0, 11, WARM, 0)
      .setStrokeStyle(1, WARM, 0.85)
      .setDepth(18)
      .setVisible(false);
    this.tweens.add({
      targets: this.stationFocus,
      scale: 1.18,
      alpha: 0.55,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    this.buildStations();
    this.buildNameplates();
    this.buildGatePulse();
    this.startAmbientBarks();
    this.publishSnapshot();

    if (!this.save.flags[SUN_FLAGS.introSeen]) {
      this.save.flags[SUN_FLAGS.introSeen] = true;
      writeSave(this.save);
      this.busy = true;
      this.time.delayedCall(300, () => {
        runDialog(
          this,
          [
            { who: "SOPHENE", text: "Sun. The Hall of Testimony." },
            {
              who: "SOPHENE",
              text: "Walk it. Everything here is interested in how you appear under light. Try to remain a person anyway.",
            },
          ],
          () => {
            this.busy = false;
          },
        );
      });
    }

    onActionDown(this, "action", () => this.tryInteract());
    this.events.on("vinput-action", () => this.tryInteract());
  }

  // -------------------------------------------------------------- update

  update(_t: number, delta: number) {
    if (this.busy) {
      this.interactPrompt.setText("");
      animateRowan(this.rowan, 0, 0);
      return;
    }

    const speed = 0.045 * delta;
    const i = this.inputState.poll();
    let dx = 0;
    let dy = 0;
    if (i.left) dx -= speed;
    if (i.right) dx += speed;
    if (i.up) dy -= speed;
    if (i.down) dy += speed;

    this.rowan.x = Phaser.Math.Clamp(this.rowan.x + dx, 8, GBC_W - 8);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y + dy, 88, GBC_H - 14);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);
    animateRowan(this.rowan, dx, dy);
    this.lastDx = dx;
    this.lastDy = dy;

    // Cross sub-zone boundary?
    const nextZone = this.zoneFromX(this.rowan.x);
    if (nextZone !== this.zone) {
      this.zone = nextZone;
      this.save.sunZone = nextZone;
      writeSave(this.save);
      this.zoneLabel.setText(SUN_ZONE_LABEL[nextZone]);
      this.subtitle.setText(this.zoneSubtitle(nextZone));
      this.repaintAftermath();
      this.publishSnapshot();
      this.maybePlayHallFinishedBeat();
    }

    const near = this.nearestStation();
    if (near) {
      const verb = this.verbForStation(near);
      this.interactPrompt.setText(`[A] ${verb}`);
      this.interactPrompt.setPosition(this.rowan.x - 12, this.rowan.y - 20);
      this.hint.setText(this.hintForStation(near));
      this.hint.setColor(COLOR.textGold);
      const done = near.doneFlag && this.save.flags[near.doneFlag];
      this.stationFocus
        .setVisible(true)
        .setPosition(near.x, near.y)
        .setStrokeStyle(1, done ? COLD : WARM, 0.9);
    } else {
      this.interactPrompt.setText("");
      this.hint.setText("WALK · A INTERACT");
      this.hint.setColor(COLOR.textDim);
      this.stationFocus.setVisible(false);
    }
  }

  // -------------------------------------------------------------- zones

  private zoneFromX(x: number): SunZoneId {
    let best: SunZoneId = "vestibule";
    let bestD = Infinity;
    for (const z of ZONE_ORDER) {
      const d = Math.abs(ZONE_ANCHOR_X[z] - x);
      if (d < bestD) {
        bestD = d;
        best = z;
      }
    }
    return best;
  }

  private witnessForZone(zone: SunZoneId): SunWitness | undefined {
    return SUN_WITNESSES.find((w) => w.zone === zone);
  }

  private opForZone(zone: SunZoneId): SunOperation | undefined {
    return SUN_OPERATIONS.find((o) => o.zone === zone);
  }

  private repaintAftermath() {
    if (!this.aftermathLayer) return;
    this.aftermathLayer.removeAll(true);
    const ready = sunTrialReady(this.save);
    addSunHallAftermath(this, this.aftermathLayer, (zone) => {
      const witness = this.witnessForZone(zone);
      const op = this.opForZone(zone);
      const wDone = witness ? !!this.save.flags[witness.doneFlag] : true;
      const oDone = op ? !!this.save.flags[op.doneFlag] : true;
      return sunZoneAftermath(zone, wDone, oDone, ready);
    });
  }

  private zoneSubtitle(zone: SunZoneId): string {
    switch (zone) {
      case "vestibule":
        return "PRAISE, RECEPTION, ORNAMENT";
      case "testimony":
        return "WITNESSES SPEAK";
      case "archive":
        return "REVISIONS, MARGINS, VERSIONS";
      case "mirrors":
        return "RECOGNITION WITHOUT COMFORT";
      case "warmth":
        return "SEEN WITHOUT DISPLAY";
      case "threshold":
        return "HELION WAITS";
    }
  }

  // -------------------------------------------------------------- stations

  /**
   * Build every station for every zone at fixed positions. The Hall is
   * single-room, so all stations exist simultaneously; proximity decides
   * what the player can act on.
   *
   * Y-bands keep things readable:
   *   - witnesses sit mid-room (~y 70)
   *   - operations sit upper (~y 60)
   *   - env reads use their authored (x,y) but x is shifted into the zone's
   *     anchor band to keep them near their parent zone in this single room
   *   - threshold meta-stations (crack/trial/settle) cluster at the right end
   */
  private buildStations() {
    this.stations = [];

    // Witnesses
    for (const w of SUN_WITNESSES) {
      this.stations.push({
        id: w.id,
        kind: "witness",
        zone: w.zone,
        x: ZONE_ANCHOR_X[w.zone],
        y: 72,
        label: this.save.flags[w.doneFlag] ? `REVISIT ${w.name}` : w.name,
        doneFlag: w.doneFlag,
        onUse: () => this.talkWitness(w.id),
      });
    }

    // Operations
    for (const op of SUN_OPERATIONS) {
      this.stations.push({
        id: op.id,
        kind: "operation",
        zone: op.zone,
        x: ZONE_ANCHOR_X[op.zone] + 10,
        y: 56,
        label: this.save.flags[op.doneFlag]
          ? `(DONE) ${op.title.toUpperCase()}`
          : op.title.toUpperCase(),
        doneFlag: op.doneFlag,
        onUse: () => this.runOperation(op.id),
      });
    }

    // Environmental reads — re-anchor each authored x near its zone's band
    // so reads cluster around their parent zone in the single Hall room.
    for (const zone of ZONE_ORDER) {
      const reads = SUN_ENV_READS[zone] ?? [];
      const anchor = ZONE_ANCHOR_X[zone];
      reads.forEach((read, idx) => {
        // Two reads per zone: place one a hair left of anchor, one right.
        const ox = idx === 0 ? -8 : 8;
        const x = Phaser.Math.Clamp(anchor + ox, 8, GBC_W - 8);
        this.stations.push({
          id: read.id,
          kind: "env",
          zone,
          x,
          y: Phaser.Math.Clamp(read.y, 52, 100),
          label: this.save.flags[read.id]
            ? `RE-READ ${read.label.replace(/^READ |^EXAMINE /, "")}`
            : read.label,
          doneFlag: read.id,
          onUse: () => this.readEnv(zone, read.id),
        });
      });
    }

    // Threshold meta-stations
    this.stations.push({
      id: "crack",
      kind: "crack",
      zone: "threshold",
      x: ZONE_ANCHOR_X.threshold - 6,
      y: 60,
      label: this.save.flags[SUN_FLAGS.crackingQuestionDone]
        ? "REVISIT CRACKING QUESTION"
        : "CRACKING QUESTION",
      doneFlag: SUN_FLAGS.crackingQuestionDone,
      onUse: () => this.runCrackingQuestion(),
    });
    this.stations.push({
      id: "trial",
      kind: "trial",
      zone: "threshold",
      x: ZONE_ANCHOR_X.threshold + 4,
      y: 70,
      label: sunTrialReady(this.save)
        ? "ENTER TRIAL"
        : "ENTER TRIAL (LOCKED)",
      onUse: () => this.enterTrial(),
    });
    this.stations.push({
      id: "settle",
      kind: "settle",
      zone: "threshold",
      x: ZONE_ANCHOR_X.threshold,
      y: 88,
      label: "SETTLE HERE",
      onUse: () => this.settleHere(),
    });
  }

  private rebuildStationLabels() {
    // Cheap re-label after a flag changes; positions don't move.
    this.stations = [];
    this.buildStations();
    this.buildNameplates();
    this.refreshGatePulse();
  }

  /**
   * Static dim labels under each "named" station (witnesses, ops, threshold
   * meta) so the Hall reads as inhabited even at a distance. Env reads are
   * intentionally left unlabelled — they're discoveries, not landmarks.
   */
  private buildNameplates() {
    for (const np of this.nameplates) np.destroy();
    this.nameplates = [];
    for (const s of this.stations) {
      if (s.kind === "env") continue;
      const done = !!(s.doneFlag && this.save.flags[s.doneFlag]);
      let text = "";
      if (s.kind === "witness") {
        const w = SUN_WITNESSES.find((x) => x.id === s.id);
        text = w ? w.name : s.id.toUpperCase();
      } else if (s.kind === "operation") {
        const op = SUN_OPERATIONS.find((o) => o.id === s.id);
        text = op ? op.title.toUpperCase() : s.id.toUpperCase();
      } else if (s.kind === "crack") {
        text = "QUESTION";
      } else if (s.kind === "trial") {
        text = "GATE";
      } else if (s.kind === "settle") {
        text = "REMAIN";
      }
      if (!text) continue;
      // Truncate so adjacent bays don't collide.
      const short = text.length > 14 ? text.slice(0, 13) + "." : text;
      const w = short.length * 3.5;
      const np = new GBCText(this, s.x - w / 2, s.y + 12, short, {
        color: done ? COLOR.textDim : COLOR.textAccent,
        depth: 17,
        maxWidthPx: 56,
      });
      this.nameplates.push(np);
    }
  }

  /**
   * Soft pulsing ring at the trial gate bay once `sunTrialReady`. Goes
   * away if the player walks back into the threshold and re-checks.
   */
  private buildGatePulse() {
    this.gatePulse = this.add
      .circle(ZONE_ANCHOR_X.threshold + 4, 70, 12, WARM, 0)
      .setStrokeStyle(1, WARM, 0.7)
      .setDepth(16)
      .setVisible(false);
    this.refreshGatePulse();
  }

  private refreshGatePulse() {
    if (!this.gatePulse) return;
    const ready = sunTrialReady(this.save);
    this.gatePulse.setVisible(ready);
    this.gatePulseTween?.stop();
    if (ready) {
      this.gatePulseTween = this.tweens.add({
        targets: this.gatePulse,
        scale: 1.25,
        alpha: 0.45,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
  }

  /**
   * Ambient witness murmurs while the player walks the Hall. Picks an
   * incomplete witness at random every 6-9 seconds and floats one of its
   * `barks` upward above its station. Skipped while busy or while a bark
   * is already on screen.
   */
  private startAmbientBarks() {
    this.ambientBarkEvent?.remove(false);
    this.ambientBarkEvent = this.time.addEvent({
      delay: Phaser.Math.Between(6000, 9000),
      loop: true,
      callback: () => {
        if (this.busy || this.activeBark) return;
        const candidates = this.stations.filter(
          (s) =>
            s.kind === "witness" &&
            !(s.doneFlag && this.save.flags[s.doneFlag]),
        );
        if (!candidates.length) return;
        const st = Phaser.Utils.Array.GetRandom(candidates) as Station;
        const w = SUN_WITNESSES.find((x) => x.id === st.id);
        if (!w || !w.barks.length) return;
        const line = Phaser.Utils.Array.GetRandom(w.barks) as string;
        const bark = new GBCText(this, st.x - 28, st.y - 22, line, {
          color: COLOR.textDim,
          depth: 41,
          maxWidthPx: 64,
        });
        this.activeBark = bark;
        this.tweens.add({
          targets: bark.obj,
          alpha: 0,
          y: st.y - 32,
          duration: 2000,
          onComplete: () => {
            bark.destroy();
            if (this.activeBark === bark) this.activeBark = undefined;
          },
        });
      },
    });
  }

  private nearestStation(): Station | null {
    let best: Station | null = null;
    let bestD = 16;
    for (const s of this.stations) {
      const d = Phaser.Math.Distance.Between(
        this.rowan.x,
        this.rowan.y,
        s.x,
        s.y,
      );
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  private verbForStation(s: Station): string {
    if (s.doneFlag && this.save.flags[s.doneFlag]) {
      switch (s.kind) {
        case "witness":
          return "REVISIT";
        case "operation":
          return "REFLECT";
        case "env":
          return "RE-READ";
        case "crack":
          return "REVISIT";
        default:
          return "INTERACT";
      }
    }
    switch (s.kind) {
      case "witness":
        return "SPEAK";
      case "operation":
        return "WORK";
      case "env":
        return "READ";
      case "crack":
        return "ANSWER";
      case "trial":
        return sunTrialReady(this.save) ? "ENTER" : "TRY";
      case "settle":
        return "REMAIN";
    }
  }

  private hintForStation(s: Station): string {
    return s.label;
  }

  private tryInteract() {
    if (this.busy) return;
    const s = this.nearestStation();
    if (!s) return;
    this.busy = true;
    this.interactPrompt.setText("");
    s.onUse();
  }

  // ---------------------------------------------------------- env reads

  private readEnv(zone: SunZoneId, id: string) {
    const read = (SUN_ENV_READS[zone] ?? []).find((r) => r.id === id);
    if (!read) {
      this.busy = false;
      return;
    }
    const seen = !!this.save.flags[id];
    const lines = seen && read.revisit ? [read.revisit] : read.lines;
    runDialog(this, lines, () => {
      if (!seen) {
        this.save.flags[id] = true;
        writeSave(this.save);
        this.rebuildStationLabels();
      }
      this.busy = false;
      this.publishSnapshot();
    });
  }

  // ---------------------------------------------------------- witnesses

  private talkWitness(id: string) {
    const witness = SUN_WITNESSES.find((w) => w.id === id);
    if (!witness) {
      this.busy = false;
      return;
    }

    const done = !!this.save.flags[witness.doneFlag];

    if (done) {
      const lines: { who: string; text: string }[] = [...witness.revisit];
      const others = SUN_WITNESSES.filter(
        (w) => w.id !== witness.id && this.save.flags[w.doneFlag],
      );
      if (others.length > 0) {
        const cross = witness.crossReference[others[0].id];
        if (cross) lines.push({ who: witness.name, text: cross });
        lines.push(witness.softening);
      }
      runDialog(this, lines, () => {
        this.busy = false;
        this.publishSnapshot();
      });
      return;
    }

    runDialog(this, witness.intro, () => {
      runInquiry(
        this,
        { who: witness.name, text: "Choose." },
        witness.options.map((o) => ({
          id: o.id,
          choice: "observe",
          label: o.label,
          reply: o.reply,
        })),
        (picked) => {
          if (picked) {
            this.save.flags[witness.doneFlag] = true;
            this.save.sunWitnessHeard[witness.id] = true;
            writeSave(this.save);
            this.repaintAftermath();
            this.rebuildStationLabels();
          }
          this.busy = false;
          this.publishSnapshot();
        },
      );
    });
  }

  // ---------------------------------------------------------- operations

  private runOperation(id: string) {
    const op = SUN_OPERATIONS.find((o) => o.id === id);
    if (!op) {
      this.busy = false;
      return;
    }
    const done = !!this.save.flags[op.doneFlag];
    if (done) {
      runDialog(
        this,
        [
          { who: "?", text: op.aftermath },
          {
            who: "?",
            text: "The work here is done. The room remembers it for you.",
          },
        ],
        () => {
          this.busy = false;
          this.publishSnapshot();
        },
      );
      return;
    }
    this.runOperationMechanic(op);
  }

  private runOperationMechanic(op: SunOperation) {
    const steps = op.steps ?? [];
    const stepLines: { who: string; text: string }[] = steps.map((text, i) => {
      switch (op.mechanic) {
        case "hold_in_light":
          return { who: `LIGHT ${i + 1}/${steps.length}`, text };
        case "margin_compare":
          return { who: i % 2 === 0 ? "MAIN" : "MARGIN", text };
        case "hold_contradiction":
          return {
            who: i === 0 ? "MIRROR LEFT" : i === 1 ? "MIRROR RIGHT" : "?",
            text,
          };
        case "let_image_dim":
          return { who: `IMAGE ${i + 1}/${steps.length}`, text };
      }
    });

    const framing: { who: string; text: string }[] = [op.prompt, ...stepLines];

    runDialog(this, framing, () => {
      runInquiry(
        this,
        { who: op.prompt.who, text: "Commit." },
        op.options.map((o) => ({
          id: o.id,
          choice: "observe",
          label: o.label,
          reply: o.reply,
        })),
        (picked) => {
          if (picked) {
            this.save.flags[op.doneFlag] = true;
            this.save.sunOpsDone[op.id] = true;
            writeSave(this.save);
            this.repaintAftermath();
            this.rebuildStationLabels();
            runDialog(this, [{ who: "?", text: op.aftermath }], () => {
              this.busy = false;
              this.publishSnapshot();
            });
            return;
          }
          this.busy = false;
          this.publishSnapshot();
        },
      );
    });
  }

  // ---------------------------------------------------------- threshold

  private runCrackingQuestion() {
    const cq = sunCrackingQuestion(this.save);
    runInquiry(
      this,
      cq.prompt,
      cq.options.map((o) => ({
        id: o.id,
        choice: "observe",
        label: o.label,
        reply: o.reply,
      })),
      (picked) => {
        if (picked) {
          this.save.flags[SUN_FLAGS.crackingQuestionDone] = true;
          this.save.sunTrialReady = sunTrialReady(this.save);
          writeSave(this.save);
          this.rebuildStationLabels();
        }
        this.busy = false;
        this.maybePlayHallFinishedBeat();
        this.publishSnapshot();
      },
    );
  }

  private enterTrial() {
    if (!sunTrialReady(this.save)) {
      const missing = this.missingPrereqSummary();
      runDialog(
        this,
        [
          {
            who: "SOPHENE",
            text: "Not yet. The hall is still speaking in pieces.",
          },
          { who: "SOPHENE", text: missing },
        ],
        () => {
          this.busy = false;
        },
      );
      return;
    }
    this.save.sunTrialReady = true;
    this.save.scene = "SunTrial";
    writeSave(this.save);
    gbcWipe(this, () => this.scene.start("SunTrial", { save: this.save }));
  }

  private missingPrereqSummary(): string {
    const need: string[] = [];
    SUN_WITNESSES.forEach((w) => {
      if (!this.save.flags[w.doneFlag]) need.push(w.name);
    });
    SUN_OPERATIONS.forEach((o) => {
      if (!this.save.flags[o.doneFlag]) need.push(o.title.toUpperCase());
    });
    if (!this.save.flags[SUN_FLAGS.crackingQuestionDone]) {
      need.push("THE CRACKING QUESTION");
    }
    if (need.length === 0) return "Almost. Try again.";
    if (need.length === 1) return `Still owed: ${need[0]}.`;
    return `Still owed: ${need.slice(0, 3).join(", ")}${need.length > 3 ? ", ..." : ""}.`;
  }

  private settleHere() {
    runInquiry(
      this,
      {
        who: "SOPHENE",
        text: "Remain here in testimony and light? It is a real ending, just not a large one.",
      },
      [
        {
          choice: "confess",
          label: "REMAIN",
          reply:
            "Then remain. The hall will keep telling the truth about you until it gets bored.",
        },
        {
          choice: "silent",
          label: "NOT YET",
          reply: "Good. There is still more road than room in you.",
        },
      ],
      (picked) => {
        if (picked?.label === "REMAIN") {
          this.save.plateauSettled = {
            ...this.save.plateauSettled,
            sun: true,
          };
          this.save.flags[SUN_FLAGS.remainChosen] = true;
          writeSave(this.save);
          this.scene.start("Title");
          return;
        }
        this.busy = false;
      },
    );
  }

  /** Threshold ceremony beat: fires once when everything is ready and the
   * player is standing in the threshold band. */
  private maybePlayHallFinishedBeat() {
    if (this.hallFinishedShown) return;
    if (this.zone !== "threshold") return;
    if (!sunTrialReady(this.save)) return;
    this.hallFinishedShown = true;
    this.save.flags[HALL_FINISHED_FLAG] = true;
    writeSave(this.save);
    this.busy = true;
    this.time.delayedCall(450, () => {
      runDialog(
        this,
        [
          {
            who: "?",
            text: "The hall has finished speaking. The witnesses are seated. The pages are amended.",
          },
          {
            who: "SOPHENE",
            text: "It is yours to cross now. Helion does not require performance.",
          },
        ],
        () => {
          this.busy = false;
        },
      );
    });
  }

  // ---------------------------------------------------------- shell pub

  private publishSnapshot() {
    const witnessCount = Object.values(this.save.sunWitnessHeard).filter(
      Boolean,
    ).length;
    const opCount = Object.values(this.save.sunOpsDone).filter(Boolean).length;
    const ready = sunTrialReady(this.save);

    const witness = this.witnessForZone(this.zone);
    const op = this.opForZone(this.zone);
    const reads = SUN_ENV_READS[this.zone] ?? [];
    const readsSeen = reads.filter((r) => this.save.flags[r.id]).length;

    const zoneStatus: string[] = [];
    if (witness) {
      zoneStatus.push(
        this.save.flags[witness.doneFlag]
          ? `${witness.name}: HEARD`
          : `${witness.name}: WAITING`,
      );
    }
    if (op) {
      zoneStatus.push(
        this.save.flags[op.doneFlag]
          ? `${op.title.toUpperCase()}: DONE`
          : `${op.title.toUpperCase()}: PENDING`,
      );
    }
    if (reads.length > 0) {
      zoneStatus.push(`READS ${readsSeen}/${reads.length}`);
    }

    setSceneSnapshot({
      key: "SunPlateau",
      label: "Sun - Hall of Testimony",
      act: ACT_BY_SCENE.SunPlateau,
      zone: SUN_ZONE_LABEL[this.zone],
      nodes: SUN_MINIMAP_NODES.map((n) => ({
        id: n.id,
        label: n.label,
        x: n.x,
        y: n.y,
        active: n.id === this.zone,
      })),
      marker: null,
      idleTitle: SUN_ZONE_LABEL[this.zone].toUpperCase(),
      idleBody: [
        this.zoneSubtitle(this.zone),
        ...zoneStatus,
        `Witnesses ${witnessCount}/3 · Operations ${opCount}/4`,
        ready ? "Trial threshold open." : "More testimony required.",
      ].join("\n"),
      footerHint:
        this.zone === "threshold"
          ? ready
            ? "WALK · A ENTER THE GATE"
            : "WALK · A INTERACT · COMPLETE TESTIMONY"
          : "WALK · A INTERACT · WALK RIGHT TOWARD THE THRESHOLD",
      showStatsBar: true,
      showUtilityRail: true,
      showDialogueDock: true,
      showMiniMap: true,
      allowPlayerHub: true,
      showFooter: true,
    });
    void COLOR;
    void GBC_H;
    void GBC_W;
    void this.lastDx;
    void this.lastDy;
  }
}
