/**
 * MetaxyHub — the connective spine of Acts 3+.
 *
 * Seven planetary portals arranged in a vertical ascent. Currently Moon,
 * Mercury, Venus, Sun, and Mars are wired. Jupiter and Saturn remain dim.
 */
import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  gbcWipe,
  spawnMotes,
  fitSingleLineText,
  measureText,
} from "../gbcArt";
import type { SaveSlot, SceneKey, SphereKey } from "../types";
import { ACT_BY_SCENE } from "../types";
import { writeSave } from "../save";
import { attachHUD } from "./hud";
import { onActionDown, onDirection } from "../controls";
import { runDialog } from "./hud";
import { getAudio } from "../audio";
import { setSceneSnapshot } from "../gameUiBridge";
import {
  alchemySecretUnlocked,
  grantAlchemyHint,
  hasAlchemyHint,
  markAlchemySecretSeen,
  shouldRevealAlchemyEntrance,
} from "../canon/alchemySecret";

function sunPortalUnlocked(s: SaveSlot): boolean {
  return !!s.garmentsReleased.venus || !!s.garmentsReleased.sun || !!s.flags.legacy_sun_bridge;
}

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
    scene: "SunPlateau",
    unlocked: sunPortalUnlocked,
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
    scene: "ImaginalRealm",
    unlocked: () => true,
    dimLine: "",
    color: 0xc8c8d8,
    y: 98,
  },
];

/**
 * Hidden secret-annex portal. Only appended to PORTALS when
 * `shouldRevealAlchemyEntrance(save)` returns true. Routes to the secret
 * Great Work annex (AthanorThreshold). Not on the mainline ladder.
 */
const ANNEX_PORTAL: Portal = {
  sphere: "moon",
  label: "GREAT WORK ANNEX",
  scene: "AthanorThreshold",
  unlocked: () => true,
  dimLine: "A hidden chamber, not required, but true.",
  color: 0xb8a070,
  y: 110,
};

const PORTAL_X = 60;

export class MetaxyHubScene extends Phaser.Scene {
  private save!: SaveSlot;
  private cursor = 0;
  private labels: GBCText[] = [];
  private glows: Phaser.GameObjects.Arc[] = [];
  private hint!: GBCText;
  private mark!: GBCText;
  private portals: Portal[] = PORTALS;

  constructor() {
    super("MetaxyHub");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "MetaxyHub";
    this.save.act = ACT_BY_SCENE.MetaxyHub;
    writeSave(this.save);
    this.cursor = 0;
    this.labels = [];
    this.glows = [];
    this.portals = shouldRevealAlchemyEntrance(this.save)
      ? [...PORTALS, ANNEX_PORTAL]
      : PORTALS;
  }

  private defaultCursor(): number {
    const actionable = this.portals.findIndex(
      (p) => p.scene !== null && p.unlocked(this.save) && !this.save.garmentsReleased[p.sphere],
    );
    if (actionable >= 0) return actionable;

    const lit = this.portals.findIndex(
      (p) => p.scene !== null && p.unlocked(this.save),
    );
    if (lit >= 0) return lit;

    return this.portals.length - 1;
  }

  create() {
    this.cameras.main.setBackgroundColor("#06070f");
    this.cameras.main.fadeIn(500);

    // Starfield motes
    spawnMotes(this, { count: 24, color: 0x8090c8, alpha: 0.5 });

    // Vertical ascent guideline
    const line = this.add.rectangle(PORTAL_X, GBC_H / 2, 1, GBC_H - 30, 0x303048, 0.6);
    line.setOrigin(0.5, 0.5);

    // Title strip — width-safe centering
    const titleText = fitSingleLineText("METAXY", GBC_W - 12);
    const titleX = Math.floor((GBC_W - measureText(titleText)) / 2);
    new GBCText(this, titleX, 6, titleText, { color: COLOR.textGold, depth: 10 });

    const subText = fitSingleLineText("BETWEEN WORLDS", GBC_W - 12);
    const subX = Math.floor((GBC_W - measureText(subText)) / 2);
    new GBCText(this, subX, 14, subText, { color: COLOR.textDim, depth: 10 });

    attachHUD(this, () => this.save.stats);
    this.publishShellState();

    // Build portals
    this.portals.forEach((p, i) => {
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
      const LABEL_W = GBC_W - (PORTAL_X + 10) - 4;
      const labelText = fitSingleLineText(p.label + suffix, LABEL_W);
      this.labels.push(
        new GBCText(this, PORTAL_X + 10, p.y - 3, labelText, {
          color: labelColor,
          depth: 12,
        }),
      );
    });

    this.mark = new GBCText(this, PORTAL_X - 14, this.portals[0].y - 3, ">", {
      color: COLOR.textGold,
      depth: 13,
    });

    this.hint = new GBCText(this, 6, GBC_H - 14, "", {
      color: COLOR.textDim,
      depth: 14,
      maxWidthPx: GBC_W - 12,
    });

    this.cursor = this.defaultCursor();
    this.refreshCursor();

    onDirection(this, (d) => {
      if (d === "up") this.move(-1);
      if (d === "down") this.move(1);
    });
    onActionDown(this, "action", () => this.choose());

    // First-visit Sophene line + (when prior hints exist) the metaxy whisper.
    if (!this.save.flags.metaxy_seen) {
      this.save.flags.metaxy_seen = true;
      writeSave(this.save);
      this.time.delayedCall(400, () => {
        runDialog(this, [
          { who: "Sophene", text: "Welcome to the Metaxy. Seven gates. One ascent." },
          { who: "Sophene", text: "Begin where you stand." },
        ]);
      });
    } else if (
      !alchemySecretUnlocked(this.save) &&
      hasAlchemyHint(this.save, "reception_basin") &&
      hasAlchemyHint(this.save, "moon_flaw") &&
      !hasAlchemyHint(this.save, "metaxy_whisper")
    ) {
      // Player has the two prior hints — Sophene grants the third on revisit.
      const unlocked = grantAlchemyHint(this.save, "metaxy_whisper");
      writeSave(this.save);
      this.time.delayedCall(400, () => {
        if (unlocked) {
          runDialog(this, [
            { who: "Sophene", text: "There is another chamber here, not required, but true." },
            { who: "Sophene", text: "It does not lie on the road. It opens only to those who followed what kept returning." },
          ]);
        }
      });
    }
  }

