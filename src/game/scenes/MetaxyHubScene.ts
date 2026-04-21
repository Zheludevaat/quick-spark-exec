/**
 * MetaxyHub — the connective spine of Acts 3+.
 *
 * Seven planetary portals arranged in a vertical ascent (Moon at the bottom,
 * Saturn at the top). Lit portals are entered with A. Dim portals show a
 * Soryn foreshadow line. Soryn stands at the right, offering a boundary
 * dialog after each completed sphere.
 *
 * This is the placeholder Phase 1 build: Moon (AthanorThreshold) and Sun
 * (CuratedSelf) are wired; the other five spheres are dim with flavor lines.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, gbcWipe, spawnMotes } from "../gbcArt";
import type { SaveSlot, SceneKey, SphereKey } from "../types";
import { writeSave } from "../save";
import { attachHUD } from "./hud";
import { onActionDown, onDirection } from "../controls";
import { runDialog } from "./hud";
import { getAudio } from "../audio";

type Portal = {
  sphere: SphereKey;
  label: string;
  scene: SceneKey | null; // null = not built yet
  unlocked: (s: SaveSlot) => boolean;
  dimLine: string;
  color: number;
  y: number;
};

const PORTALS: Portal[] = [
  {
    sphere: "saturn",
    label: "SATURN",
    scene: null,
    unlocked: (s) => !!s.garmentsReleased.jupiter,
    dimLine: "Saturn waits at the gate of fate. Not yet.",
    color: 0x6a5b8a,
    y: 26,
  },
  {
    sphere: "jupiter",
    label: "JUPITER",
    scene: null,
    unlocked: (s) => !!s.garmentsReleased.mars,
    dimLine: "The Great Tribunal weighs everything. Not yet.",
    color: 0xc89b4a,
    y: 38,
  },
  {
    sphere: "mars",
    label: "MARS",
    scene: "MarsPlateau",
    unlocked: (s) => !!s.garmentsReleased.sun,
    dimLine: "The Arena tests what you will stand for. Not yet.",
    color: 0xc04848,
    y: 50,
  },
  {
    sphere: "sun",
    label: "SUN",
    scene: "CuratedSelf",
    unlocked: (s) => !!s.garmentsReleased.venus || !!s.flags.act3_complete || !!s.flags.moon_done,
    dimLine: "The Sun's hall opens once Venus is past.",
    color: 0xffd070,
    y: 62,
  },
  {
    sphere: "venus",
    label: "VENUS",
    scene: "VenusPlateau",
    unlocked: (s) => !!s.garmentsReleased.mercury,
    dimLine: "Venus's biennale calls. Not yet.",
    color: 0xe89bb8,
    y: 74,
  },
  {
    sphere: "mercury",
    label: "MERCURY",
    scene: "MercuryPlateau",
    unlocked: (s) => !!s.garmentsReleased.moon || !!s.flags.moon_done,
    dimLine: "The Tower of Reasons stands waiting. Not yet.",
    color: 0xa8c8e8,
    y: 86,
  },
  {
    sphere: "moon",
    label: "MOON",
    scene: "AthanorThreshold",
    unlocked: () => true,
    dimLine: "",
    color: 0xc8c8d8,
    y: 98,
  },
];

const PORTAL_X = 60;

export class MetaxyHubScene extends Phaser.Scene {
  private save!: SaveSlot;
  private cursor = 0;
  private labels: GBCText[] = [];
  private glows: Phaser.GameObjects.Arc[] = [];
  private hint!: GBCText;
  private mark!: GBCText;

  constructor() {
    super("MetaxyHub");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "MetaxyHub";
    writeSave(this.save);
    this.cursor = 0;
    this.labels = [];
    this.glows = [];
  }

  create() {
    this.cameras.main.setBackgroundColor("#06070f");
    this.cameras.main.fadeIn(500);

    // Starfield motes
    spawnMotes(this, { count: 24, color: 0x8090c8, alpha: 0.5 });

    // Vertical ascent guideline
    const line = this.add.rectangle(PORTAL_X, GBC_H / 2, 1, GBC_H - 30, 0x303048, 0.6);
    line.setOrigin(0.5, 0.5);

    // Title strip
    new GBCText(this, GBC_W / 2 - 24, 6, "METAXY", { color: COLOR.textGold, depth: 10 });
    new GBCText(this, GBC_W / 2 - 30, 14, "between worlds", { color: COLOR.textDim, depth: 10 });

    attachHUD(this, () => this.save.stats);

    // Build portals
    PORTALS.forEach((p, i) => {
      const lit = p.unlocked(this.save) && p.scene !== null;
      const done = !!this.save.garmentsReleased[p.sphere];
      const glowColor = lit ? p.color : 0x202030;
      const glow = this.add.circle(PORTAL_X, p.y, 4, glowColor, lit ? 0.95 : 0.45);
      glow.setStrokeStyle(1, lit ? 0xffffff : 0x404060, 0.7);
      this.glows.push(glow);

      // Pulse lit portals
      if (lit) {
        this.tweens.add({
          targets: glow,
          scale: 1.3,
          alpha: 0.7,
          duration: 1100 + i * 90,
          yoyo: true,
          repeat: -1,
        });
      }

      const labelColor = lit ? COLOR.textLight : COLOR.textDim;
      const suffix = done ? "  *" : p.scene === null ? "  -" : "";
      this.labels.push(
        new GBCText(this, PORTAL_X + 10, p.y - 3, p.label + suffix, {
          color: labelColor,
          depth: 12,
        }),
      );
    });

    this.mark = new GBCText(this, PORTAL_X - 14, PORTALS[0].y - 3, ">", {
      color: COLOR.textGold,
      depth: 13,
    });

    this.hint = new GBCText(this, 6, GBC_H - 14, "", {
      color: COLOR.textDim,
      depth: 14,
      maxWidthPx: GBC_W - 12,
    });

    this.refreshCursor();

    onDirection(this, (d) => {
      if (d === "up") this.move(-1);
      if (d === "down") this.move(1);
    });
    onActionDown(this, "action", () => this.choose());

    // First-visit Soryn line
    if (!this.save.flags.metaxy_seen) {
      this.save.flags.metaxy_seen = true;
      writeSave(this.save);
      this.time.delayedCall(400, () => {
        runDialog(this, [
          { who: "SORYN", text: "Welcome to the Metaxy. Seven gates. One ascent." },
          { who: "SORYN", text: "Begin where you stand. The Moon waits below." },
        ]);
      });
    }
  }

  private move(d: number) {
    this.cursor = (this.cursor + d + PORTALS.length) % PORTALS.length;
    getAudio().sfx("cursor");
    this.refreshCursor();
  }

  private refreshCursor() {
    const p = PORTALS[this.cursor];
    this.mark.setPosition(PORTAL_X - 14, p.y - 3);
    const lit = p.unlocked(this.save) && p.scene !== null;
    if (lit) {
      this.hint.setText(`A: ENTER ${p.label}`);
    } else if (p.scene === null) {
      this.hint.setText(p.dimLine);
    } else {
      this.hint.setText("Locked. Pass the prior sphere first.");
    }
  }

  private choose() {
    const p = PORTALS[this.cursor];
    const lit = p.unlocked(this.save) && p.scene !== null;
    if (!lit) {
      getAudio().sfx("cursor");
      runDialog(this, [{ who: "SORYN", text: p.dimLine || "Not yet." }]);
      return;
    }
    getAudio().sfx("confirm");
    const target = p.scene as SceneKey;
    this.save.scene = target;
    writeSave(this.save);
    gbcWipe(this, () => this.scene.start(target, { save: this.save }));
  }
}
