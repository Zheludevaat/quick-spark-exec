/**
 * SunPlateauScene — Act 6 plateau before the Helion trial.
 *
 * Six explorable sub-zones (vestibule, testimony, archive, mirrors, warmth,
 * threshold) wired together by an adjacency graph in SunData. Each zone
 * hosts:
 *   - 0..1 witness arc (with revisit + cross-reference lines)
 *   - 0..1 operation (routed to a real mechanic — see runOperationMechanic)
 *   - 1..2 environmental reads (plaques / banners / pages / keepsakes)
 *
 * Once a zone's witness/operation is complete, addSunAftermath softens the
 * room. Once every prerequisite is met, a one-time "hall has finished
 * speaking" beat plays at the threshold.
 *
 * Trial entry is gated by `sunTrialReady`.
 */

import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, gbcWipe, spawnMotes } from "../gbcArt";
import type { SaveSlot } from "../types";
import { ACT_BY_SCENE } from "../types";
import { writeSave } from "../save";
import { attachHUD, makeRowan, animateRowan, runDialog } from "./hud";
import { onActionDown, onDirection } from "../controls";
import { runInquiry } from "../inquiry";
import { setSceneSnapshot } from "../gameUiBridge";
import { getAudio } from "../audio";
import {
  SUN_ZONE_LABEL,
  SUN_ZONE_LINKS,
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
  buildSunBackdrop,
  addSunForeground,
  addSunAftermath,
} from "../sun/SunArt";
import { SUN_ENV_READS, sunZoneAftermath } from "../sun/SunPlateauProps";

const HALL_FINISHED_FLAG = "sun_hall_finished_beat";

type Hotspot = {
  id: string;
  x: number;
  y: number;
  r: number;
  label: string;
  onUse: () => void;
};

export class SunPlateauScene extends Phaser.Scene {
  private save!: SaveSlot;
  private zone!: SunZoneId;
  private root!: Phaser.GameObjects.Container;
  private rowan!: Phaser.GameObjects.Container;
  private zoneLabel!: GBCText;
  private subtitle!: GBCText;
  private hint!: GBCText;
  private hotspots: Hotspot[] = [];
  private cursor = 0;
  private busy = false;
  private playerDir = { x: 0, y: 0 };

  constructor() {
    super("SunPlateau");
  }

  init(data: { save: SaveSlot; zone?: SunZoneId }) {
    this.save = data.save;
    this.zone = data.zone ?? this.save.sunZone ?? "vestibule";
    this.save.scene = "SunPlateau";
    this.save.sunZone = this.zone;
    this.save.act = ACT_BY_SCENE.SunPlateau;
    writeSave(this.save);
    this.hotspots = [];
    this.cursor = 0;
    this.busy = false;
    this.playerDir = { x: 0, y: 0 };
  }

  create() {
    this.cameras.main.setBackgroundColor("#08070c");
    this.cameras.main.fadeIn(500);

    this.root = this.add.container(0, 0);
    buildSunBackdrop(this, this.root, this.zone);
    spawnMotes(this, { count: 16, color: 0xd8b060, alpha: 0.25, depth: 8 });
    this.paintAftermathForZone();
    addSunForeground(this, this.root, this.zone);

    this.zoneLabel = makeSunZoneLabel(this, SUN_ZONE_LABEL[this.zone]);
    this.subtitle = makeSunSubtitle(this, this.zoneSubtitle());
    this.hint = makeSunHint(this, "A: INTERACT");
    void this.zoneLabel;
    void this.subtitle;
    attachHUD(this, () => this.save.stats);

    this.rowan = makeRowan(this, 80, 96, "soul");
    this.rowan.setDepth(40);

    this.buildZoneHotspots();
    this.publishSnapshot();

    if (!this.save.flags[SUN_FLAGS.introSeen]) {
      this.save.flags[SUN_FLAGS.introSeen] = true;
      writeSave(this.save);
      this.time.delayedCall(300, () => {
        runDialog(this, [
          { who: "SOPHENE", text: "Sun. The Hall of Testimony." },
          { who: "SOPHENE", text: "Everything here is interested in how you appear under light. Try to remain a person anyway." },
        ]);
      });
    }

    onDirection(this, (d) => {
      if (this.busy) return;
      if (d === "left") this.playerDir = { x: -1, y: 0 };
      if (d === "right") this.playerDir = { x: 1, y: 0 };
      if (d === "up") this.playerDir = { x: 0, y: -1 };
      if (d === "down") this.playerDir = { x: 0, y: 1 };
      this.moveCursor(d);
    });

    onActionDown(this, "action", () => this.useCurrent());
  }