  private move(d: number) {
    this.cursor = (this.cursor + d + this.portals.length) % this.portals.length;
    getAudio().sfx("cursor");
    this.refreshCursor();
  }

  private refreshCursor() {
    const p = this.portals[this.cursor];
    this.mark.setPosition(PORTAL_X - 14, p.y - 3);
    const lit = p.unlocked(this.save) && p.scene !== null;
    if (lit) {
      this.hint.setText(`A: ENTER ${p.label}`);
    } else if (p.scene === null) {
      this.hint.setText(p.dimLine);
    } else {
      this.hint.setText("Locked. Pass the prior sphere first.");
    }
    this.publishShellState();
  }

  private currentPortalState(p: Portal): string {
    if (p.scene === null) return "NOT BUILT YET";
    if (!p.unlocked(this.save)) return "LOCKED";
    if (this.save.garmentsReleased[p.sphere]) return "COMPLETE";
    return "READY";
  }

  private currentPortalLead(p: Portal): string {
    if (p.scene === null) return p.dimLine || "This gate is not built yet.";
    if (!p.unlocked(this.save)) return p.dimLine || "Pass the prior sphere first.";
    if (this.save.garmentsReleased[p.sphere]) {
      return `Garment released. Re-enter ${p.label} to revisit its plateau.`;
    }
    return `Press A to enter ${p.label}.`;
  }

  /**
   * Publish complete desktop-shell metadata for the hub:
   * - minimap nodes
   * - idle/context card text
   * - footer hint
   * - visibility flags
   */
  private publishShellState() {
    const cursorSphere = this.portals[this.cursor]?.sphere;
    const active = this.portals[this.cursor];
    const releasedCount = Object.values(this.save.garmentsReleased).filter(Boolean).length;

    const layout: { sphere: SphereKey; label: string; x: number; y: number }[] = [
      { sphere: "moon", label: "Moon", x: 0.5, y: 0.92 },
      { sphere: "mercury", label: "Mercury", x: 0.4, y: 0.78 },
      { sphere: "venus", label: "Venus", x: 0.6, y: 0.64 },
      { sphere: "sun", label: "Sun", x: 0.5, y: 0.5 },
      { sphere: "mars", label: "Mars", x: 0.38, y: 0.36 },
      { sphere: "jupiter", label: "Jupiter", x: 0.62, y: 0.22 },
      { sphere: "saturn", label: "Saturn", x: 0.5, y: 0.08 },
    ];

    const markerNode = layout.find((n) => n.sphere === cursorSphere) ?? null;

    setSceneSnapshot({
      key: "MetaxyHub",
      label: "Metaxy Hub",
      act: ACT_BY_SCENE.MetaxyHub,
      zone: "Portal Ascent",
      nodes: layout.map((n) => ({
        id: n.sphere,
        label: n.label,
        x: n.x,
        y: n.y,
        active: n.sphere === cursorSphere,
      })),
      marker: markerNode ? { x: markerNode.x, y: markerNode.y } : null,

      idleTitle: "METAXY",
      idleBody: [
        `Selected: ${active.label}`,
        `State: ${this.currentPortalState(active)}`,
        this.currentPortalLead(active),
        `Garments released: ${releasedCount}/7`,
      ].join("\n"),

      footerHint: "UP / DOWN SELECT PORTAL · A ENTER · PLAYER HUB IN LEFT RAIL",

      showStatsBar: true,
      showUtilityRail: true,
      showDialogueDock: true,
      showMiniMap: true,
      allowPlayerHub: true,
      showFooter: true,
    });
  }

  private choose() {
    const p = this.portals[this.cursor];
    const lit = p.unlocked(this.save) && p.scene !== null;
    if (!lit) {
      getAudio().sfx("cursor");
      runDialog(this, [{ who: "Sophene", text: p.dimLine || "Not yet." }]);
      return;
    }
    getAudio().sfx("confirm");
    const target = p.scene as SceneKey;
    if (target === "AthanorThreshold") {
      markAlchemySecretSeen(this.save);
    }
    this.save.scene = target;
    writeSave(this.save);
    gbcWipe(this, () => this.scene.start(target, { save: this.save }));
  }
}
