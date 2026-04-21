/**
 * SunPlateauScene — Act 6 plateau before the Helion trial.
 *
 * Six explorable sub-zones (vestibule, testimony, archive, mirrors, warmth,
 * threshold) wired together by an adjacency graph in SunData. Each zone may
 * host a witness arc, an operation, or — in the threshold — the cracking
 * question and trial entry.
 *
 * Trial entry is gated by `sunTrialReady`: three witnesses heard, four
 * operations completed, the cracking question answered.
 */

import * as Phaser from "phaser";
import { GBC_W, GBC_H, GBCText, COLOR, gbcWipe, spawnMotes } from "../gbcArt";
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
import { SUN_WITNESSES } from "../sun/SunNpcDefs";
import {
  SUN_OPERATIONS,
  sunCrackingQuestion,
  sunTrialReady,
} from "../sun/SunContent";
import {
  makeSunHint,
  makeSunSubtitle,
  makeSunZoneLabel,
} from "../sun/SunUi";
import { buildSunBackdrop, addSunForeground } from "../sun/SunArt";

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
          { who: "SORYN", text: "Sun. The Hall of Testimony." },
          { who: "SORYN", text: "Everything here is interested in how you appear under light. Try to remain a person anyway." },
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

    const witness = SUN_WITNESSES.find((w) => w.zone === this.zone);
    if (witness) {
      this.hotspots.push({
        id: witness.id,
        x: 80,
        y: 72,
        r: 12,
        label: witness.name,
        onUse: () => this.talkWitness(witness.id),
      });
    }

    const op = SUN_OPERATIONS.find((o) => o.zone === this.zone);
    if (op) {
      this.hotspots.push({
        id: op.id,
        x: 122,
        y: 60,
        r: 10,
        label: op.title.toUpperCase(),
        onUse: () => this.runOperation(op.id),
      });
    }

    if (this.zone === "threshold") {
      this.hotspots.push({
        id: "crack",
        x: 42,
        y: 58,
        r: 10,
        label: "CRACKING QUESTION",
        onUse: () => this.runCrackingQuestion(),
      });
      this.hotspots.push({
        id: "trial",
        x: 116,
        y: 58,
        r: 12,
        label: "ENTER TRIAL",
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

  private talkWitness(id: string) {
    const witness = SUN_WITNESSES.find((w) => w.id === id);
    if (!witness) {
      this.busy = false;
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
          }
          this.busy = false;
          this.refreshHint();
        },
      );
    });
  }

  private runOperation(id: string) {
    const op = SUN_OPERATIONS.find((o) => o.id === id);
    if (!op) {
      this.busy = false;
      return;
    }
    runInquiry(
      this,
      op.prompt,
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
        }
        this.busy = false;
        this.refreshHint();
      },
    );
  }

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
      runDialog(
        this,
        [
          { who: "SORYN", text: "Not yet. The hall is still speaking in pieces." },
          { who: "SORYN", text: "Hear the witnesses. Complete the operations. Answer the question properly." },
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

  private settleHere() {
    runInquiry(
      this,
      {
        who: "SORYN",
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

  private publishSnapshot() {
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
      idleBody: this.zoneSubtitle(),
    });
    void COLOR;
    void GBC_H;
    void GBC_W;
  }
}