  update() {
    animateRowan(this.rowan, this.playerDir.x, this.playerDir.y);
    this.playerDir.x *= 0.86;
    this.playerDir.y *= 0.86;
  }

  // -------------------------------------------------------------- aftermath

  private witnessForZone(): SunWitness | undefined {
    return SUN_WITNESSES.find((w) => w.zone === this.zone);
  }

  private opForZone(): SunOperation | undefined {
    return SUN_OPERATIONS.find((o) => o.zone === this.zone);
  }

  private paintAftermathForZone() {
    const witness = this.witnessForZone();
    const op = this.opForZone();
    const witnessDone = witness ? !!this.save.flags[witness.doneFlag] : true;
    const opDone = op ? !!this.save.flags[op.doneFlag] : true;
    const ready = sunTrialReady(this.save);
    const progress = sunZoneAftermath(this.zone, witnessDone, opDone, ready);
    addSunAftermath(this, this.root, this.zone, progress);
  }

  private zoneSubtitle(): string {
    switch (this.zone) {
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

  // -------------------------------------------------------------- hotspots

  private buildZoneHotspots() {
    this.hotspots = [];

    // Travel doors first, so cursor 0 always navigates somewhere useful.
    const links = SUN_ZONE_LINKS[this.zone];
    links.forEach((z, idx) => {
      this.hotspots.push({
        id: `door_${z}`,
        x: 26 + idx * 48,
        y: 118,
        r: 10,
        label: `GO TO ${SUN_ZONE_LABEL[z].toUpperCase()}`,
        onUse: () => this.goZone(z),
      });
    });

    const witness = this.witnessForZone();
    if (witness) {
      const done = !!this.save.flags[witness.doneFlag];
      this.hotspots.push({
        id: witness.id,
        x: 80,
        y: 72,
        r: 12,
        label: done ? `REVISIT ${witness.name}` : witness.name,
        onUse: () => this.talkWitness(witness.id),
      });
    }

    const op = this.opForZone();
    if (op) {
      const done = !!this.save.flags[op.doneFlag];
      this.hotspots.push({
        id: op.id,
        x: 122,
        y: 60,
        r: 10,
        label: done ? `(DONE) ${op.title.toUpperCase()}` : op.title.toUpperCase(),
        onUse: () => this.runOperation(op.id),
      });
    }

    // Environmental reads — one or two per zone.
    const reads = SUN_ENV_READS[this.zone] ?? [];
    reads.forEach((read) => {
      const seen = !!this.save.flags[read.id];
      this.hotspots.push({
        id: read.id,
        x: read.x,
        y: read.y,
        r: 8,
        label: seen ? `RE-READ ${read.label.replace(/^READ |^EXAMINE /, "")}` : read.label,
        onUse: () => this.readEnv(read.id),
      });
    });

    if (this.zone === "threshold") {
      this.hotspots.push({
        id: "crack",
        x: 42,
        y: 58,
        r: 10,
        label: this.save.flags[SUN_FLAGS.crackingQuestionDone]
          ? "REVISIT CRACKING QUESTION"
          : "CRACKING QUESTION",
        onUse: () => this.runCrackingQuestion(),
      });
      this.hotspots.push({
        id: "trial",
        x: 116,
        y: 58,
        r: 12,
        label: sunTrialReady(this.save) ? "ENTER TRIAL" : "ENTER TRIAL (LOCKED)",
        onUse: () => this.enterTrial(),
      });
      this.hotspots.push({
        id: "settle",
        x: 80,
        y: 90,
        r: 10,
        label: "SETTLE HERE",
        onUse: () => this.settleHere(),
      });
    }

    this.cursor = 0;
    this.refreshHint();

    // Threshold ceremony beat: when everything is ready and the player is at
    // the threshold for the first time after readiness, play a one-time line.
    if (
      this.zone === "threshold" &&
      sunTrialReady(this.save) &&
      !this.save.flags[HALL_FINISHED_FLAG]
    ) {
      this.save.flags[HALL_FINISHED_FLAG] = true;
      writeSave(this.save);
      this.time.delayedCall(450, () => {
        runDialog(this, [
          { who: "?", text: "The hall has finished speaking. The witnesses are seated. The pages are amended." },
          { who: "SOPHENE", text: "It is yours to cross now. Helion does not require performance." },
        ]);
      });
    }
  }

  private moveCursor(d: string) {
    if (this.hotspots.length === 0) return;
    if (d === "left" || d === "up")
      this.cursor =
        (this.cursor - 1 + this.hotspots.length) % this.hotspots.length;
    if (d === "right" || d === "down")
      this.cursor = (this.cursor + 1) % this.hotspots.length;
    getAudio().sfx("cursor");
    this.refreshHint();
  }

  private refreshHint() {
    const current = this.hotspots[this.cursor];
    this.hint.setText(current ? `A: ${current.label}` : "...");
    this.publishSnapshot();
  }

  private useCurrent() {
    if (this.busy) return;
    const current = this.hotspots[this.cursor];
    if (!current) return;
    this.busy = true;
    current.onUse();
  }

  private goZone(zone: SunZoneId) {
    this.save.sunZone = zone;
    writeSave(this.save);
    gbcWipe(this, () =>
      this.scene.start("SunPlateau", { save: this.save, zone }),
    );
  }

  // ---------------------------------------------------------- env reads

  private readEnv(id: string) {
    const read = (SUN_ENV_READS[this.zone] ?? []).find((r) => r.id === id);
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
      }
      this.busy = false;
      this.refreshHint();
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
      // Revisit branch: revisit lines, plus optional cross-reference + softening.
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
        this.refreshHint();
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
            // Repaint aftermath so the room visibly softens immediately.
            this.paintAftermathForZone();
          }
          this.busy = false;
          this.refreshHint();
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
          { who: "?", text: "The work here is done. The room remembers it for you." },
        ],
        () => {
          this.busy = false;
          this.refreshHint();
        },
      );
      return;
    }
    this.runOperationMechanic(op);
  }

  /**
   * Per-mechanic dispatcher. All mechanics share the same shape:
   *   1. show the staged steps as a dialog sequence (so the mechanic feels
   *      like an interaction, not a single menu)
   *   2. then present the operation's options as the closing decision
   *   3. on commit, set the doneFlag, run the aftermath line, repaint.
   *
   * Each mechanic frames the steps differently so the player feels the
   * interaction (hold, compare, contradict, dim) even though all roads end
   * in a closing inquiry.
   */
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
            this.paintAftermathForZone();
            // One closing aftermath beat so the room's change is named.
            runDialog(this, [{ who: "?", text: op.aftermath }], () => {
              this.busy = false;
              this.refreshHint();
            });
            return;
          }
          this.busy = false;
          this.refreshHint();
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
        }
        this.busy = false;
        this.refreshHint();
      },
    );
  }

  private enterTrial() {
    if (!sunTrialReady(this.save)) {
      const missing = this.missingPrereqSummary();
      runDialog(
        this,
        [
          { who: "SOPHENE", text: "Not yet. The hall is still speaking in pieces." },
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

  // ---------------------------------------------------------- shell pub

  private publishSnapshot() {
    const witnessCount = Object.values(this.save.sunWitnessHeard).filter(Boolean).length;
    const opCount = Object.values(this.save.sunOpsDone).filter(Boolean).length;
    const ready = sunTrialReady(this.save);

    // Per-zone state summary line (small text below the main idle body).
    const witness = this.witnessForZone();
    const op = this.opForZone();
    const reads = SUN_ENV_READS[this.zone] ?? [];
    const readsSeen = reads.filter((r) => this.save.flags[r.id]).length;

    const zoneStatus: string[] = [];
    if (witness) {
      zoneStatus.push(
        this.save.flags[witness.doneFlag] ? `${witness.name}: HEARD` : `${witness.name}: WAITING`,
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
        this.zoneSubtitle(),
        ...zoneStatus,
        `Witnesses ${witnessCount}/3 · Operations ${opCount}/4`,
        ready ? "Trial threshold open." : "More testimony required.",
      ].join("\n"),
      footerHint:
        this.zone === "threshold"
          ? ready
            ? "A INTERACT · THE GATE IS OPEN"
            : "A INTERACT · COMPLETE WITNESSES / OPERATIONS / QUESTION"
          : "A INTERACT · USE DOORS TO MOVE BETWEEN CHAMBERS",
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
  }
}
